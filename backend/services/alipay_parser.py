# =============================================================
# 支付宝账单 CSV 解析器
# 支付宝导出文件特征:
#   1) 前 24 行左右为账号/查询条件等说明文字(各版本有差异,故按内容自动定位表头)
#   2) 表头以「交易号」起始,后续每行为一条交易
#   3) 编码通常为 GBK/GB18030(较新版本可能为 UTF-8),用 chardet 探测后解码
# 隐私说明:前端默认在浏览器内完成此解析(TextDecoder('gb18030') 同规则);
# 本模块用于服务端 base64 直传/自测路径,两端结果保持一致。
# =============================================================
from __future__ import annotations

import base64
import codecs
import csv
import io
from typing import Dict, List, Optional, Tuple

import chardet

from models import BillRow
from services.column_map import cell, direction_of, locate_columns, parse_amount, parse_time, row_has_value

# 支付宝导出文件中的表头行首列标记
HEADER_START_MARKERS: Tuple[str, ...] = ("交易号",)
# 官方说明文字行数(找不到表头标记时的兜底跳行数)
PREAMBLE_FALLBACK_LINES = 24


# ---------- 编码处理 ----------
def decode_bytes(raw: bytes) -> str:
    """解码支付宝 CSV 字节流:优先 UTF-8,其次按 chardet 探测结果,回退 GB18030。

    GB18030 是 GBK/GB2312 的超集,用它能覆盖绝大多数中文账单文件。
    """
    if raw.startswith(codecs.BOM_UTF8):
        return raw.decode("utf-8-sig", errors="replace")
    # 先做严格 UTF-8 尝试:纯 ASCII/UTF-8 文件不会误判
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        pass
    guess = (chardet.detect(raw[:4096]).get("encoding") or "").lower()
    if "utf" in guess:
        try:
            return raw.decode(guess, errors="replace")
        except LookupError:
            pass
    # GBK 系文本 chardet 常判成 GB2312/GBK;统一用 GB18030 解码更稳
    return raw.decode("gb18030", errors="replace")


# ---------- 表头定位 ----------
def _split_line(line: str) -> List[str]:
    """按 CSV 规则拆分一行(表头行一般无引号,直接 split 亦可,这里用 csv 兜底)"""
    try:
        return next(csv.reader([line]))
    except StopIteration:
        return []


def locate_header_line(lines: List[str]) -> Tuple[int, List[str]]:
    """定位表头行:返回 (表头行下标, 表头单元格列表)。

    兼容两种官方导出形态:
    - 老版:首列「交易号」开头(交易创建时间列)
    - 新版「交易明细」:首列「交易时间」开头(交易分类/交易对方/商品说明/收/支/金额)
    共同特征:同一行内含 交易/对方/金额/收支 列名。
    """
    for i, ln in enumerate(lines[:60]):
        stripped = ln.strip().lstrip("﻿")  # 去掉首列可能带的 BOM
        joined = "".join(stripped.split(","))
        is_start = stripped.startswith(HEADER_START_MARKERS) or stripped.startswith("交易时间")
        if is_start and "交易" in joined and "对方" in joined and "金额" in joined and "收/支" in joined:
            return i, _split_line(stripped)
    # 兜底:直接跳过 24 行说明文字
    cells = _split_line(lines[PREAMBLE_FALLBACK_LINES])
    return PREAMBLE_FALLBACK_LINES, cells


# ---------- 核心解析 ----------
def _map_row(platform: str, headers: List[str], mapping: Dict[str, int], cells: List[str]) -> Optional[BillRow]:
    """把原始 CSV 单元格序列映射为统一 BillRow;缺时间/金额的行视为无效行"""
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
        amount=amount,
    )


def parse_alipay_text(text: str) -> Tuple[List[BillRow], List[str]]:
    """解析支付宝 CSV 文本(已解码):返回 (有效账单行, 警告列表)"""
    lines = text.splitlines()
    header_idx, headers = locate_header_line(lines)
    mapping, missing = locate_columns(headers)
    warnings: List[str] = []
    if missing:
        warnings.append(f"表头缺少字段:{', '.join(missing)}(将按空值处理)")
    if header_idx >= len(lines) - 1:
        return [], ["文件中未找到有效表头或数据行,请确认为支付宝导出的原始 CSV"]

    rows: List[BillRow] = []
    dropped = 0
    try:
        body = "\n".join(lines[header_idx + 1:])
        reader = csv.DictReader(io.StringIO(body), fieldnames=[h for h in headers])
        for row in reader:
            if row is None or not row_has_value(list(row.values())):
                continue
            cells = [row.get(h, "") for h in headers]
            bill = _map_row("alipay", headers, mapping, cells)
            if bill is not None:
                rows.append(bill)
            else:
                dropped += 1
    except Exception as exc:  # csv 行过长等异常
        return [], [f"CSV 解析失败:{exc}"]

    # 兜底:个别账单含未配对 ASCII 引号,标准 csv 会"吞行"导致有效行骤减
    # → 忽略引号按物理行手动切分重试(官方表头列在前,行首关键列不受影响)
    data_lines = [ln for ln in lines[header_idx + 1:] if ln.strip()]
    if len(rows) < max(int(len(data_lines) * 0.6), 2):
        fallback_rows: List[BillRow] = []
        fallback_dropped = 0
        for ln in data_lines:
            cells = ln.split(",")
            bill = _map_row("alipay", headers, mapping, cells)
            if bill is not None:
                fallback_rows.append(bill)
            else:
                fallback_dropped += 1
        if fallback_rows:
            rows, dropped = fallback_rows, fallback_dropped
            warnings.append("检测到特殊引号,已按容错模式解析")

    if not rows:
        warnings.append("解析到 0 条有效交易(数据区可能为空或表头行定位有误)")
    if dropped:
        warnings.append(f"跳过 {dropped} 行无效/缺字段记录")
    return rows, warnings


def parse_alipay_bytes(raw: bytes) -> Tuple[List[BillRow], List[str]]:
    """解码 + 解析支付宝 CSV 字节流(服务端 base64 直传/自测路径)"""
    text = decode_bytes(raw)
    return parse_alipay_text(text)


def parse_alipay_raw_rows(raw_rows: List[Dict[str, object]]) -> Tuple[List[BillRow], List[str]]:
    """解析「浏览器已提取、键为原始表头」的字典行(隐私路径的兜底映射)"""
    if not raw_rows:
        return [], []
    headers = list(raw_rows[0].keys())
    mapping, _ = locate_columns(headers)
    rows: List[BillRow] = []
    dropped = 0
    for raw in raw_rows:
        cells = [raw.get(h, "") for h in headers]
        bill = _map_row("alipay", headers, mapping, cells)
        if bill is not None:
            rows.append(bill)
        else:
            dropped += 1
    warnings = [f"跳过 {dropped} 行无效记录"] if dropped else []
    return rows, warnings
