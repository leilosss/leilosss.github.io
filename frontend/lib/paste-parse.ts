// =============================================================
// paste-parse —— 粘贴文本解析(v12 核心:3 步路径之"粘贴")
// 用户在微信/支付宝账单页全选复制 → 粘贴 → 本解析器在浏览器内
// 识别出账单行(时间/商户/金额),全程零上传。
// 两遍锚点法:①扫出金额锚点行(¥/-/数字)②每个锚点向上下双向
// 找最近"信息行"作名称(优先下一行 — 支付宝名称在金额之后;
// 上行 — 微信名称在金额之前),日期取锚点向上最近的日期行。
// 单号/纯数字/状态行等噪声一律剔除。
// =============================================================
import type { BillRow } from "./types";

const NOISE = [
  "微信支付", "支付宝", "账单明细", "导出", "交易时间", "交易类型", "交易对方", "商品",
  "收/支", "金额", "支付方式", "当前状态", "交易单号", "商户单号", "备注", "合计",
  "共", "笔", "退款", "充值", "转账", "零钱", "余额", "明细列表",
  "商户消费", "扫二维码付款", "付款码支付", "群收款", "收款", "已收钱", "已存入零钱",
  "理财通", "存钱罐", "话费充值", "手机充值", "生活缴费", "水电煤", "信用卡还款",
  "分付还款", "借呗还款", "花呗还款", "工资", "红包", "理财", "基金", "收益",
  "merchant", "amount", "status", "trade time",
] as const;

const DATE_RE = /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/;
const TIME_RE = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const AMOUNT_RE = /[¥￥]?\s*(-?)\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
const PURE_SYMBOL = /^[\d\s¥￥.\-+()（）:：,，|/\\A-Za-z]*$/; // 纯数字/单号/时间行

function isNoise(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (PURE_SYMBOL.test(t)) return true; // 单号/日期/纯数字行
  if (NOISE.some((n) => t.toLowerCase().startsWith(n.toLowerCase()))) return true;
  return false;
}

/** 剥掉日期与时间后的残余文本(金额判定必须在这上面做,否则 2026-06-10 里的 2026 会被当成金额) */
function stripDateTime(line: string): string {
  return line.replace(DATE_RE, " ").replace(TIME_RE, " ");
}

/** 金额锚点:短行,且**去掉日期时间后**仍含金额;带 ¥ 或负号的更可信 */
function looksLikeAmountLine(line: string): boolean {
  const t = line.trim();
  if (t.length > 30) return false;
  const rest = stripDateTime(t);
  const m = rest.match(AMOUNT_RE);
  if (!m) return false;
  // 排除纯年份/纯序号残留(如 "2026"、"12"):要么带货币符号/负号,要么有小数位
  const hasCurrency = /[¥￥]/.test(rest) || m[1] === "-";
  const hasDecimal = /\.\d{1,2}\b/.test(m[2]);
  const looksLikeYear = /^\s*(19|20)\d{2}\s*$/.test(rest);
  if (looksLikeYear) return false;
  return hasCurrency || hasDecimal;
}

function extractAmount(line: string): { val: number; out: boolean } | null {
  const t = line.trim();
  const rest = stripDateTime(t);
  const m = rest.match(AMOUNT_RE);
  if (!m) return null;
  const v = parseFloat(m[2].replace(/,/g, ""));
  if (Number.isNaN(v) || v <= 0) return null;
  // 收入行剔除:明确的「收入 / 已收钱 / 退款 / +」
  if (/(?:收入|已收钱|退款|入账|\+\s*[¥￥]?\d)/.test(t)) return { val: v, out: false };
  const out = m[1] === "-" || /[¥￥]/.test(rest) || /(?:支出|付款|消费|支付|扣款)/.test(t);
  return { val: v, out };
}

function extractDate(line: string): string | null {
  const m = line.match(DATE_RE);
  if (!m) return null;
  const p = (n: string) => n.padStart(2, "0");
  return `${m[1]}-${p(m[2])}-${p(m[3])}`;
}

/** 取行内时刻 → "HH:MM:SS"(没有则 00:00:00)。OCR 常把日期与时间粘在一起("2026-06-1012:00:00") */
function extractClock(line: string): string {
  const p = (n: string | undefined) => (n ?? "00").padStart(2, "0");
  const m = line.replace(DATE_RE, " ").match(TIME_RE);
  if (!m) return "00:00:00";
  return `${p(m[1])}:${p(m[2])}:${p(m[3])}`;
}

function cleanName(line: string): string {
  return line
    .replace(DATE_RE, "")
    .replace(TIME_RE, "")
    .replace(AMOUNT_RE, "")
    .replace(/[¥￥|｜\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParseOptions {
  /**
   * 日期检索方向。默认 "up"(纯文本粘贴:日期在金额上方)。
   * OCR 的两种账单版式日期位置相反(微信在金额下方、支付宝在上方),
   * 靠"最近距离"会取到相邻交易的日期,因此按**序号配对**:
   * 第 k 个金额锚点 ↔ 第 k 个日期行。仅当两者数量一致时启用,
   * 否则退回 "nearest"。默认 "up" 保持纯文本粘贴的既有行为。
   */
  dateSearch?: "up" | "nearest" | "pair";
  /** 最少文本行数(默认 4;OCR 的单张小图可以更少) */
  minLines?: number;
  /** 最少金额锚点数(默认 3) */
  minAnchors?: number;
  /** 最少成行数(默认 3) */
  minRows?: number;
}

/**
 * 解析粘贴文本 → 账单行。抛错 = 无法识别(上传页转失败态)。
 * 返回 { platform, rows, warnings }
 */
export function parsePastedText(
  raw: string,
  opts: ParseOptions = {},
): { platform: "alipay" | "wechat"; rows: BillRow[]; warnings: string[] } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < (opts.minLines ?? 4)) throw new Error("内容过短,请从账单页完整复制后粘贴");

  const platform: "alipay" | "wechat" = /微信(支付)?/.test(raw) && !/支付宝/.test(raw) ? "wechat" : "alipay";

  /* ① 金额锚点 */
  const anchors: number[] = [];
  lines.forEach((l, i) => {
    if (looksLikeAmountLine(l) && extractAmount(l)) anchors.push(i);
  });
  if (anchors.length < (opts.minAnchors ?? 3)) throw new Error("未找到足够账目,请确认从「账单」页全选复制");

  /* ①-b 序号配对(OCR):第 k 个金额 ↔ 第 k 个日期。与日期在上/在下无关 */
  const dateLines: number[] = [];
  if (opts.dateSearch === "pair") {
    lines.forEach((l, i) => {
      if (extractDate(l)) dateLines.push(i);
    });
  }
  const pairedTime = new Map<number, string>();
  if (opts.dateSearch === "pair" && dateLines.length === anchors.length) {
    anchors.forEach((ai, k) => {
      const di = dateLines[k];
      pairedTime.set(ai, `${extractDate(lines[di])} ${extractClock(lines[di])}`);
    });
  }

  /* ② 逐锚点组装:名称(上优先 —— 微信/支付宝都把商户名放在金额上方;下兜底)+ 日期 */
  const rows: BillRow[] = [];
  for (const i of anchors) {
    const amt = extractAmount(lines[i])!;
    if (!amt.out) continue; // 只处理支出(订阅只可能出现在支出)

    const nameAt = (j: number): string | null => {
      if (j < 0 || j >= lines.length) return null;
      if (looksLikeAmountLine(lines[j])) return null; // 相邻金额 = 另一笔
      const c = cleanName(lines[j]);
      // 噪声判断必须对**清洗后**文本做:"2026-07-10 商户消费" 清洗后是 "商户消费",属噪声
      if (!c || isNoise(c)) return null;
      return c;
    };

    let name: string | null = null;
    for (let j = i - 1; j >= Math.max(0, i - 3) && !name; j--) name = nameAt(j);
    for (let j = i + 1; j < Math.min(lines.length, i + 3) && !name; j++) name = nameAt(j);

    /* 日期:优先用序号配对结果;配不上时 OCR 走"上下最近",粘贴走"向上最近" */
    const mode = opts.dateSearch ?? "up"; // 默认必须是 up(纯文本粘贴的既有行为)
    let time = pairedTime.get(i) ?? "";
    if (!time && mode !== "up") {
      for (let d = 0; d <= 3 && !time; d++) {
        for (const j of [i + d, i - d]) {
          if (j < 0 || j >= lines.length) continue;
          const found = extractDate(lines[j]);
          if (found) {
            time = `${found} ${extractClock(lines[j])}`;
            break;
          }
        }
      }
    } else if (!time) {
      for (let j = i; j > Math.max(-1, i - 4); j--) {
        const found = extractDate(lines[j]);
        if (found) {
          time = `${found} 00:00:00`;
          break;
        }
      }
    }
    rows.push({
      platform,
      direction: "out",
      amount: amt.val,
      counterparty: name || "未知商户",
      item: "",
      category: "",
      time,
    });
  }

  if (rows.length < (opts.minRows ?? 3)) throw new Error(`只识别到 ${rows.length} 笔,请确认复制了完整账单范围`);

  return { platform, rows, warnings: [] };
}
