// v10 首页截图(1920 对开 / 1280 单页回退)
const { chromium } = require("playwright-core");

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v10-hero.png" });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.3, behavior: "instant" }));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v10-mid.png" });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v10-bottom.png" });

  const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p2.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await p2.waitForTimeout(2500);
  await p2.screenshot({ path: "C:/Users/Administrator/shot-v10-1280.png" });
  await b.close();
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
