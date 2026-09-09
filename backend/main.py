# =============================================================
# 订阅扫雷器 · FastAPI 入口
# 安全基线:全局安全响应头(HSTS/CSP/防嗅探/防缓存)+ CORS 白名单
# 隐私基线:所有 /api 响应 Cache-Control: no-store,数据仅存活于一次请求内存中
# =============================================================
from __future__ import annotations

import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from routers import detect, parse

# ---- 环境变量(见 docker-compose.yml / README)----
ENV_MODE = os.getenv("ENV_MODE", "development")          # development | production
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

app = FastAPI(
    title="订阅扫雷器 Subscription Scanner API",
    description="识别支付宝/微信账单中的自动续费订阅(隐私优先:仅接收结构化 JSON,不落盘)",
    version="0.1.0",
)

# ---- CORS:仅为"前端直连后端"的部署形态预留;默认走 Next 服务端代理则不会触发 ----
_cors_origins = FRONTEND_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in _cors_origins else _cors_origins,
    allow_credentials=False,   # 与通配来源兼容;无 Cookie 认证,无需凭据
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Data-Policy"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """为每个响应附加安全/隐私响应头(HSTS 仅生产环境下发)"""
    start = time.time()
    response = await call_next(request)
    # 隐私声明头:告知调用方本服务对账单数据"只用不存"
    response.headers["X-Data-Policy"] = "memory-only,no-persist"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if ENV_MODE == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.url.path.startswith("/api"):
        # API 纯 JSON:收紧 CSP 且禁止缓存
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        )
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["X-Process-Time-Ms"] = str(int((time.time() - start) * 1000))
    return response


@app.get("/api/health")
def health():
    """存活探针(docker-compose healthcheck 使用)"""
    return {"ok": True, "service": "subscription-scanner", "mode": ENV_MODE}


@app.get("/")
def root():
    return {"service": "subscription-scanner", "docs": "/docs", "health": "/api/health"}


# ---- 业务路由(见 routers/)----
app.include_router(parse.router)    # POST /api/parse/alipay | /api/parse/wechat
app.include_router(detect.router)   # POST /api/detect
