// 线上 GitHub Pages 最终验收(github.io 慢速 CDN 适配:宽松 timeout)
const { chromium } = require("playwright-core");
const BASE = "https://leilosss.github.io";

(function () {
  globalThis.__PASTE = [
    "微信支付账单明细",
    "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
    "2026-07-10 商户消费", "Netflix 会员", "¥49.00",
    "2026-08-10 商户消费", "Netflix 会员", "¥49.00",
    "2026-06-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
    "2026-07-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
    "2026-08-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  ].join("\n");
})();

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 100)));

  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3500);
  console.log("HOME cta:", await p.locator("text=START TRIMMING").count());

  await p.goto(BASE + "/upload", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate((t) => navigator.clipboard.writeText(t), globalThis.__PASTE);
  await p.keyboard.press("Control+V");
  await p.waitForURL(/report\?d=/, { timeout: 30000 });
  await p.waitForTimeout(2500);
  const txt = await p.locator("body").innerText();
  console.log("PASTE→REPORT:", txt.includes("YOU CAN CUT") ? "OK" : "FAIL");
  console.log("  订阅数:", txt.match(/\d+ 个订阅 · 全部为周期/)?.[0] ?? "(未匹配)");
  const annual = txt.match(/你的订阅账单[\s\S]{0,40}?¥([\d,]+)\s*\/\s*年/);
  console.log("  年化:", annual ? "¥" + annual[1] : "(未匹配)");
  await p.screenshot({ path: "C:/Users/Administrator/gh-pages-final.png", fullPage: true, timeout: 30000 });
  console.log(errs.length ? "ERRORS: " + errs.join(" | ") : "NO-JS-ERRORS");
  await b.close();
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
