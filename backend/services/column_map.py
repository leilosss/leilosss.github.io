# =============================================================
# 双平台通用的「表头模糊定位 → 统一字段」工具
# 支付宝/微信账单表头各版本都有差异(列名增减、全半角括号、单位等),
# 这里用“候选词优先级 + 包含匹配”把不同版本的表头归一到同一组语义字段。
# 前端(lib/bill-common.ts)与后端共用同一套规则,保证两侧解析结果一致。
# =============================================================
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Sequence, Tuple

# 统一字段 → 候选列名(按优先级排列,靠前者优先命中)
# 说明:支付宝表头为「交易创建时间/交易对方/商品名称/金额（元）/收/支…」
#       微信表头为「交易时间/交易对方/商品/收/支/金额(元)…」
COLUMN_CANDIDATES: Dict[str, List[str]] = {
    "time":          ["交易创建时间", "交易时间", "时间"],
    "counterparty":  ["交易对方", "收款方", "对方", "付款方"],
    "item":          ["商品名称", "商品说明", "商品"],
    "category":      ["交易分类", "类型", "分类"],
    "direction":     ["收/支", "收支"],
    "amount":        ["金额"],
}

# 归一化顺序:保留各字段在候选表中的声明顺序(决定模糊匹配时的优先级)
FIELD_ORDER: List[str] = ["time", "counterparty", "item", "category", "direction", "amount"]


def _norm(header: str) -> str:
    """表头归一化:去掉空白、全半角括号与其中的单位(如「金额(元)」→「金额」)"""
    s = str(header or "")
    s = re.sub(r"[（(][^）)]*[）)]", "", s)   # 去掉括号及括号内文字
    s = re.sub(r"[\s　]", "", s)          # 去掉所有空白
    return s.lower()


def locate_columns(headers: Sequence[str]) -> Tuple[Dict[str, int], List[str]]:
    """在给定表头列表里定位各语义字段的列下标。

    返回:(字段→列下标 映射, 缺失字段列表)
    - 同一列只归属最先声明的字段(例如「类型」列不会抢走「交易分类」的候选)
    """
    norm_headers = [_norm(h) for h in headers]
    mapping: Dict[str, int] = {}
    for field in FIELD_ORDER:
        for cand in COLUMN_CANDIDATES[field]:
            key = _norm(cand)
            # 优先精确等于,其次包含(避免「交易时间」误配到「最近修改时间」等)
            idx = next((i for i, h in enumerate(norm_headers) if h == key), None)
            if idx is None:
                idx = next((i for i, h in enumerate(norm_headers) if i not in mapping.values() and key in h), None)
            if idx is not None:
                mapping[field] = idx
                break
    missing = [f for f in FIELD_ORDER if f not in mapping]
    return mapping, missing


def direction_of(value: str) -> str:
    """把「收/支」列的值归一化为 in / out / unknown"""
    v = str(value or "").strip()
    if "收入" in v or v == "收":
        return "in"
    if "支出" in v or v == "支":
        return "out"
    return "unknown"


def parse_amount(value) -> Optional[float]:
    """解析金额单元格:支持 数字 / ¥6.00 / 6,600.50元 / -6.00 等形态"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(abs(float(value)), 2)
    s = str(value).strip().replace("¥", "").replace("￥", "").replace(",", "")
    s = re.sub(r"[元\s]", "", s)
    if s in ("", "-", "--"):
        return None
    try:
        return round(abs(float(s)), 2)
    except ValueError:
        return None


# 英文月份缩写 → 数字(解析 "Thu Aug 20 2026" 形态的文本时间)
_EN_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

_TIME_RE = re.compile(r"(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})[\sT]?(\d{1,2})?:?(\d{2})?:?(\d{2})?")


def _from_excel_serial(value: float) -> Optional[str]:
    """Excel 日期序列号 → YYYY-MM-DD HH:MM:SS
    (1900 日期系统,序列 1 = 1900-01-01;含 1900-02-29 幽灵日,取 1899-12-30 为原点)
    """
    if not (20000 < value < 80000):
        return None
    try:
        dt = datetime(1899, 12, 30) + timedelta(days=float(value))
        if 2000 <= dt.year <= 2100:
            return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (OverflowError, ValueError):
        pass
    return None


def parse_time(value) -> Optional[str]:
    """把交易时间单元格归一化为 YYYY-MM-DD HH:MM:SS;识别失败返回 None"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # Excel 日期序列号(微信 xlsx 个别导出工具把时间写成 45xxx 数字)
        return _from_excel_serial(float(value))
    if isinstance(value, str):
        # openpyxl/csv 读出的值统一为文本:纯数字文本也按序列号处理
        text = value.strip()
        if text.replace(".", "", 1).isdigit():
            return _from_excel_serial(float(text))
    m = _TIME_RE.search(str(value))
    if not m:
        # 兜底:个别导出把时间写成英文文本,如 "Thu Aug 20 2026 18:07:37"
        text = str(value).strip()
        em = re.search(r"([A-Za-z]{3}) ([A-Za-z]{3}) (\d{1,2}) (\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))?", text)
        if em and em.group(2).lower() in _EN_MONTHS:
            try:
                y, mo_n, d = int(em.group(4)), _EN_MONTHS[em.group(2).lower()], int(em.group(3))
                hh, mi, ss = int(em.group(5)), int(em.group(6)), int(em.group(7) or 0)
                if 1 <= mo_n <= 12 and 1 <= d <= 31 and hh < 24 and mi < 60 and ss < 60:
                    return f"{y:04d}-{mo_n:02d}-{d:02d} {hh:02d}:{mi:02d}:{ss:02d}"
            except ValueError:
                pass
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    hh, mm, ss = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
    if not (1 <= mo <= 12 and 1 <= d <= 31 and 0 <= hh <= 23 and mm < 60 and ss < 60):
        return None
    return f"{y:04d}-{mo:02d}-{d:02d} {hh:02d}:{mm:02d}:{ss:02d}"


def cell(headers: Sequence[str], mapping: Dict[str, int], cells: Sequence[object], field: str) -> str:
    """按字段名取单元格原始文本(越界/缺失时返回空串)"""
    idx = mapping.get(field)
    if idx is None or idx >= len(cells):
        return ""
    v = cells[idx]
    return "" if v is None else str(v).strip()


def row_has_value(cells: Sequence[object]) -> bool:
    """粗略判断行是否有内容(用于跳过空行)"""
    return any(c is not None and str(c).strip() != "" for c in cells)
