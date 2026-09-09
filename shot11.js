// v11 三个内页截图:upload 待上传态/guide 三折态/report demo 分拣台
const { chromium } = require("playwright-core");

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. upload idle
  await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v11-upload.png" });

  // 2. guide(默认三折)
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v11-guide.png" });

  // 2b. guide A 折展开
  await page.click('section[aria-label="A — 导出账单(点击展开)"]');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v11-guide-open.png" });

  // 3. report demo(等纸条拖到位置)
  await page.goto("http://localhost:3000/report/demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "C:/Users/Administrator/shot-v11-report.png" });

  await b.close();
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
