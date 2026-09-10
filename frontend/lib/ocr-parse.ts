// =============================================================
// ocr-parse —— OCR 文本行 → 统一账单行(BillRow[])
//
// 关键决策:**不新写一套识别逻辑**。OCR 出来的其实就是一段"排好序的账单
// 文本",与用户从账单页复制出来的文本同构,因此直接复用 lib/paste-parse 的
// 锚点解析(金额锚点 → 上下找商户 → 最近日期),只在两处按 OCR 的特性调整:
//   1. dateSearch: "nearest" —— OCR 的行序里日期常在金额**下方**,
//      而纯文本粘贴时日期在上方,所以取"上下最近的一条"。
//   2. 放宽最小行数/笔数 —— 一张截图可能只拍到 1–2 笔。
// 之后的链路与 CSV/XLSX/粘贴完全一致:BillRow[] → detectLocal → Report。
// =============================================================
import { canonicalMerchant } from "./local-detect";
import { parsePastedText } from "./paste-parse";
import type { BillRow } from "./types";

/** OCR 常见噪声:纯符号行、页眉页脚、按钮文案 */
const OCR_NOISE = [
  "账单明细", "交易明细", "全部账单", "筛选", "搜索", "加载更多", "没有更多",
  "常见问题", "账单服务", "对账", "开具证明", "返回", "完成", "统计", "月账单",
] as const;

/** 只保留有实际内容的行:去掉纯符号/空白,以及明确的界面噪声 */
function cleanLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const t = (raw ?? "").replace(/\s+/g, "").trim();
    if (!t) continue;
    if (/^[\p{P}\p{S}]+$/u.test(t)) continue; // 只有标点/符号
    if (OCR_NOISE.some((n) => t === n || t.startsWith(n))) continue;
    out.push(t);
  }
  return out;
}

/** 从识别文本判断账单来源(取取消指引用;判断不出时按支付宝) */
function guessPlatform(lines: string[]): "alipay" | "wechat" {
  const all = lines.join("");
  if (/微信/.test(all) && !/支付宝/.test(all)) return "wechat";
  return "alipay";
}

export interface OcrParseOutcome {
  platform: "alipay" | "wechat";
  rows: BillRow[];
}

/**
 * OCR 文本行 → 账单行。抛错 = 没识别出可用账目(upload 页转失败态,
 * 并提示"分段截图/改用粘贴")。
 */
export function ocrLinesToBillRows(lines: string[]): OcrParseOutcome {
  const clean = cleanLines(lines);
  if (clean.length < 3) {
    throw new Error("没能从截图里读出账目文字");
  }
  const platform = guessPlatform(clean);
  const parsed = parsePastedText(clean.join("\n"), {
    dateSearch: "pair",
    minLines: 3,
    minAnchors: 1,
    minRows: 1,
  });
  // OCR 对同一商户的识别结果会有细微差异,统一收敛到关键词库的规范名,
  // 否则「SpotifyPremium订阅」与「SpotifyPremium订闻」会被当成两个商户,
  // 同一个订阅被拆成两条(周期规律也就断了)。
  return {
    platform,
    rows: parsed.rows.map((r) => {
      const canon = canonicalMerchant(`${r.counterparty} ${r.item}`);
      return canon ? { ...r, counterparty: canon } : r;
    }),
  };
}
