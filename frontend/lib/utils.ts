// =============================================================
// 工具:合并 className(className 合并 + 去冲突)
// =============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名(后出现的同族类会覆盖先出现的) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 金额格式化:1234.5 → ¥1,234.50 */
export function fmtCNY(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** 无符号金额格式化:1234.5 → 1,234.50 */
export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
