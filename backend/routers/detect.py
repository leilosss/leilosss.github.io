# =============================================================
# 订阅识别路由
#   POST /api/detect —— 输入已解析的结构化账单行,返回识别报告
# 隐私:请求体只在本次调用内存中存活,返回后即出栈释放,不写磁盘/日志
# =============================================================
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException

from models import DetectIn, DetectResult
from services.detector import detect_transactions

router = APIRouter(tags=["detect"])


@router.post("/api/detect", response_model=DetectResult)
def detect(body: DetectIn):
    """识别账单中的周期性订阅,返回基础报告(订阅清单+月度趋势+品类占比+节省估算)"""
    if not body.rows:
        raise HTTPException(status_code=400, detail="缺少账单数据:请先上传并解析账单")
    payload = detect_transactions(body.rows)
    return DetectResult(**payload, generated_at=datetime.now().isoformat(timespec="seconds"))
