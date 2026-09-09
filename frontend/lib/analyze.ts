// =============================================================
// 分析管线编排:本地解析(文件不出浏览器)→ 结构化行 Zod 校验
// → 经 Next 服务端代理调 /api/parse → /api/detect → 返回报告
// 原始账单文件永不离开浏览器;服务端只见过结构化 JSON,且响应即弃。
// =============================================================
import { parseAlipayLocal } from "./alipay-parse";
import { detectPlatform } from "./bill-common";
import { parseWechatLocal } from "./wechat-parse";
import type { BillRow, Platform } from "./types";
import { FileMetaSchema, validateBillRows } from "./validation";

/** 业务错误(携带后端返回的中文提示) */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 从后端错误响应中提取可读信息(FastAPI 的 detail 可能是字符串或数组) */
function extractDetail(data: unknown): string {
  if (data && typeof data === "object") {
    const d = (data as Record<string, unknown>).detail;
    if (Array.isArray(d)) {
      return d
        .map((it) => {
          const m = (it as Record<string, unknown>)?.msg;
          return typeof m === "string" ? m : "";
        })
        .filter(Boolean)
        .join(";");
    }
    if (typeof d === "string") return d;
  }
  return "服务返回异常,请稍后重试";
}

/** 同源 POST(经 Next 服务端路由代理转发到 FastAPI) */
async function postJSON<T>(path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError("无法连接分析服务,请确认后端已启动(本地 uvicorn :8000 或 docker compose)", 502);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) throw new ApiError(data ? extractDetail(data) : `请求失败(HTTP ${res.status})`, res.status);
  return data as T;
}

/** 执行一条分析管线的完整阶段(供 UI 展示进度) */
export type Stage = "校验文件" | "本地解析(文件不出浏览器)" | "服务端校验" | "订阅识别";

/** 本地阶段一:校验 + 平台识别 + 文件内解析(全部在浏览器) */
export async function parseFileLocally(
  file: File,
): Promise<{ platform: Platform; rows: BillRow[]; dropped: number; warnings: string[] }> {
  // 1) 元信息 Zod 校验(大小上限 10MB)
  const meta = FileMetaSchema.safeParse({ name: file.name, size: file.size });
  if (!meta.success) {
    const first = meta.error.issues[0];
    throw new ApiError(first?.message ?? "文件不符合要求");
  }
  // 2) 平台识别(csv 先读头部字节做嗅探;xlsx 直接按微信处理)
  const isCsv = /\.csv$/i.test(file.name);
  const headText = isCsv ? await file.slice(0, 4096).text() : "";
  const platform = detectPlatform(file.name, headText);
  if (platform === "unknown") {
    throw new ApiError("无法识别账单来源:请上传支付宝导出的 CSV,或微信导出的 xlsx/csv 账单");
  }
  // 3) 本地解析(隐私关键路径:文件字节仅在此处读取,解析后即释放)
  const outcome =
    platform === "alipay" ? await parseAlipayLocal(file) : await parseWechatLocal(file);
  // 4) Zod 逐行校验(服务端收数前的最后一道闸)
  const { valid, dropped } = validateBillRows(outcome.rows);
  if (!valid.length) throw new ApiError("解析出的数据未通过格式校验,请确认账单文件完整");
  return {
    platform,
    rows: valid,
    dropped: outcome.dropped + dropped,
    warnings: outcome.warnings,
  };
}

