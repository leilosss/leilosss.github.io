# =============================================================
# 账单解析路由
#   POST /api/parse/alipay   支付宝 CSV 账单
#   POST /api/parse/wechat   微信 xlsx/csv 账单
# 入参两种形态:
#   rows   ——【隐私默认路径】浏览器本地解析后的结构化行(前端唯一用法)
#   base64 —— 可选。原始文件字节,供 curl/自动化自测走完整服务端解析链路
#              (GBK 探测解码 / openpyxl 表头定位),前端永不发送文件
# =============================================================
from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException

from models import ParseIn, ParseResult, Platform
from services.alipay_parser import parse_alipay_bytes, parse_alipay_raw_rows
from services.wechat_parser import parse_wechat_bytes

router = APIRouter(tags=["parse"])


def _handle(platform: Platform, body: ParseIn) -> ParseResult:
    """公共处理:按入参形态走「结构化行校验」或「原始文件解析」"""
    warnings: list[str] = []
    rows = []
    if body.rows:
        # 隐私默认路径:行已在浏览器内解析,服务端仅校验/清洗
        rows = [r for r in body.rows if r.counterparty or r.item or r.amount > 0]
        dropped = len(body.rows) - len(rows)
        if dropped:
            warnings.append(f"已忽略 {dropped} 行空记录")
    elif body.base64:
        raw = base64.b64decode(body.base64, validate=False)
        if platform == "alipay":
            rows, warnings = parse_alipay_bytes(raw)
        else:
            rows, warnings = parse_wechat_bytes(raw, body.file_name)
    else:
        raise HTTPException(status_code=422, detail="请提供 rows(结构化账单行)或 base64(原始文件)")

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="未能从内容中解析出任何有效交易记录,请确认是支付宝/微信导出的原始账单文件",
        )
    return ParseResult(platform=platform, total=len(rows), dropped=0, warnings=warnings, rows=rows)


@router.post("/api/parse/alipay", response_model=ParseResult)
def parse_alipay(body: ParseIn):
    """解析支付宝账单(CSV,GBK/UTF-8 自适应)"""
    return _handle("alipay", body)


@router.post("/api/parse/wechat", response_model=ParseResult)
def parse_wechat(body: ParseIn):
    """解析微信账单(.xlsx 用 openpyxl,.csv 自适应)"""
    return _handle("wechat", body)
