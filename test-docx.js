// =============================================================
// DOCX 上传回归 —— Word 格式的账单(微信"交易明细证明"转存 .docx)
// 前置:cd frontend && npm run build
//       node SubscriptionScanner/serve-out.js   (另一个终端)
// 运行:node SubscriptionScanner/test-docx.js
//
// 为什么单独测:.docx 是 zip + OOXML,解析链与 csv/xlsx 完全不同;而且真实样本
// 里有两个坑必须钉住(都来自实测文件,不是设想):
//   ① 表头只在第 1 张表出现一次,后面的表不重复 → 列映射必须跨表沿用
//   ② PDF→Word 会在中文词中间塞空格("湖南文理学 院")→ 商户名必须归一化,
//      否则同一个商户被拆成多条,周期规律直接失效
// 这里手搓两个最小合法 docx(有表头 / 无表头)走完整上传链路。
// =============================================================
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const { zipSync, strToU8 } = require("./frontend/node_modules/fflate");

const BASE = "http://localhost:3000";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cell = (t) => `<w:tc><w:p><w:r><w:t>${esc(t)}</w:t></w:r></w:p></w:tc>`;
const row = (cells) => `<w:tr>${cells.map(cell).join("")}</w:tr>`;
const para = (t) => `<w:p><w:r><w:t>${esc(t)}</w:t></w:r></w:p>`;

/** 拼一个最小合法 docx(解析器只读 word/document.xml,另两个文件是为了它真的是个 docx) */
function buildDocx(bodyXml) {
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${bodyXml}</w:body></w:document>`;
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;
  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;
  return Buffer.from(
    zipSync({
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "word/document.xml": strToU8(documentXml),
    }),
  );
}

const HEADER = ["交易单号", "交易时间", "交易类型", "收/支/其他", "交易方式", "金额(元)", "交易对方", "商户单号"];
const tx = (id, time, type, dir, how, amount, name, order) => [id, time, type, dir, how, amount, name, order];

/* 夹具 A:微信形态 —— 有表头 + 收入行 + 其他(零钱提现)+ 中文词中间带空格 */
const DOCX_A = buildDocx(
  para("微信支付交易明细证明") +
    para("币种:人民币/单位:元") +
    `<w:tbl>${row(HEADER)}</w:tbl>` + // 表头单独一张表(真实样本就是这样)
    `<w:tbl>` +
    // ⚠️ 顺序刻意用「新的在前」—— 真实账单导出(含这份交易明细证明)就是这个顺序,
    // 而引擎曾按输入顺序算间隔(负数 → 一笔都认不出)。这条夹具因此同时是顺序回归。
    row(tx("100003", "2026-08-15 10:01:33", "商户消费", "支出", "零钱", "49.00", "Netflix", "2003")) +
    row(tx("100002", "2026-07-15 10:02:11", "商户消费", "支出", "零钱", "49.00", "Netflix", "2002")) +
    // 「其他」行(零钱提现):不是支出,必须被剔除
    row(tx("100005", "2026-07-03 09:00:00", "零钱提现", "其他", "光大银行储蓄卡", "205.11", "光大银行", "2005")) +
    // 收入行:必须被剔除
    row(tx("100004", "2026-07-02 09:00:00", "转账", "收入", "/", "1200.00", "某人转账", "2004")) +
    row(tx("100001", "2026-06-15 10:00:00", "商户消费", "支出", "零钱", "49.00", "Netflix", "2001")) +
    `</w:tbl>` +
    // 第二张表:不重复表头 —— 列映射必须沿用上一张表的
    `<w:tbl>` +
    row(tx("200003", "2026-08-20 12:05:00", "商户消费", "支出", "零钱", "68.00", "湖南文理学 院", "3003")) +
    row(tx("200002", "2026-07-20 12:10:00", "商户消费", "支出", "零钱", "68.00", "湖南文理学 院", "3002")) +
    row(tx("200001", "2026-06-20 12:00:00", "商户消费", "支出", "零钱", "68.00", "湖南文理学 院", "3001")) +
    `</w:tbl>`,
);

/* 夹具 B:没有表头行 —— 走内容启发式兜底(其它平台的 Word 导出形态) */
const DOCX_B = buildDocx(
  para("支付宝交易明细") +
    `<w:tbl>` +
    row(tx("300001", "2026-06-08 08:00:00", "商户消费", "支出", "余额宝", "25.00", "爱奇艺", "4001")) +
    row(tx("300002", "2026-07-08 08:01:00", "商户消费", "支出", "余额宝", "25.00", "爱奇艺", "4002")) +
    row(tx("300003", "2026-08-08 08:02:00", "商户消费", "支出", "余额宝", "25.00", "爱奇艺", "4003")) +
    `</w:tbl>`,
);

(async () => {
  const b = await chromium.launch({ headless: true });
  let bad = 0;

  async function uploadAndRead(buf, filename) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const p2 = `${os.tmpdir()}/${filename}`;
    fs.writeFileSync(p2, buf);
    await p.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
    await p.locator('input[type="file"]').setInputFiles(p2);
    await p.waitForURL(/\/report\?d=/, { timeout: 20000 });
    await p.waitForTimeout(1800);
    const text = await p.evaluate(() => document.body.innerText);
    await p.close();
    return text;
  }

  function check(label, cond, extra = "") {
    console.log(`  ${cond ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
    if (!cond) bad++;
  }

  console.log("\n夹具 A:微信形态(表头 + 收入行 + 其他行 + 中文断行空格)");
  {
    const text = await uploadAndRead(DOCX_A, "trim-test-wechat.docx");
    check("Netflix 被识别出来", /Netflix/.test(text));
    check("跨表沿用表头映射(第二张表的湖南文理学院也进来了)", /湖南文理学院/.test(text));
    check("中文词中间的空格已归一化(没有「湖南文理学 院」)", !/湖南文理学 院/.test(text));
    check("收入行未被当成支出", !/某人转账/.test(text));
    check("「其他」行(零钱提现)被剔除", !/光大银行/.test(text));
    check("年化金额算出来了(49×12=588)", /588/.test(text), text.match(/¥[\d,]+\s*\/\s*YEAR/)?.[0] ?? "");
  }

  console.log("\n夹具 B:无表头(内容启发式兜底)");
  {
    const text = await uploadAndRead(DOCX_B, "trim-test-alipay.docx");
    check("爱奇艺被识别出来", /爱奇艺/.test(text));
    check("年化金额算出来了(25×12=300)", /300/.test(text));
  }

  console.log("\n旧版 .doc(OLE 二进制)必须给明确出路,而不是一句「无法识别」");
  {
    const p = await b.newPage();
    const legacy = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(2048)]);
    const p2 = `${os.tmpdir()}/trim-test-legacy.doc`;
    fs.writeFileSync(p2, legacy);
    await p.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
    await p.locator('input[type="file"]').setInputFiles(p2);
    await p.waitForTimeout(2500);
    const text = await p.evaluate(() => document.body.innerText);
    check("提示「另存为 .docx」而不是笼统失败", /另存为 \.docx/.test(text));
    await p.close();
  }

  await b.close();
  console.log(bad ? `\n${bad} 项未通过` : "\nDOCX 全链路通过");
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
