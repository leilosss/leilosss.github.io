# 订阅扫雷器 · 后端镜像(FastAPI)
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # 国内加速:依赖走阿里云 PyPI 镜像(可自行移除)
    PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/ \
    PIP_TRUSTED_HOST=mirrors.aliyun.com

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
# 生产启动:绑定 0.0.0.0 供容器内网/回环访问
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
