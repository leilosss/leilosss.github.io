// =============================================================
// 输入校验(zod)
// 「所有用户输入经过 Zod 校验」:文件元信息 + 平台 + 结构化行
// =============================================================
import { z } from "zod";
import type { BillRow, Platform } from "./types";

/** 文件大小上限:10MB(与后端约定一致) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 上传文件元信息校验 */
export const FileMetaSchema = z.object({
  name: z.string().min(1, "文件名不能为空").max(200, "文件名过长"),
  size: z
    .number()
    .int()
    .positive("文件为空")
    .max(MAX_FILE_SIZE, "文件超过 10MB 上限,请导出更小时间范围的账单"),
});

export type FileMeta = z.infer<typeof FileMetaSchema>;

/** 平台枚举(扩展新平台时同步) */
export const PlatformSchema = z.enum(["alipay", "wechat"]);

/** 结构化账单行校验(发送给后端前最后一道闸) */
export const BillRowSchema = z.object({
  platform: PlatformSchema,
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/, "交易时间格式异常"),
  counterparty: z.string().max(200).default(""),
  item: z.string().max(500).default(""),
  category: z.string().max(200).default(""),
  direction: z.enum(["in", "out", "unknown"]),
  amount: z.number().finite().min(0, "金额为负").max(1e9, "金额异常过大"),
});

/** 批量校验账单行,返回合法行并给出被剔除数量(兜底,正常管线不应触发) */
export function validateBillRows(rows: BillRow[]): { valid: BillRow[]; dropped: number } {
  const valid: BillRow[] = [];
  for (const row of rows) {
    const r = BillRowSchema.safeParse(row);
    if (r.success) valid.push(row);
  }
  return { valid, dropped: rows.length - valid.length };
}
