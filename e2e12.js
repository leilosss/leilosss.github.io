// v12 E2E:真实剪贴板粘贴 → 本地识别 → 报告 → 去取消 → 复制清单 → 指南
const { chromium } = require("playwright-core");

const WECHAT_TEXT = `微信支付账单明细
------------------------------
2026-06-10 12:01:00 商户消费
爱奇艺科技有限公司
爱奇艺黄金VIP-连续包月
¥22.00

2026-07-10 12:01:00 商户消费
爱奇艺科技有限公司
爱奇艺黄金VIP-连续包月
¥22.00

2026-08-10 12:01:00 商户消费
爱奇艺科技有限公司
爱奇艺黄金VIP-连续包月
¥22.00

2026-06-15 09:30:00 商户消费
网易云音乐商户
网易云音乐黑胶VIP-包月
¥15.00

2026-07-15 09:30:00 商户消费
网易云音乐商户
网易云音乐黑胶VIP-包月
¥15.00

2026-06-20 18:00:00 转账
王小明
转账
¥50.00`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 160)));
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 写剪贴板 + Ctrl+V(原生 paste 事件 → window 监听)
  await page.evaluate((t) => navigator.clipboard.writeText(t), WECHAT_TEXT);
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(1200);
  const scanning = await page.locator("text=正在识别").count();
  console.log("STEP1 scanning:", scanning > 0 ? "OK" : "MISSING");

  await page.waitForURL(/\/report\//, { timeout: 15000 });
  console.log("STEP1 redirect:", "OK →", page.url().slice(-16));
  await page.waitForTimeout(2600);
  console.log("STEP2 slips:", await page.locator("[data-slip-inner]").count());
  const cutTxt = await page.locator("text=已裁").first().textContent();
  console.log("STEP2 auto-cut-all:", cutTxt);

  // 去取消(点台面上的纸条)
  const cancelBtn = page.locator('[data-slip-inner] button:has-text("去取消")').first();
  await cancelBtn.click();
  await page.waitForTimeout(500);
  const notice = await page.locator('[role=status]').textContent();
  console.log("STEP3 cancel-guide:", notice ? "OK" : "MISSING", "|", notice?.slice(0, 30));

  // 复制清单(COPY LIST 章;等印章动画结束)
  await page.locator('button[aria-label="复制取消清单(盖章确认)"]').click();
  await page.waitForTimeout(1000);
  const notice2 = await page.locator('[role=status]').textContent();
  console.log("STEP4 copy-list:", notice2 ? "OK" : "MISSING", "|", notice2?.slice(0, 24));

  // 小票章
  await page.locator('button[aria-label="生成裁剪小票(盖章确认)"]').click();
  await page.waitForTimeout(1200);
  console.log("STEP5 receipt: fired");

  // 指南
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.locator('section[aria-label*="复制账单"] button').first().click();
  await page.waitForTimeout(1000);
  console.log("STEP6 fold-copy:", (await page.locator('section[aria-label*="已展开"]').count()) > 0 ? "OK" : "FAIL");
  console.log(errors.length ? "ERRORS:\n" + errors.slice(0, 5).join("\n") : "NO-JS-ERRORS");
  await b.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
