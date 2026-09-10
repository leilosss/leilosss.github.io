// =============================================================
// 线上验证:v2.3 ¥0 修复是否真的跑在公网(leilosss.github.io)
// 直接对线上做「单月账单粘贴」→ 检查报告头条不出现 ¥0
// 运行:node SubscriptionScanner/verify-live-zerofix.js
// =============================================================
const { chromium } = require("playwright-core");
const BASE = "https://leilosss.github.io";

const ONE_MONTH = [
  "微信支付账单明细",
  "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
  "2026-06-12 商户消费", "Spotify Premium 订阅", "¥15.00",
  "2026-06-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  "2026-06-18 商户消费", "超市购物", "¥120.50",
].join("\n");

const num = (s) => parseFloat(String(s || "").replace(/[¥,\s]/g, ""));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1440, height: 900 } });
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

  /* ---- 线上 Demo 报告 ---- */
  console.log("线上 Demo(首页 TRY DEMO):\n");
  await page.goto(`${BASE}/report?d=demo`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const demo = await page.evaluate(
    () => Array.from(document.querySelectorAll("header")).find((h) => /SUBSCRIPTION BILL/.test(h.innerText))?.innerText ?? "",
  );
  check("Demo 8 个订阅 · ¥3,936 / YEAR", () => {
    if (!/8 个订阅/.test(demo)) throw new Error("订阅数不对\n" + demo);
    const m = demo.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) !== 3936) throw new Error("应 3936,实得 " + (m ? m[1] : "无"));
  });
  check("Demo YOU CAN CUT ¥1,836 / YEAR(3 项)", () => {
    const m = demo.match(/YOU CAN CUT[\s\S]{0,40}?¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) !== 1836) throw new Error("应 1836,实得 " + (m ? m[1] : "无"));
    if (!/裁掉 3 个订阅/.test(demo)) throw new Error("可裁项数不对");
  });

  /* ---- 线上真实粘贴(原 ¥0 bug 场景) ---- */
  console.log("\n线上单月账单粘贴(原 ¥0 bug 场景):\n");
  await page.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate((t) => navigator.clipboard.writeText(t), ONE_MONTH);
  await page.keyboard.press("Control+V");
  await page.waitForURL(/\/report\?d=/, { timeout: 25000 });
  await page.waitForTimeout(2500);

  const header = await page.evaluate(
    () => Array.from(document.querySelectorAll("header")).find((h) => /SUBSCRIPTION BILL/.test(h.innerText))?.innerText ?? "",
  );
  const body = await page.evaluate(() => document.body.innerText);
  console.log(header + "\n");

  check("线上头条无 ¥0", () => {
    const z = header.match(/¥0(?!\d)/g);
    if (z) throw new Error(`出现 ${z.length} 处 ¥0`);
  });
  check("线上 YEARLY SPEND = ¥1,584 / YEAR", () => {
    const m = header.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) !== 1584) throw new Error("应 1584,实得 " + (m ? m[1] : "无"));
  });
  check("线上 YOU CAN CUT > 0", () => {
    const m = header.match(/YOU CAN CUT[\s\S]{0,40}?¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) <= 0) throw new Error("可裁金额为 0 —— ¥0 bug 仍在线上");
  });
  check("全页无「¥0 / YEAR」", () => {
    const m = body.match(/¥0(?!\d)\s*\/\s*(YEAR|年)/g);
    if (m) throw new Error("出现 " + m.join("、"));
  });

  await page.screenshot({ path: "C:/Users/Administrator/shot21-live-report.png" });
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
