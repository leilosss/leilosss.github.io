// =============================================================
// 本地解析公共工具(与后端 services/column_map.py 同规则,保证两端一致)
// =============================================================
import type { BillRow, Direction, Platform } from "./types";

export type FieldKey = "time" | "counterparty" | "item" | "category" | "direction" | "amount";

/** 统一字段 → 候选列名(按优先级排列) */
const COL_CANDIDATES: Record<FieldKey, string[]> = {
  time: ["交易创建时间", "交易时间", "时间"],
  counterparty: ["交易对方", "收款方", "对方", "付款方"],
  item: ["商品名称", "商品说明", "商品"],
  category: ["交易分类", "类型", "分类"],
  direction: ["收/支", "收支"],
  amount: ["金额"],
};

const FIELD_ORDER: FieldKey[] = ["time", "counterparty", "item", "category", "direction", "amount"];

/** 表头归一化:去括号内容、去空白、转小写(「金额（元）」→「金额」) */
export function normHeader(h: string): string {
  return (h || "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s　]/g, "")
    .toLowerCase();
}

/** 定位语义字段在表头中的列下标(已占用的列不会重复分配) */
export function locateColumns(headers: string[]): {
  map: Partial<Record<FieldKey, number>>;
  missing: FieldKey[];
} {
  const norm = headers.map(normHeader);
  const map: Partial<Record<FieldKey, number>> = {};
  const used = new Set<number>();
  for (const field of FIELD_ORDER) {
    const candidates = COL_CANDIDATES[field].map(normHeader);
    // 第 1 轮:精确匹配(按候选优先级)
    let idx = -1;
    for (const key of candidates) {
      idx = norm.findIndex((h, i) => !used.has(i) && h === key);
      if (idx >= 0) break;
    }
    // 第 2 轮:包含匹配(仍未命中时)
    if (idx < 0) {
      for (const key of candidates) {
        idx = norm.findIndex((h, i) => !used.has(i) && h.includes(key));
        if (idx >= 0) break;
      }
    }
    if (idx >= 0) {
      map[field] = idx;
      used.add(idx);
    }
  }
  const missing = FIELD_ORDER.filter((f) => map[f] === undefined);
  return { map, missing };
}

/** 「收/支」值 → in/out/unknown */
export function directionOf(v: unknown): Direction {
  const s = String(v ?? "").trim();
  if (s.includes("收入") || s === "收") return "in";
  if (s.includes("支出") || s === "支") return "out";
  return "unknown";
}

/** 金额解析:支持数字/¥6.00/6,600.50元/负号(恒为正,方向看收支列) */
export function parseAmountCell(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Math.abs(Number.isFinite(v) ? v : 0) || null;
  const s = String(v).trim().replace(/[¥￥,]/g, "").replace(/[元\s]/g, "");
  if (!s || s === "-" || s === "--") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

/** Excel 日期序列号 → YYYY-MM-DD HH:MM:SS(25569 = 1970-01-01 的序列值) */
function fromExcelSerial(v: number): string | null {
  if (!(v > 20000 && v < 80000)) return null;
  const d = new Date(Math.round((v - 25569) * 86400 * 1000));
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 时间解析:支持 Date 对象 / 'YYYY-MM-DD HH:MM(:SS)' / 'YYYY/MM/DD' / Excel 序列号(数字或数字文本) */
export function parseTimeCell(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  // Excel 日期序列号:数字或“46036.44”这类纯数字文本(个别微信 xlsx 导出的时间形态)
  if (typeof v === "number") {
    const t = fromExcelSerial(v);
    if (t) return t;
  } else {
    const s = String(v).trim();
    if (/^\d+(\.\d+)?$/.test(s)) {
      const t = fromExcelSerial(parseFloat(s));
      if (t) return t;
    }
  }
  const m = String(v).match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})[\sT]?(\d{1,2})?:?(\d{2})?:?(\d{2})?/);
  if (!m) {
    // 兜底:个别导出把时间写成英文文本,如 "Thu Aug 20 2026 18:07:37"
    const s = String(v).trim();
    if (/^[A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{4} \d{1,2}:\d{2}/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      }
    }
    return null;
  }
  const [, yy, mo, dd, hh, mm, ss] = m;
  const y = +yy, moN = +mo, dN = +dd, hN = +(hh || 0), miN = +(mm || 0), sN = +(ss || 0);
  if (moN < 1 || moN > 12 || dN < 1 || dN > 31 || hN > 23 || miN > 59 || sN > 59) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(moN)}-${p(dN)} ${p(hN)}:${p(miN)}:${p(sN)}`;
}

/** 按字段取单元格文本 */
export function cellAt(
  headers: string[],
  colmap: Partial<Record<FieldKey, number>>,
  cells: unknown[],
  field: FieldKey,
): string {
  const i = colmap[field];
  if (i === undefined || i >= cells.length) return "";
  const v = cells[i];
  return v === null || v === undefined ? "" : String(v).trim();
}

/** 是否空行 */
export function rowHasValue(cells: unknown[]): boolean {
  return cells.some((c) => c !== null && c !== undefined && String(c).trim() !== "");
}

/** 按字段取原始单元格值(不转字符串;时间/金额需要 Date/数字原生类型) */
function rawCellAt(
  headers: string[],
  colmap: Partial<Record<FieldKey, number>>,
  cells: unknown[],
  field: FieldKey,
): unknown {
  const i = colmap[field];
  if (i === undefined || i >= cells.length) return undefined;
  return cells[i];
}

/** 行 → 统一 BillRow(缺时间/金额返回 null) */
export function makeBillRow(
  platform: Platform,
  headers: string[],
  colmap: Partial<Record<FieldKey, number>>,
  cells: unknown[],
): BillRow | null {
  if (!rowHasValue(cells)) return null;
  // 关键:时间/金额必须传“原始值”——read-excel-file 的时间单元格是 Date 对象,
  // 若先 String() 会变成 "Thu Sep 07 2026 02:16:20 GMT+0800…",正则无法匹配
  const time = parseTimeCell(rawCellAt(headers, colmap, cells, "time"));
  const amount = parseAmountCell(rawCellAt(headers, colmap, cells, "amount"));
  if (!time || amount === null || amount <= 0) return null;
  return {
    platform,
    time,
    counterparty: cellAt(headers, colmap, cells, "counterparty"),
    item: cellAt(headers, colmap, cells, "item"),
    category: cellAt(headers, colmap, cells, "category"),
    direction: directionOf(cellAt(headers, colmap, cells, "direction")),
    amount: Math.round(amount * 100) / 100,
  };
}

/** 按文件扩展名/内容特征猜平台(上传时无需用户选择) */
export function detectPlatform(fileName: string, probe: string): Platform | "unknown" {
  const name = (fileName || "").toLowerCase();
  const head = probe.slice(0, 2000);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "wechat";
  if (/微信|wechat/i.test(name + head)) return "wechat";
  if (/支付宝|alipay/i.test(name + head)) return "alipay";
  if (head.includes("交易号") || head.includes("交易创建时间")) return "alipay";
  if (head.includes("交易时间") && head.includes("交易类型")) return "wechat";
  return "unknown";
}

/** 字节流解码:UTF-8 严格尝试失败则按 GB18030(支付宝旧版 GBK 导出) */
export function decodeBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  // BOM 处理
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // GB18030 是 GBK 超集,浏览器均支持
    return new TextDecoder("gb18030").decode(bytes);
  }
}
