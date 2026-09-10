// =============================================================
// 报告口径回归 —— 防止 ¥0 / YEAR 再次出现,并锁死 Demo 承诺值。
// 前置:cd frontend && npm run build
//       node SubscriptionScanner/serve-out.js   (另一个终端)
// 运行:node SubscriptionScanner/test-report-math.js
//
// 姊妹用例:test-paste.js(解析准确性)· test-xlsx.js(Excel 序列号时间)
//          test-upload-flow.js(三入口 + 移动端无横滚 的整站验收)
//
// 背景:真实账单常常只有一个月的跨度,识别出的订阅每条只出现一次,
// 此时「实测周期」不存在,旧代码让 annual_amount = null → 各处 ?? 0 →
// 报告头条显示 ¥3,936/YEAR 的位置变成 ¥0/YEAR(v2.0 的真 bug)。
// =============================================================
const { chromium } = require("playwright-core");

const ONE_MONTH = [
  "微信支付账单明细",
  "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
  "2026-06-12 商户消费", "Spotify Premium 订阅", "¥15.00",
  "2026-06-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  "2026-06-18 商户消费", "超市购物", "¥120.50",
].join("\n");

/** 报告头条所在的 <header>(页面上唯一含 SUBSCRIPTION BILL 的那个) */
const HEADER_TEXT = () => {
  const h = Array.from(document.querySelectorAll("header")).find((x) => /SUBSCRIPTION BILL/.test(x.innerText));
  return h ? h.innerText : "";
};

const num = (s) => parseFloat(String(s || "").replace(/[¥,\s]/g, ""));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
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

  /* ---------- A. 一个月账单:头条不得为 ¥0 ---------- */
  console.log("粘贴解析(单月账单 · 每条只出现一次):\n");
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate((t) => navigator.clipboard.writeText(t), ONE_MONTH);
  await page.keyboard.press("Control+V");
  await page.waitForURL(/\/report\?d=/, { timeout: 15000 });
  await page.waitForTimeout(2000);

  const header = await page.evaluate(HEADER_TEXT);
  const body = await page.evaluate(() => document.body.innerText);

  check("头条没有 ¥0", () => {
    const z = header.match(/¥0(?!\d)/g);
    if (z) throw new Error(`头条出现 ${z.length} 处 ¥0:\n${header}`);
  });

  check("YEARLY SPEND > 0", () => {
    const m = header.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m) throw new Error("找不到 YEARLY SPEND 金额\n" + header);
    const v = num(m[1]);
    if (v <= 0) throw new Error("YEARLY SPEND 为 " + v);
    if (v !== 1584) throw new Error("年化应为 (49+15+68)×12 = 1584,实得 " + v);
  });

  check("YOU CAN CUT > 0", () => {
    const m = header.match(/YOU CAN CUT[\s\S]{0,40}?¥([\d,]+)\s*\/\s*YEAR/);
    if (!m) throw new Error("找不到 YOU CAN CUT 金额\n" + header);
    if (num(m[1]) <= 0) throw new Error("可裁金额为 0 —— ¥0 bug 复现");
  });

  check("推算口径如实标注(不做虚假断言)", () => {
    if (!/按 12 期估算/.test(header)) throw new Error("缺少「按 12 期估算」标注\n" + header);
  });

  check("全页不出现「¥0 / YEAR」或「¥0 / 年」", () => {
    const m = body.match(/¥0(?!\d)\s*\/\s*(YEAR|年)/g);
    if (m) throw new Error(`出现 ${m.length} 处:${m.join("、")}`);
  });

  check("周期未确认时单价后缀是「期」不是「周」", () => {
    const m = body.match(/¥\d+\/(周|月|季|年|期)/g) || [];
    const bad = m.filter((x) => x.endsWith("/周"));
    if (bad.length) throw new Error("出现错误后缀 " + bad.join("、") + "(「周期待确认」取首字导致的旧 bug)");
  });

  /* ---------- B. Demo 承诺值 ---------- */
  console.log("\nDemo(Try Demo 直达报告):\n");
  await page.goto("http://localhost:3000/report?d=demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const demoHeader = await page.evaluate(HEADER_TEXT);

  check("Demo 头条 = 8 个订阅 · ¥3,936 / YEAR", () => {
    if (!/8 个订阅/.test(demoHeader)) throw new Error("订阅数不是 8\n" + demoHeader);
    const m = demoHeader.match(/¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) !== 3936) throw new Error("应 3936,实得 " + (m ? m[1] : "无"));
  });

  check("Demo YOU CAN CUT = ¥1,836 / YEAR(3 项)", () => {
    const m = demoHeader.match(/YOU CAN CUT[\s\S]{0,40}?¥([\d,]+)\s*\/\s*YEAR/);
    if (!m || num(m[1]) !== 1836) throw new Error("应 1836,实得 " + (m ? m[1] : "无"));
    if (!/裁掉 3 个订阅/.test(demoHeader)) throw new Error("可裁项数不是 3\n" + demoHeader);
  });

  check("Demo 无 ¥0", () => {
    const z = demoHeader.match(/¥0(?!\d)/g);
    if (z) throw new Error(`头条出现 ${z.length} 处 ¥0:\n${demoHeader}`);
  });

  /* ---------- C. 首页与报告同源 ---------- */
  console.log("\n首页叙事与报告一致性:\n");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  // 首页数字由 IntersectionObserver 触发的计数动画驱动 —— 必须滚过各节才会显形
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
  });
  await page.waitForTimeout(1600);
  const home = await page.evaluate(() => document.body.innerText);

  check("首页出现 ¥3,936(年度累加)", () => {
    if (!/3,936/.test(home)) throw new Error("首页未出现 3,936 —— 首页与报告口径可能已分叉");
  });
  check("首页 CUT 金额 = 1,836", () => {
    if (!/1,836/.test(home)) throw new Error("首页未出现 1,836");
  });

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
