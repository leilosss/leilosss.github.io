// 价格情报页视觉验证(桌面为主,附移动端与展开态)
// 运行:node SubscriptionScanner/shot-deals.js
const { chromium } = require("playwright-core");
const OUT = "C:/Users/Administrator";

(async () => {
  const b = await chromium.launch({ headless: false });

  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/deals", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);

  await p.screenshot({ path: `${OUT}/deals-1-top.png` });
  await p.evaluate(() => window.scrollTo(0, 620));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/deals-2-table.png` });
  await p.evaluate(() => window.scrollTo(0, 1180));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/deals-3-tip.png` });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/deals-4-foot.png` });

  // 展开第二行(腾讯视频,现在充 → 看趋势 + 渠道)
  await p.evaluate(() => window.scrollTo(0, 700));
  await p.waitForTimeout(300);
  await p.getByText("腾讯视频 VIP", { exact: true }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/deals-5-expanded.png` });

  // 横向溢出检查
  const ov = await p.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("桌面 1440 横滚:", ov.scrollW > ov.clientW ? `溢出 ${ov.scrollW}>${ov.clientW}` : "OK");

  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto("http://localhost:3000/deals", { waitUntil: "networkidle" });
  await m.waitForTimeout(700);
  await m.screenshot({ path: `${OUT}/deals-m1.png` });
  await m.evaluate(() => window.scrollTo(0, 900));
  await m.waitForTimeout(400);
  await m.screenshot({ path: `${OUT}/deals-m2.png` });
  await m.evaluate(() => window.scrollTo(0, 1700));
  await m.waitForTimeout(400);
  await m.screenshot({ path: `${OUT}/deals-m3.png` });
  const ovm = await m.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("移动 390 横滚:", ovm.scrollW > ovm.clientW ? `溢出 ${ovm.scrollW}>${ovm.clientW}` : "OK");

  await b.close();
  console.log("截图完成");
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
