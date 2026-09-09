// =============================================================
// 微信账单本地解析(隐私默认路径:文件不出浏览器)
// 支持 .xlsx(新版下载账单/材料证明)与 .csv(邮箱个人对账,UTF-8 BOM)
// 说明:Excel 读取用 read-excel-file(纯浏览器解析,不联网)
// =============================================================
import Papa from "papaparse";
import readXlsxFile from "read-excel-file";
import { decodeBuffer, locateColumns, makeBillRow, rowHasValue } from "./bill-common";
import type { BillRow } from "./types";
import type { LocalParseOutcome } from "./alipay-parse";

/** 微信表头行判定关键词 */
const NEEDED = ["交易时间", "交易对方", "金额"];

/** 表尾判断:合计行 / 分隔线 / “以下无” */
function isTailRow(cells: unknown[]): boolean {
  const first = String(cells[0] ?? "").trim();
  const joined = cells
    .slice(0, 3)
    .map((c) => String(c ?? ""))
    .join("");
  return first.startsWith("合计") || joined.startsWith("合计") || first.startsWith("-") || joined.includes("以下无");
}

/** 在二维矩阵前 40 行内定位表头行 → (下标, 表头单元格数组) */
function locateHeaderRow(matrix: unknown[][]): { index: number; headers: string[] } {
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const texts = (matrix[i] ?? []).map((c) => String(c ?? "").trim().replace(/^﻿/, ""));
    const joined = texts.join("");
    if (NEEDED.every((k) => joined.includes(k))) {
      return { index: i, headers: texts };
    }
  }
  throw new Error("未能定位微信账单表头行(需同时含 交易时间/交易对方/金额 列)");
}

/** 把表头以下的数据矩阵统一处理为账单行 */
function rowsFromMatrix(matrix: unknown[][]): LocalParseOutcome {
  const { index, headers } = locateHeaderRow(matrix);
  const { map, missing } = locateColumns(headers);
  const warnings: string[] = [];
  if (missing.length) warnings.push(`表头缺少字段:${missing.join("、")}(将按空值处理)`);

  let dropped = 0;
  const rows: BillRow[] = [];
  for (const cells of matrix.slice(index + 1)) {
    if (!rowHasValue(cells)) continue;
    if (isTailRow(cells)) break; // 命中合计行即截断(微信表尾样式)
    const row = makeBillRow("wechat", headers, map, cells);
    if (row) rows.push(row);
    else dropped += 1;
  }
  if (!rows.length) {
    throw new Error("未解析到任何有效交易记录,请确认是微信支付账单明细(交易明细)文件");
  }
  return { rows, dropped, warnings };
}

/** 解析微信账单文件(按扩展名分流) */
export async function parseWechatLocal(file: File): Promise<LocalParseOutcome> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    // read-excel-file 直接吃 File/Blob,内部按 zip 解析 xlsx
    const matrix = (await readXlsxFile(file)) as unknown[][];
    return rowsFromMatrix(matrix);
  }
  if (name.endsWith(".csv")) {
    const text = decodeBuffer(await file.arrayBuffer());
    const lines = text.split(/\r?\n/);
    const matrix = lines.map((ln) => {
      const parsed = Papa.parse<string[]>(ln).data[0] ?? [];
      return parsed as unknown[];
    });
    return rowsFromMatrix(matrix);
  }
  throw new Error("不支持的微信账单格式,请上传 .xlsx 或 .csv");
}
