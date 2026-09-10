// 首页长页视觉验证(桌面逐屏 + 移动端 + 横滚检查)
// 运行:node SubscriptionScanner/shot-home.js
const { chromium } = require("playwright-core");
const OUT = "C:/Users/Administrator";

(async () => {
  const b = await chromium.launch({ headless: false });

  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(900);

  await p.screenshot({ path: `${OUT}/home-1-hero.png` });
  for (const [i, id] of ["s01", "s02", "s03", "s04", "s05", "s06"].entries()) {
    await p.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
    }, id);
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `${OUT}/home-${i + 2}-${id}.png` });
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/home-8-foot.png` });

  const dv = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  console.log("桌面 1440 横滚:", dv.s > dv.c ? `溢出 ${dv.s}>${dv.c}` : "OK");

  for (const w of [375, 390, 430]) {
    const m = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await m.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await m.waitForTimeout(700);
    const o = await m.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    console.log(`移动 ${w} 横滚:`, o.s > o.c ? `溢出 ${o.s}>${o.c}` : "OK");
    if (w === 390) {
      await m.screenshot({ path: `${OUT}/home-m1-hero.png` });
      await m.evaluate(() => {
        const el = document.getElementById("s03");
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60);
      });
      await m.waitForTimeout(500);
      await m.screenshot({ path: `${OUT}/home-m2-s03.png` });
    }
    await m.close();
  }

  await b.close();
  console.log("截图完成");
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
