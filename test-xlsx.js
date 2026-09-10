// =============================================================
// XLSX 上传回归 —— 微信账单 .xlsx(时间列 = Excel 日期序列号,真实导出形态)
// 前置:cd frontend && npm run build
//       node SubscriptionScanner/serve-out.js   (另一个终端)
// 运行:node SubscriptionScanner/test-xlsx.js
//
// 为什么单独测:微信 xlsx 的时间列在不同导出里是 Date 对象 / Excel 序列号 /
// 英文文本混排,历史上多次踩坑;这里生成最小合法 xlsx 走完整上传链路。
// =============================================================
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

// fflate 在 frontend/node_modules 里(zipSync 用来拼最小合法 xlsx)
const { zipSync, strToU8 } = require("./frontend/node_modules/fflate");

/** 日期 → Excel 序列号(1899-12-30 为原点,Excel 的既成事实口径) */
const serial = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;

const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;

function cellXml(ref, value, kind) {
  if (kind === "n") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

/** 生成一个最小但合法的 xlsx(单表,inlineStr 免去 sharedStrings) */
function buildXlsx(rows) {
  const col = (i) => String.fromCharCode(65 + i); // A..Z(本表 10 列以内)
  const sheetRows = rows
    .map((cells, r) => {
      const cs = cells
        .map((c, i) => {
          if (c === null || c === undefined || c === "") return "";
          return cellXml(`${col(i)}${r + 1}`, c.v, c.k);
        })
        .join("");
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join("");

  const files = {
    "[Content_Types].xml": `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
    { level: 0 },
  );
  return Buffer.from(zipped);
}

const T = (v) => ({ v, k: "s" }); // 文本单元格
const N = (v) => ({ v, k: "n" }); // 数字单元格(Excel 序列号走这里)

/** 微信账单 xlsx:前置说明行 + 分隔行 + 表头 + 数据(时间列为序列号) */
const XLSX_MATRIX = [
  [T("微信支付账单明细")],
  [T("起始时间:[2026-06-01 00:00:00]  终止时间:[2026-09-01 23:59:59]")],
  [T("共 9 笔记录")],
  [T("----------------------微信支付账单明细列表----------------------")],
  [
    T("交易时间"), T("交易分类"), T("交易对方"), T("商品说明"),
    T("收/支"), T("金额"), T("支付方式"), T("当前状态"), T("交易单号"), T("商户单号"),
  ],
  [N(serial(2026, 6, 10)), T("商户消费"), T("Adobe"), T("Adobe 创意应用 自动续费"), T("支出"), N(68), T("零钱"), T("支付成功"), T("1"), T("1")],
  [N(serial(2026, 7, 10)), T("商户消费"), T("Adobe"), T("Adobe 创意应用 自动续费"), T("支出"), N(68), T("零钱"), T("支付成功"), T("2"), T("1")],
  [N(serial(2026, 8, 10)), T("商户消费"), T("Adobe"), T("Adobe 创意应用 自动续费"), T("支出"), N(68), T("零钱"), T("支付成功"), T("3"), T("1")],
  [N(serial(2026, 6, 15)), T("商户消费"), T("Spotify"), T("Spotify Premium 订阅"), T("支出"), N(15), T("零钱"), T("支付成功"), T("4"), T("2")],
  [N(serial(2026, 7, 15)), T("商户消费"), T("Spotify"), T("Spotify Premium 订阅"), T("支出"), N(15), T("零钱"), T("支付成功"), T("5"), T("2")],
  [N(serial(2026, 8, 15)), T("商户消费"), T("Spotify"), T("Spotify Premium 订阅"), T("支出"), N(15), T("零钱"), T("支付成功"), T("6"), T("2")],
  [N(serial(2026, 7, 3)), T("转账"), T("朋友还款"), T("还款"), T("收入"), N(300), T("零钱"), T("已收钱"), T("7"), T("3")],
  [T("合计"), T(""), T(""), T(""), T("支出"), N(294), T(""), T(""), T(""), T("")],
];

(async () => {
  const xlsxPath = path.join(os.tmpdir(), "trim-test-wechat.xlsx");
  fs.writeFileSync(xlsxPath, buildXlsx(XLSX_MATRIX));
  console.log("夹具已生成:", xlsxPath, fs.statSync(xlsxPath).size, "bytes\n");

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;
  const check = (name, fn) => {
    try {
      fn();
      pass += 1;
      console.log("  ✓", name);
    } catch (e) {
      fail += 1;
      console.log("  ✗", name, "\n      →", e.message);
    }
  };

  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.locator('input[type="file"]').setInputFiles(xlsxPath);
  await page.waitForURL(/report\?d=/, { timeout: 25000 });
  await page.waitForTimeout(2000);

  const header = await page.evaluate(
    () => Array.from(document.querySelectorAll("header")).find((h) => /SUBSCRIPTION BILL/.test(h.innerText))?.innerText ?? "",
  );
  const body = await page.evaluate(() => document.body.innerText);

  console.log("报告头条:\n" + header + "\n");

  check("xlsx 走通完整链路(未落回失败态)", () => {
    if (!header) throw new Error("未进入报告页");
    if (/无法识别/.test(body)) throw new Error("解析失败");
  });

  check("识别出 2 个订阅(Adobe / Spotify)", () => {
    if (!/2 个订阅/.test(header)) throw new Error("应 2 个订阅\n" + header);
    if (!/Adobe/.test(body) || !/Spotify/.test(body)) throw new Error("缺少 Adobe/Spotify 行");
  });

  check("Excel 序列号时间被正确解析 → 年化 (68+15)×12 = 996", () => {
    const m = header.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m) throw new Error("找不到年度总额\n" + header);
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (v !== 996) throw new Error("应 996(月度周期实测),实得 " + v + " —— 序列号时间可能没解析出来");
  });

  check("收入行未被计入订阅", () => {
    if (/朋[友]?还款/.test(body)) throw new Error("收入行混进了订阅清单");
  });

  check("合计行未被当作交易", () => {
    if (/合计/.test(body.split("CUT")[0] ?? "")) throw new Error("合计行被计入");
  });

  check("头条无 ¥0", () => {
    const z = header.match(/¥0(?!\d)/g);
    if (z) throw new Error(`出现 ${z.length} 处 ¥0\n${header}`);
  });

  await page.screenshot({ path: "C:/Users/Administrator/shot21-report-xlsx.png" });
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
