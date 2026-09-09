// v11 E2E 冒烟:上传真实解析 → 跳报告 → 剪刀切换 → 指南折面展开
const { chromium } = require("playwright-core");

const CSV = `交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-06-10 12:01:00,商户消费,爱奇艺科技有限公司,爱奇艺黄金VIP-连续包月,支出,22.00,余额宝,支付成功,TS1001,MS2001,
2026-07-10 12:00:30,商户消费,爱奇艺科技有限公司,爱奇艺黄金VIP-连续包月,支出,22.00,余额宝,支付成功,TS1002,MS2001,
2026-08-10 12:02:10,商户消费,爱奇艺科技有限公司,爱奇艺黄金VIP-连续包月,支出,22.00,余额宝,支付成功,TS1003,MS2001,
2026-06-15 09:30:00,商户消费,腾讯视频商户,腾讯视频VIP-自动续费,支出,25.00,余额宝,支付成功,TS1004,MS2002,
2026-07-15 09:31:00,商户消费,腾讯视频商户,腾讯视频VIP-自动续费,支出,25.00,余额宝,支付成功,TS1005,MS2002,
2026-08-15 09:29:00,商户消费,腾讯视频商户,腾讯视频VIP-自动续费,支出,25.00,余额宝,支付成功,TS1006,MS2002,
2026-06-20 18:00:00,商户消费,哈啰出行,共享单车骑行,支出,1.50,余额宝,支付成功,TS1007,MS2003,
`;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  /* 本地无后端:mock /api/parse 与 /api/detect(契约与 lib/types.ts 一致) */
  const REPORT = {
    ok: true,
    generated_at: new Date().toISOString(),
    summary: { tx_count: 7, out_total: 104.5, in_total: 0, date_start: "2026-06-10", date_end: "2026-08-20", sub_count: 3, annual_total: 630.0 },
    subscriptions: [
      { id: 1, name: "爱奇艺黄金VIP-连续包月", merchant: "爱奇艺科技有限公司", source: "keyword", period: "monthly", amount: 22.0, annual_amount: 264.0, occurrences: 3, first_at: "2026-06-10", last_at: "2026-08-10", median_gap_days: 30, confidence: "high", category: "视频会员", sample_text: "爱奇艺黄金VIP-连续包月" },
      { id: 2, name: "腾讯视频VIP-自动续费", merchant: "腾讯视频商户", source: "keyword", period: "monthly", amount: 25.0, annual_amount: 300.0, occurrences: 3, first_at: "2026-06-15", last_at: "2026-08-15", median_gap_days: 30, confidence: "high", category: "视频会员", sample_text: "腾讯视频VIP-自动续费" },
      { id: 3, name: "共享单车骑行", merchant: "哈啰出行", source: "periodic", period: "unknown", amount: 1.5, annual_amount: null, occurrences: 1, first_at: "2026-06-20", last_at: "2026-06-20", median_gap_days: null, confidence: "low", category: "出行", sample_text: "共享单车骑行" },
    ],
    months: [{ month: "2026-06", out: 48.5, sub: 47.0 }, { month: "2026-07", out: 47.0, sub: 47.0 }],
    categories: [{ category: "视频会员", annual: 564.0, count: 2 }],
  };
  await page.route("**/api/parse/**", (r) => r.fulfill({ json: { ok: true, rows: [{ amount: 22.0, name: "爱奇艺黄金VIP-连续包月", last_at: "2026-08-10" }] } }));
  await page.route("**/api/detect", (r) => r.fulfill({ json: REPORT }));

  // ---------- 1. 上传 → 解析 → 自动跳转 ----------
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  const tmp = require("os").tmpdir();
  require("fs").writeFileSync(tmp + "/bill.csv", CSV);
  await page.setInputFiles("input[type=file]", tmp + "/bill.csv");
  await page.waitForTimeout(1500);
  const parsingTxt = await page.locator("text=正在识别").count();
  console.log("STEP1 parsing-text:", parsingTxt > 0 ? "OK" : "MISSING");
  // 等待自动跳转(8s 内)
  await page.waitForURL(/\/report\//, { timeout: 15000 });
  console.log("STEP1 auto-redirect:", page.url());

  // ---------- 2. 报告:纸条存在 + 剪刀切换 ----------
  await page.waitForTimeout(2600); // 纸条落位
  const slips = await page.locator("[data-slip-inner]").count();
  console.log("STEP2 slips:", slips);
  const cutBefore = await page.locator("text=已裁").first().textContent();
  await page.locator("[data-slip-inner] button[aria-label]").first().click();
  await page.waitForTimeout(900);
  const cutAfter = await page.locator("text=已裁").first().textContent();
  console.log("STEP2 cut:", cutBefore, "→", cutAfter, cutBefore !== cutAfter ? "CHANGED" : "SAME!");
  await page.screenshot({ path: "C:/Users/Administrator/shot-v11-report-after.png" });

  // ---------- 3. 指南:折面展开 ----------
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.locator('section[aria-label*="常见问题"] button').first().click();
  await page.waitForTimeout(1000);
  const expanded = await page.locator('section[aria-label*="已展开"]').count();
  console.log("STEP3 fold-expanded:", expanded > 0 ? "OK" : "FAIL");

  console.log(errors.length ? "ERRORS:\n" + errors.slice(0, 6).join("\n") : "NO-JS-ERRORS");
  await b.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
