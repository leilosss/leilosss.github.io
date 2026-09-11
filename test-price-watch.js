// =============================================================
// 价格监控回归 —— 这套东西最容易变成"看起来在监控"的空壳,所以必须端到端验:
//   A. 五种信号在 Pro 页上都真的渲染出来(走的是真实判定逻辑,只是数据是示例)
//   B. 导入两份单价不同的账单 → 报告页/体检页真的比出涨价(真数据、真链路)
//   C. 诚实红线:页面上不允许出现本机做不到的宣称(官方校验/实时监控/已验证)
// 前置:cd frontend && npm run build
//       node SubscriptionScanner/serve-out.js
// 运行:node SubscriptionScanner/test-price-watch.js
// =============================================================
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");

const BASE = "http://localhost:3000";

/** 同一家 Netflix,两份账单单价不同(49 → 58),用来验真实比对 */
const bill = (price, dates) =>
  [
    "微信支付账单明细",
    ...dates.flatMap((d) => [`${d} 商户消费`, "Netflix 会员", `¥${price}.00`]),
  ].join("\n");

const BILL_A = bill("49", ["2026-06-10", "2026-07-10", "2026-08-10"]);
const BILL_B = bill("58", ["2026-09-10", "2026-10-10", "2026-11-10"]);

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  let bad = 0;
  const check = (label, cond, extra = "") => {
    console.log(`  ${cond ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
    if (!cond) bad++;
  };

  /* ---------- A. Pro 页:五种信号 + 诚实红线 ---------- */
  console.log("\nA. Pro 页(/pricing)");
  await p.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  const pro = await p.evaluate(() => document.body.innerText);

  check("价值主张是「不再被涨价偷袭」", /Never get surprised by[\s\S]{0,40}subscription price again/.test(pro));
  check("主 CTA 是开启价格监控", /开启价格监控/.test(pro));
  check("Netflix 示例卡:¥58 → ¥65", /¥58[\s\S]{0,30}¥65/.test(pro));
  check("涨跌幅 +12.1%", /\+12\.1%/.test(pro));
  check("一年多花 ¥84", /一年多花\s*¥84/.test(pro));
  check("四种变化都有:涨价/降价/套餐变化/优惠结束",
    ["PRICE INCREASED", "PRICE DECREASED", "PLAN CHANGED", "PROMO ENDED"].every((k) => pro.includes(k)));
  check("无法验证时显示 PRICE UNVERIFIED(不猜)", pro.includes("PRICE UNVERIFIED"));
  check("示例数据带「示例」标记", (pro.match(/示例/g) || []).length >= 3);
  check("KEEP / REVIEW / CUT 建议规则公开", ["KEEP", "REVIEW", "CUT"].every((k) => pro.includes(k)));
  check("四步管线 + 进度如实标注", /已实现 · 本机/.test(pro) && /内测中/.test(pro));

  // 诚实红线:本机做不到的说法不许出现(**否定句中提到不算** —— 页面本身在解释"我们不写这种话")
  const forbidden = ["Verified from official source", "实时监控", "实时看价", "官方校验", "官方认证", "已核验官方价格", "已同步官方价格"];
  const negations = /不|没|无|未|禁止|避免/;
  const badCtx = [];
  for (const phrase of forbidden) {
    let i = 0;
    while ((i = pro.indexOf(phrase, i)) >= 0) {
      const before = pro.slice(Math.max(0, i - 16), i);
      if (!negations.test(before)) badCtx.push(`${phrase} ← …${before.replace(/\n/g, " ")}`);
      i += phrase.length;
    }
  }
  check("没有出现本机做不到的宣称(否定语境除外)", badCtx.length === 0, badCtx.join(" / "));
  const badClaimLine = /Last checked:\s*Today/i.test(pro);
  check("没有「Last checked: Today」这类假时间戳", !badClaimLine);

  /* ---------- B. 真实链路:两次导入比出涨价 ---------- */
  console.log("\nB. 真实链路(导入两份单价不同的账单)");

  async function uploadText(text, name) {
    const path = `${os.tmpdir()}/${name}`;
    fs.writeFileSync(path, text, "utf8");
    await p.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
    await p.locator('input[type="file"]').setInputFiles(path);
    await p.waitForURL(/\/report\?d=/, { timeout: 20000 });
    await p.waitForTimeout(1500);
  }

  await uploadText(BILL_A, "trim-price-a.txt");
  const afterA = await p.evaluate(() => document.body.innerText);
  check("第一次导入:报告页不出现价格变动(只有一条记录)", !/价格变动/.test(afterA));

  await uploadText(BILL_B, "trim-price-b.txt");
  const afterB = await p.evaluate(() => document.body.innerText);
  check("第二次导入:报告页出现价格监控结论带", /PRICE WATCH · 本机价格监控/.test(afterB));
  check("比出 1 项价格变动", /1 项价格变动/.test(afterB));
  check("涨价金额换算到年(¥9/月 → 一年多花 ¥108)", /一年多花\s*¥108/.test(afterB), afterB.match(/一年多花[^。]{0,20}/)?.[0] ?? "");

  // 体检页应出现完整卡片
  await p.goto(`${BASE}/annual`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const annual = await p.evaluate(() => document.body.innerText);
  check("体检页出现真实监控卡片", /YOUR PRICE WATCH|Price|Netflix/.test(annual) && /Netflix/.test(annual));
  check("卡片标出涨价幅度 +18.4%", /\+18\.4%/.test(annual));
  check("来源行写的是「你的账单记录」", /来源:你的账单记录/.test(annual));
  check("体检页不再宣称「自动比对单价变化」的空话", !/会自动比对单价变化/.test(annual));

  /* ---------- C. 记录持久化 + 报告页出口 ---------- */
  console.log("\nC. 持久化与出口");
  await p.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const pro2 = await p.evaluate(() => document.body.innerText);
  check("Pro 页显示你本机的真实记录(不只是示例)", /YOUR PRICE WATCH · 你本机的价格记录/.test(pro2));
  check("真实记录与示例数据同时存在且可区分", pro2.includes("YOUR PRICE WATCH · 你本机的价格记录") && /示例数据/.test(pro2));

  const proExit = await p.evaluate(async () => {
    const r = await fetch(location.origin + "/report?d=demo");
    return r.status;
  });
  check("示例报告仍可访问(未破坏既有功能)", proExit === 200);

  await b.close();
  console.log(bad ? `\n${bad} 项未通过` : "\n价格监控全链路通过");
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
