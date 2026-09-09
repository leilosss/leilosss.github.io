# =============================================================
# 微信账单解析器
# 微信导出的账单形态:
#   1) .xlsx —— openpyxl 读取;文件头部是若干行元数据(昵称/时间范围等),
#      接着是分隔行「-----微信支付账单明细列表-----」,表头在分隔行下方
#   2) .csv  —— 邮箱收到的「个人对账」文件(UTF-8 BOM),结构同上
#
# 表头定位策略(2026-09 强化版):
#   a. 先在前 60 行找「分隔行」(含「微信支付账单明细列表」或整行横线)
#   b. 在分隔行下方 1~10 行内找同时含「交易时间 + 交易对方」(或「交易时间 + 金额」)的表头行
#   c. 找不到分隔行时,回退为全表前 40 行扫描(兼容无分隔行的导出变体)
# 定位成功后会打印「表头行内容」与「识别到的字段映射」调试日志(容器日志可见)。
#
# 字段映射说明(收/支 的方向语义与全站统一契约一致):
#   收/支:   支出→out(expense) / 收入→in(income) / "/" 或其它→unknown(neutral)
#   交易类型: → category(微信表头为「交易类型」)
#   商品:     → item(支付宝侧为「商品名称/商品说明」,见 column_map 候选词)
#   金额(元): → float,自动去掉逗号/¥/元 等符号(parse_amount)
#   payment_method/status/交易单号/商户单号/备注:本解析器暂不消费,
#   如需保留可在 models.BillRow 增加可选字段后在此透传。
# =============================================================
from __future__ import annotations

import codecs
import csv
import io
from typing import List, Optional, Tuple

import chardet
from openpyxl import load_workbook

from models import BillRow
from services.column_map import cell, direction_of, locate_columns, parse_amount, parse_time, row_has_value

# 表头行必须具备的关键词(「交易时间」为硬性要求,其余为宽松项)
_HEADER_KEY_TIME = "交易时间"
_HEADER_KEYS = ("交易时间", "交易对方", "金额")
# 表头只会在前 40 行内出现(上方为说明文字);若存在分隔行则从分隔行下方找
_MAX_SCAN_ROWS = 40
# 分隔行下方继续寻找表头的最大行数
_SEP_SCAN_AFTER = 10


def _log(*parts: object) -> None:
    """调试日志:直接打印到 stdout(容器 docker logs 可见),不污染返回给用户的 warnings"""
    print("[wechat_parser]", *parts)


def _row_texts(cells: List[object]) -> List[str]:
    """行单元格 → 文本(去掉 BOM/首尾空白)"""
    return [str(c).strip().replace("﻿", "") if c is not None else "" for c in cells]


def _is_separator_row(cells: List[object]) -> bool:
    """判定分隔行:「微信支付账单明细列表」字样,或一整行横线"""
    joined = "".join(_row_texts(cells))
    if "微信支付账单明细列表" in joined or "账单明细列表" in joined:
        return True
    stripped = joined.replace("-", "").replace(" ", "")
    return joined.count("-") >= 10 and stripped == ""


def _map_row(platform: str, headers: List[str], mapping: dict, cells: List[object]) -> Optional[BillRow]:
    """把一行单元格映射为统一 BillRow(时间/金额任一缺失即视为无效行)"""
    if not row_has_value(cells):
        return None
    time = parse_time(cell(headers, mapping, cells, "time"))
    amount = parse_amount(cell(headers, mapping, cells, "amount"))
    if time is None or amount is None or amount <= 0:
        return None
    return BillRow(
        platform=platform,
        time=time,
        counterparty=cell(headers, mapping, cells, "counterparty"),
        item=cell(headers, mapping, cells, "item"),
        category=cell(headers, mapping, cells, "category"),
        direction=direction_of(cell(headers, mapping, cells, "direction")),
        amount=float(amount),  # parse_amount 已去逗号/¥,恒为 float 类型
    )


def _locate_header_in_rows(matrix: List[List[object]]) -> Tuple[int, List[str], str]:
    """在二维矩阵中定位表头行。

    返回:(表头行下标, 表头字符串列表, 定位方式日志)
    定位方式: separator(分隔行下方命中)/ global(全表扫描兜底)
    """
    # a. 找分隔行(前 60 行内)
    sep_idx: Optional[int] = None
    for i, row in enumerate(matrix[:60]):
        if _is_separator_row(row):
            sep_idx = i
            break

    # b. 在分隔行下方 1~10 行内找表头行
    if sep_idx is not None:
        for i in range(sep_idx + 1, min(sep_idx + 1 + _SEP_SCAN_AFTER, len(matrix))):
            joined = "".join(_row_texts(matrix[i]))
            if _HEADER_KEY_TIME in joined and ("交易对方" in joined or "金额" in joined):
                return i, _row_texts(matrix[i]), f"separator(分隔行#{sep_idx}下方)"
        _log(f"已找到分隔行#{sep_idx},但其下方 {_SEP_SCAN_AFTER} 行内未发现含「交易时间」的表头,转全表扫描兜底")

    # c. 全表扫描兜底(兼容没有分隔行的导出变体)
    for i, row in enumerate(matrix[:_MAX_SCAN_ROWS]):
        joined = "".join(_row_texts(row))
        if all(k in joined for k in _HEADER_KEYS):
            return i, _row_texts(row), "global(无分隔行,全表扫描)"
    raise ValueError("未能定位微信账单表头行(需含 交易时间/交易对方/金额 列,或在分隔行下方)")


def _is_tail_row(cells: List[object]) -> bool:
    """微信表尾判断:出现「合计」或分隔线「----」等即结束"""
    first = str(cells[0]) if cells and cells[0] is not None else ""
    joined = "".join(str(c) if c is not None else "" for c in cells)
    return first.startswith("合计") or "合计" in joined[:10] or first.startswith("-") or "以下无" in joined


def _finalize(platform: str, matrix: List[List[object]]) -> Tuple[List[BillRow], List[str], str]:
    """公共收尾:定位表头 → 打印表头与字段映射 → 逐行映射为账单行"""
    warnings: List[str] = []
    try:
        header_idx, headers, mode = _locate_header_in_rows(matrix)
    except ValueError as exc:
        return [], [str(exc)], ""
    mapping, missing = locate_columns(headers)
    if missing:
        warnings.append(f"表头缺少字段:{', '.join(missing)}(将按空值处理)")

    # —— 调试日志:打印表头行内容与识别到的字段映射 ——
    _log(f"表头行#{header_idx}(定位方式:{mode}):", headers)
    _log("字段映射:", {field: (headers[col] if col < len(headers) else "?") for field, col in mapping.items()})

    rows: List[BillRow] = []
    dropped = 0
    for row in matrix[header_idx + 1:]:
        if _is_tail_row(row) or not row_has_value(row):
            continue
        bill = _map_row(platform, headers, mapping, row)
        if bill is not None:
            rows.append(bill)
        else:
            dropped += 1
    if dropped:
        warnings.append(f"跳过 {dropped} 行无效/表尾记录")
    if not rows:
        warnings.append("解析到 0 条有效交易(请确认这是微信账单明细而非证明文件)")
    return rows, warnings, mode


# ---------- .xlsx 解析(openpyxl) ----------
def parse_xlsx_bytes(raw: bytes) -> Tuple[List[BillRow], List[str]]:
    """解析微信 .xlsx 账单字节流"""
    try:
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        ws = wb.active
        matrix: List[List[object]] = [list(r) for r in ws.iter_rows(values_only=True)]
        wb.close()
    except Exception as exc:
        return [], [f"Excel 文件读取失败:{exc}"]
    rows, warnings, _mode = _finalize("wechat", matrix)
    return rows, warnings


# ---------- .csv 解析(邮箱对账单) ----------
def _decode_csv_bytes(raw: bytes) -> str:
    """微信 CSV 为 UTF-8(可能带 BOM),兜底 chardet 探测"""
    if raw.startswith(codecs.BOM_UTF8):
        return raw.decode("utf-8-sig", errors="replace")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        pass
    guess = (chardet.detect(raw[:4096]).get("encoding") or "utf-8").lower()
    try:
        return raw.decode(guess, errors="replace")
    except LookupError:
        return raw.decode("utf-8", errors="replace")


def _split_csv_line(line: str) -> List[str]:
    try:
        return next(csv.reader([line]))
    except StopIteration:
        return []


def parse_wechat_csv_bytes(raw: bytes) -> Tuple[List[BillRow], List[str]]:
    """解析微信邮箱导出的 CSV 账单(UTF-8 BOM,含分隔行)"""
    text = _decode_csv_bytes(raw)
    matrix: List[List[object]] = [_split_csv_line(ln) for ln in text.splitlines()]
    rows, warnings, _mode = _finalize("wechat", matrix)
    return rows, warnings


# ---------- 统一入口 ----------
def parse_wechat_bytes(raw: bytes, file_name: str = "") -> Tuple[List[BillRow], List[str]]:
    """按文件名后缀自动选择 xlsx / csv 解析路径"""
    name = (file_name or "").lower()
    if name.endswith(".xlsx") or (not name and raw[:2] == b"PK"):  # PK = zip 魔数
        return parse_xlsx_bytes(raw)
    return parse_wechat_csv_bytes(raw)
