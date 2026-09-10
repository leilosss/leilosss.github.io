// 视觉验证截图(v2.1):首页 / Demo 报告 / 真实报告(单月账单)
// 运行:node SubscriptionScanner/shot21.js
const { chromium } = require("playwright-core");
const fs = require("fs");

const OUT = "C:/Users/Administrator";
const ONE_MONTH = [
  "微信支付账单明细",
  "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
  "2026-06-12 商户消费", "Spotify Premium 订阅", "¥15.00",
  "2026-06-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  "2026-06-18 商户消费", "超市购物", "¥120.50",
].join("\n");

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1) 首页
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot21-home-hero.png` });
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.1));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/shot21-home-story.png` });
  console.log("home ok");

  // 2) Demo 报告
  await page.goto("http://localhost:3000/report?d=demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/shot21-report-demo.png` });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/shot21-report-demo-rows.png` });
  console.log("demo ok");

  // 3) 真实报告(单月账单 —— 原 ¥0 bug 场景)
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.evaluate((t) => navigator.clipboard.writeText(t), ONE_MONTH);
  await page.keyboard.press("Control+V");
  await page.waitForURL(/\/report\?d=/, { timeout: 15000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/shot21-report-real.png` });
  console.log("real ok");

  // 4) 上传页
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/shot21-upload.png` });
  console.log("upload ok");

  await b.close();
  console.log("截图完成 →", OUT);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
