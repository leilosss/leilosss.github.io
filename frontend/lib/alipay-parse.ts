// =============================================================
// 支付宝 CSV 本地解析(隐私默认路径:文件不出浏览器)
// 特征:前若干行为说明文字(按内容自动定位表头,不硬编码行号)
// 编码:GBK/GB18030 为主,UTF-8 自动兼容(bill-common.decodeBuffer)
// 鲁棒性:
//   - 兼容老版(表头「交易号」起始)与新版「交易明细」(表头「交易时间」起始)
//   - 换行混用(CRLF/LF)统一归一化,避免 Papa 探测错乱吞行
//   - 引号未配对时自动禁用引号转义重试
// =============================================================
import Papa from "papaparse";
import { decodeBuffer, locateColumns, makeBillRow } from "./bill-common";
import type { BillRow } from "./types";

/** 找不到表头标记时的兜底跳行数(官方说明文字行数) */
const PREAMBLE_FALLBACK = 24;

export interface LocalParseOutcome {
  rows: BillRow[];
  dropped: number;
  warnings: string[];
}

const CR = String.fromCharCode(13);
const NUL = String.fromCharCode(1);

/** Papa 解析(数组模式):换行归一化 + "未配对引号"兜底 */
function parseMatrix(text: string): string[][] {
  // 归一化换行:官方文件可能混用 CRLF 与 LF,Papa 探测错乱会把后续行吞成一个大字段
  const norm = text.split(CR + "\n").join("\n").split(CR).join("\n");
  const lineCount = norm.split("\n").length;
  let matrix = Papa.parse<string[]>(norm, { delimiter: ",", newline: "\n", skipEmptyLines: "greedy" }).data;
  if (matrix.length < lineCount / 2) {
    // 个别账单含未配对 ASCII 引号 → 引号模式吞行;把引号当普通字符重试
    // (关键列都在行首,不受影响)
    matrix = Papa.parse<string[]>(norm, {
      delimiter: ",",
      newline: "\n",
      quoteChar: NUL,
      skipEmptyLines: "greedy",
    }).data;
  }
  return matrix;
}

/** 解析支付宝 CSV 文件(浏览器本地执行) */
export async function parseAlipayLocal(file: File): Promise<LocalParseOutcome> {
  const text = decodeBuffer(await file.arrayBuffer());
  const matrix = parseMatrix(text);
  if (matrix.length < 5) {
    throw new Error("内容过短,不是支付宝导出的完整账单 CSV");
  }

  // 定位表头行:老版以「交易号」起始,新版「交易明细」以「交易时间」起始
  let hi = -1;
  for (let i = 0; i < Math.min(matrix.length, 60); i++) {
    const cells = (matrix[i] ?? []).map((c) => String(c ?? "").trim());
    const joined = cells.join("");
    const isStart = cells[0]?.startsWith("交易号") || cells[0]?.startsWith("交易时间");
    if (isStart && joined.includes("交易") && joined.includes("对方") && joined.includes("金额") && joined.includes("收/支")) {
      hi = i;
      break;
    }
  }
  if (hi < 0) {
    // 兜底:跳过 24 行说明文字后的那一行视为表头
    hi = Math.min(PREAMBLE_FALLBACK, matrix.length - 1);
  }

  const headers = (matrix[hi] ?? []).map((c) => String(c ?? "").trim());
  const { map, missing } = locateColumns(headers);
  const warnings: string[] = [];
  if (missing.length) {
    warnings.push(`表头缺少字段:${missing.join("、")}(将按空值处理)`);
  }

  let dropped = 0;
  const rows: BillRow[] = [];
  for (const cells of matrix.slice(hi + 1)) {
    const row = makeBillRow("alipay", headers, map, cells);
    if (row) rows.push(row);
    else dropped += 1;
  }
  if (rows.length === 0) {
    throw new Error("未解析到任何有效交易记录,请确认为支付宝账单明细(收支明细)导出的 CSV");
  }
  return { rows, dropped, warnings };
}
