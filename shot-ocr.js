// 截图识别 UI 视觉验证(桌面 + 移动端)
// 运行:node SubscriptionScanner/shot-ocr.js
const { chromium } = require("playwright-core");
const OUT = "C:/Users/Administrator";

(async () => {
  const b = await chromium.launch({ headless: false });

  // 桌面
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await d.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await d.waitForTimeout(800);
  await d.screenshot({ path: `${OUT}/shot-ocr-upload-desktop.png` });
  console.log("desktop ok");

  // 移动端(iPhone 尺寸,重点)
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
  await m.waitForTimeout(800);
  await m.screenshot({ path: `${OUT}/shot-ocr-upload-mobile.png` });
  await m.evaluate(() => window.scrollTo(0, 520));
  await m.waitForTimeout(400);
  await m.screenshot({ path: `${OUT}/shot-ocr-upload-mobile2.png` });
  console.log("mobile ok");

  await b.close();
  console.log("截图完成");
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
