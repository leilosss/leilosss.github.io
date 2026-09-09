# 订阅扫雷器 Subscription Scanner(MVP)

隐私优先的**支付宝 / 微信账单自动续费订阅识别**工具。上传账单 → 揪出所有周期性扣费(视频会员、网盘、iCloud、知识付费……)→ 算出「一年被静默扣掉多少钱」。

**核心承诺:账单文件只在浏览器内解析,服务端只接收脱敏后的结构化 JSON,处理完立即销毁,不写磁盘。**

## 技术栈

| 端 | 技术 |
|---|---|
| 前端 | Next.js 14(App Router)· TypeScript · Tailwind CSS · shadcn/ui 风格组件 · Papaparse · read-excel-file · ECharts · Zod |
| 后端 | FastAPI(Python 3.11)· Pandas · openpyxl · chardet · Pydantic v2 |
| 部署 | Vercel/任意 Node 主机 + Railway/Render/Docker(本项目自带 compose,已实测部署于云服务器) |

## 目录结构

```
├── docker-compose.yml        # 一键本地/服务器编排
├── frontend/                 # Next.js 14
│   ├── app/
│   │   ├── page.tsx          # 上传页
│   │   ├── report/page.tsx   # 报告页(含 PDF 导出 / 数据销毁)
│   │   └── api/…             # 同源代理路由 → FastAPI(浏览器不直连后端)
│   ├── components/           # FileUploader / SubscriptionList / ReportChart / ui/*
│   └── lib/                  # 本地解析(alipay/wechat)、编排、校验、图表配置
└── backend/                  # FastAPI
    ├── main.py               # 入口 + 安全响应头(CSP/HSTS)+ CORS
    ├── models.py             # Pydantic 契约(与前端 types.ts 镜像)
    ├── routers/parse.py      # POST /api/parse/alipay | /api/parse/wechat
    ├── routers/detect.py     # POST /api/detect
    ├── services/
    │   ├── alipay_parser.py  # GBK/UTF-8 自适应 + 表头自动定位
    │   ├── wechat_parser.py  # openpyxl 读 xlsx + csv 自适应
    │   ├── detector.py       # 关键词 + 周期规律双策略识别引擎
    │   ├── keywords.py       # 70+ 常见订阅服务关键词库(可扩展)
    │   └── column_map.py     # 双平台表头模糊定位
    └── scripts/              # 示例账单生成 + 全链路自检
```

## 本地开发

### 方式 A:前后端分开跑(推荐开发)

```bash
# 1. 后端(FastAPI :8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. 前端(Next.js :3000,另开终端)
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 。前端 `app/api/*` 路由会代理到后端(默认 `http://127.0.0.1:8000`,可用 `frontend/.env.local` 里的 `API_URL` 覆盖)。

### 方式 B:Docker Compose 一键运行

```bash
docker compose up --build      # 前端 http://localhost:3000
```

## 隐私与安全设计(可自行验证)

1. **文件不出浏览器**:CSV 用 Papaparse、xlsx 用 read-excel-file 在浏览器本地解析(支付宝 GBK 用 `TextDecoder('gb18030')` 兼容);
2. 浏览器只向**同源** `/api/*` 发 POST JSON → Next 服务端代理 → FastAPI,故浏览器 Network 面板里**永远看不到任何 .csv/.xlsx 文件上传**;
3. 后端对账单行仅做本次请求内存处理:响应头 `Cache-Control: no-store` + `X-Data-Policy: memory-only`;全链路不上传文件、不落盘、不记日志;
4. 前端 Zod + 后端 Pydantic 双重校验;生产环境下发 CSP / HSTS / 防嗅探响应头;
5. 报告存于 `sessionStorage`(关标签即灭),「清除数据并销毁」按钮一键清空。

## 验收自检

```bash
# 生成与真实文件同构的示例账单(支付宝 GBK CSV / 微信 xlsx+csv)
cd backend && python scripts/make_samples.py

# 全链路自检:GBK 解码 → 表头定位 → 解析 → 订阅识别 → 断言关键订阅全部命中
cd backend && python scripts/selfcheck.py
```

自检预期:10 个植入订阅全部命中(腾讯视频/爱奇艺/百度网盘/网易云/iCloud/Spotify/喜马拉雅/京东PLUS/WPS/拼多多),并正确输出月/季/年周期与年化金额。

接口可直接用 curl 打(仅回环可用的部署形态见下):

```bash
# 结构化行(隐私默认路径)
curl -X POST http://127.0.0.1:8000/api/detect \
  -H 'Content-Type: application/json' \
  -d '{"rows":[{"platform":"alipay","time":"2026-01-01 10:00:00","counterparty":"腾讯视频商户","item":"腾讯视频VIP-自动续费","category":"商户消费","direction":"out","amount":25.0}]}'

# 原始文件(base64,自动化/自测专用,前端不使用)
python -c "import base64,json,urllib.request;b=base64.b64encode(open('backend/samples/alipay_sample.csv','rb').read()).decode();req=urllib.request.Request('http://127.0.0.1:8000/api/parse/alipay',data=json.dumps({'base64':b}).encode(),headers={'Content-Type':'application/json'});print(json.load(urllib.request.urlopen(req))['total'])"
```

## 部署到云服务器(本仓库做法)

```bash
# 服务器上仅需 Docker;国内网络用阿里云 docker-ce 源 + 镜像加速,见 deploy 笔记
scp -r ./ ubuntu@<server>:~/apps/subscription-scanner
cd ~/apps/subscription-scanner
echo 'PUBLIC_PORT=80' > .env          # 让前端直接占用 80
docker compose up -d --build
```

- 前端 → `http://<server>/`,后端仅监听容器内网与宿主机回环 `127.0.0.1:8000`;
- 腾讯云/阿里云需在**安全组**放行 `PUBLIC_PORT`;
- 若改走 Vercel + Railway:前端设置环境变量 `API_URL=https://xxx.railway.app`(注意其只读文件系统需将 Next `output` 保持 standalone 或在 Vercel 上去掉该字段),Railway 侧配 `FRONTEND_ORIGINS`。

## 已知边界与路线图

- **基础报告(免费)**:订阅清单 + 年节省估算 + 趋势/占比图 + PDF(打印另存);
- **详细排雷报告(付费扩展预留)**:逐项取消操作指引、与各平台续费条款核对清单、导出可分享报告 —— 当前前端已留 `report/page.tsx` 展示位;
- 识别准确率依赖账单跨度:≥3 个月效果最佳;单次扣费且无周期证据的条目会标注「待观察」而非误报;
- 微信「材料证明」类文件为带公章的凭证而非明细,请选择「账单下载 → 交易明细」导出。

> 参考实现:Subsurfer(订阅检测思路)、my-billing / Bills-save(账单解析)、Hessel2333/alipay_record_analysis(支付宝解析)。
