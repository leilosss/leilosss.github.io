// =============================================================
// 截图识别 端到端 —— 真实浏览器里跑完整链路:
//   生成一张仿微信账单长图 → 上传 → 本地 OCR → 交易数组 → 订阅识别 → Report
//
// 前置:cd frontend && npm run build
//       node SubscriptionScanner/serve-out.js      (另一个终端)
// 运行:node SubscriptionScanner/test-ocr-e2e.js
//       node SubscriptionScanner/test-ocr-e2e.js https://leilosss.github.io   (验线上)
//
// ⚠ 必须用有头模式:PaddleOCR 用 WebGL 推理,headless 里拿不到可用的 GL 上下文。
// =============================================================
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:3000";
const LIVE = !BASE.includes("localhost");
const OUT_PNG = path.join(os.tmpdir(), "trim-bill-shot.png");

/** 九笔扣费,三个订阅各三次(与 test-ocr-parse 的样例同源) */
const ROWS = [
  ["Netflix", "Netflix 会员 自动续费", "支出 ¥49.00", "2026-06-10 12:00:00"],
  ["Netflix", "Netflix 会员 自动续费", "支出 ¥49.00", "2026-07-10 12:01:11"],
  ["Netflix", "Netflix 会员 自动续费", "支出 ¥49.00", "2026-08-10 12:02:22"],
  ["Spotify", "Spotify Premium 订阅", "支出 ¥15.00", "2026-06-15 09:30:00"],
  ["Spotify", "Spotify Premium 订阅", "支出 ¥15.00", "2026-07-15 09:31:00"],
  ["Spotify", "Spotify Premium 订阅", "支出 ¥15.00", "2026-08-15 09:32:00"],
  ["Adobe", "Adobe 创意应用 自动续费", "支出 ¥68.00", "2026-06-20 20:10:00"],
  ["Adobe", "Adobe 创意应用 自动续费", "支出 ¥68.00", "2026-07-20 20:11:00"],
  ["Adobe", "Adobe 创意应用 自动续费", "支出 ¥68.00", "2026-08-20 20:12:00"],
];

/** 在浏览器里画一张仿微信账单长图并落盘(1080 宽;行数多时会触发切片) */
async function makeScreenshot(browser, rows, outPath) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1200 } });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const dataUrl = await page.evaluate((rows) => {
    const W = 1080;
    const rowH = 220;
    const H = 160 + rows.length * rowH + 80;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#111111";
    g.font = "bold 46px 'Microsoft YaHei', sans-serif";
    g.fillText("账单明细", 50, 100);
    g.strokeStyle = "#dddddd";
    g.beginPath(); g.moveTo(0, 140); g.lineTo(W, 140); g.stroke();
    let y = 200;
    for (const [, item, amt, time] of rows) {
      g.fillStyle = "#111111";
      g.font = "bold 40px 'Microsoft YaHei', sans-serif";
      g.fillText(item, 50, y);
      g.textAlign = "right";
      g.fillText(amt, W - 50, y);
      g.textAlign = "left";
      g.fillStyle = "#888888";
      g.font = "32px 'Microsoft YaHei', sans-serif";
      g.fillText(time, 50, y + 52);
      g.strokeStyle = "#eeeeee";
      g.beginPath(); g.moveTo(0, y + 100); g.lineTo(W, y + 100); g.stroke();
      y += rowH;
    }
    return c.toDataURL("image/png");
  }, rows);
  fs.writeFileSync(outPath, Buffer.from(dataUrl.split(",")[1], "base64"));
  await page.close();
  return outPath;
}

(async () => {
  // 有头模式(WebGL)
  const b = await chromium.launch({ headless: false });
  console.log("生成账单长图…");
  await makeScreenshot(b, ROWS, OUT_PNG);
  console.log("  →", OUT_PNG, fs.statSync(OUT_PNG).size, "bytes\n");

  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;
  const check = (n, fn) => {
    try {
      fn();
      pass += 1;
      console.log("  ✓", n);
    } catch (e) {
      fail += 1;
      console.log("  ✗", n, "\n      →", e.message);
    }
  };

  /* 记录所有请求,验证"图片不出浏览器" */
  const uploads = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") uploads.push(`${r.method()} ${r.url()}`);
  });
  const thirdParty = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(BASE) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) thirdParty.push(r.url());
  });

  await page.goto(BASE + "/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const idle = await page.evaluate(() => document.body.innerText);
  check("页面写明支付宝/微信截图路径", () => {
    if (!/我的 → 账单 → 选择月份 → 截长图/.test(idle)) throw new Error("缺少支付宝截图路径");
    if (!/我 → 服务 → 钱包 → 账单 → 截长图/.test(idle)) throw new Error("缺少微信截图路径");
  });
  check("文案承诺图片不出本机", () => {
    if (!/截图在本机识别,图片不会上传/.test(idle)) throw new Error("缺少隐私说明");
  });

  console.log("\n上传截图并本地识别(首次需下载模型,请稍候)…\n");
  const t0 = Date.now();
  await page.locator('input[type="file"]').setInputFiles(OUT_PNG);
  await page.waitForURL(/report\?d=/, { timeout: 240000 }); // 模型 11MB + 切片识别
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  await page.waitForTimeout(2000);

  const header = await page.evaluate(
    () => Array.from(document.querySelectorAll("header")).find((h) => /SUBSCRIPTION BILL/.test(h.innerText))?.innerText ?? "",
  );
  console.log(`识别 + 分析耗时 ${elapsed}s\n报告头条:\n${header}\n`);

  check("截图 → 报告 全链路走通", () => {
    if (!header) throw new Error("没有跳到报告页");
  });
  check("识别出 3 个订阅(Netflix / Spotify / Adobe)", () => {
    if (!/3 个订阅/.test(header)) throw new Error("订阅数不对\n" + header);
  });
  check("年化 = (49+15+68)×12 = ¥1,584", () => {
    const m = header.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || parseFloat(m[1].replace(/,/g, "")) !== 1584) throw new Error("实得 " + (m ? m[1] : "无") + "\n" + header);
  });
  check("头条无 ¥0", () => {
    const z = header.match(/¥0(?!\d)/g);
    if (z) throw new Error(`出现 ${z.length} 处 ¥0`);
  });
  check("图片未以任何方式上传(无 POST/PUT 请求)", () => {
    if (uploads.length) throw new Error("出现了非 GET 请求:\n" + uploads.join("\n"));
  });
  check("OCR 未请求任何第三方域名", () => {
    if (thirdParty.length) throw new Error("第三方请求:\n" + thirdParty.join("\n"));
  });

  await page.screenshot({ path: LIVE ? "C:/Users/Administrator/shot-ocr-report-live.png" : "C:/Users/Administrator/shot-ocr-report.png" });

  /* ---------- 多选:分段截图一起上传(也是 OCR 失败时的推荐出路) ---------- */
  console.log("\n多选分段截图(每个订阅拆在两张图里,验证跨图合并)…\n");
  const P1 = path.join(os.tmpdir(), "trim-bill-p1.png");
  const P2 = path.join(os.tmpdir(), "trim-bill-p2.png");
  // 第 1 张:每个订阅的前两笔;第 2 张:每个订阅的第三笔
  await makeScreenshot(b, [ROWS[0], ROWS[1], ROWS[3], ROWS[4], ROWS[6], ROWS[7]], P1);
  await makeScreenshot(b, [ROWS[2], ROWS[5], ROWS[8]], P2);

  const page2 = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page2.goto(BASE + "/upload", { waitUntil: "networkidle" });
  await page2.waitForTimeout(600);
  await page2.locator('input[type="file"]').setInputFiles([P1, P2]);
  await page2.waitForURL(/report\?d=/, { timeout: 240000 });
  await page2.waitForTimeout(2000);
  const h2 = await page2.evaluate(
    () => Array.from(document.querySelectorAll("header")).find((h) => /SUBSCRIPTION BILL/.test(h.innerText))?.innerText ?? "",
  );
  console.log("合并后头条:\n" + h2 + "\n");

  check("两张截图合并成同一份报告(3 个订阅)", () => {
    if (!/3 个订阅/.test(h2)) throw new Error("订阅数不对 —— 跨图没有正确合并\n" + h2);
  });
  check("跨图合并后年化仍是 ¥1,584(周期规律没被截断)", () => {
    const m = h2.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || parseFloat(m[1].replace(/,/g, "")) !== 1584) throw new Error("实得 " + (m ? m[1] : "无") + "\n" + h2);
  });

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
