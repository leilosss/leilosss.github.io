// =============================================================
// 粘贴解析回归测试(在真实浏览器里跑 —— 测的就是打包后的线上代码)
// 前置:cd frontend && npm run build && npm run start
// 运行:node SubscriptionScanner/test-paste.js
// =============================================================
const { chromium } = require("playwright-core");

const CASES = [
  {
    name: "日期不被当作金额(v2.0 bug:2026-06-10 → ¥2026)",
    text: [
      "微信支付账单明细",
      "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
      "2026-07-10 商户消费", "Netflix 会员", "¥49.00",
      "2026-08-10 商户消费", "Netflix 会员", "¥49.00",
    ].join("\n"),
    expect: (r) => {
      if (r.count !== 1) throw new Error("应识别 1 个订阅,实得 " + r.count + " → " + r.names.join(" / "));
      if (r.annual !== 588) throw new Error("年化应 588(49×12),实得 " + r.annual);
    },
  },
  {
    name: "两个订阅:金额与年化正确",
    text: [
      "微信支付账单明细",
      "2026-06-10 商户消费", "Netflix 会员", "¥49.00",
      "2026-07-10 商户消费", "Netflix 会员", "¥49.00",
      "2026-08-10 商户消费", "Netflix 会员", "¥49.00",
      "2026-06-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
      "2026-07-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
      "2026-08-15 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
    ].join("\n"),
    expect: (r) => {
      if (r.count !== 2) throw new Error("应识别 2 个订阅,实得 " + r.count + " → " + r.names.join(" / "));
      if (r.annual !== 1404) throw new Error("年化应 1404((49+68)×12),实得 " + r.annual);
    },
  },
  {
    name: "收入/退款行不计入支出",
    text: [
      "2026-06-10 商户消费", "云盘会员", "¥25.00",
      "2026-06-11 转账", "朋友还款", "收入 ¥300.00",
      "2026-07-10 商户消费", "云盘会员", "¥25.00",
      "2026-08-10 商户消费", "云盘会员", "¥25.00",
    ].join("\n"),
    expect: (r) => {
      if (r.annual !== 300) throw new Error("年化应 300(25×12),实得 " + r.annual + " —— 收入行可能被计入");
      if (r.count !== 1) throw new Error("应识别 1 个,实得 " + r.count + " → " + r.names.join(" / "));
    },
  },
  {
    name: "千分位金额(¥1,299.00 年付,2 次可判定)",
    text: [
      "2025-09-10 商户消费", "年度大会员", "¥1,299.00",
      "2026-09-10 商户消费", "年度大会员", "¥1,299.00",
      "2026-07-10 商户消费", "月度服务", "¥68.00",
      "2026-08-10 商户消费", "月度服务", "¥68.00",
      "2026-09-10 商户消费", "月度服务", "¥68.00",
    ].join("\n"),
    expect: (r) => {
      const hit = r.names.some((n) => n.indexOf("年度") >= 0 || n.indexOf("大会员") >= 0);
      if (!hit) throw new Error("千分位年付条目丢失 → " + r.names.join(" / "));
    },
  },
  {
    name: "单笔不误判为订阅(引擎规则:需 ≥2 次或关键词命中)",
    text: [
      "2026-06-10 商户消费", "某次性消费", "¥1,299.00",
      "2026-07-10 商户消费", "月度服务", "¥68.00",
      "2026-08-10 商户消费", "月度服务", "¥68.00",
      "2026-09-10 商户消费", "月度服务", "¥68.00",
    ].join("\n"),
    expect: (r) => {
      if (r.names.some((n) => n.indexOf("某次性") >= 0)) throw new Error("单笔消费被误判为订阅");
      if (r.annual !== 816) throw new Error("年化应 816(68×12),实得 " + r.annual);
    },
  },
];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;

  console.log("粘贴解析回归(真实浏览器):\n");
  for (const c of CASES) {
    try {
      await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.evaluate((t) => navigator.clipboard.writeText(t), c.text);
      await page.keyboard.press("Control+V");
      await page.waitForURL(/\/report\//, { timeout: 15000 });
      await page.waitForTimeout(1500);

      const r = await page.evaluate(() => {
        const t = document.body.innerText;
        const cnt = t.match(/(\d+)\s*个订阅\s*·\s*全部为周期/);
        const annual = t.match(/你的订阅账单[\s\S]{0,40}?¥([\d,]+)\s*\/\s*年/);
        const names = Array.from(document.querySelectorAll("section li")).map(
          (li) => (li.innerText || "").split("\n")[0].trim(),
        ).filter(Boolean);
        return {
          count: cnt ? parseInt(cnt[1], 10) : -1,
          annual: annual ? parseFloat(annual[1].replace(/,/g, "")) : -1,
          names: names,
        };
      });
      c.expect(r);
      pass += 1;
      console.log("  ✓", c.name);
    } catch (e) {
      fail += 1;
      console.log("  ✗", c.name, "\n      →", e.message);
    }
  }
  await b.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
