// 首页 v2.7 视觉验证(桌面逐屏 + 矮屏首屏 + 移动端 + 横滚检查)
// 运行:node serve-out.js & node SubscriptionScanner/shot27.js
const { chromium } = require("playwright-core");
const OUT = "C:/Users/Administrator/v27";
const BASE = process.argv[2] || "http://localhost:3000";

(async () => {
  const b = await chromium.launch({ headless: true });

  // ---------- 桌面 1440×900:逐屏 ----------
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}-1-hero.png` });

  for (const [i, id] of ["s01", "s02", "s03", "s04", "s05", "s06"].entries()) {
    await p.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 58);
    }, id);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}-${i + 2}-${id}.png` });
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}-9-foot.png` });

  const dv = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  console.log("桌面 1440 横滚:", dv.s > dv.c ? `溢出 ${dv.s}>${dv.c}` : "OK");
  const h = await p.evaluate(() => document.body.scrollHeight);
  console.log("页面总高:", h, "px");
  await p.close();

  // ---------- 矮屏 1366×768:CTA 与面板是否都在首屏 ----------
  const s = await b.newPage({ viewport: { width: 1366, height: 768 } });
  await s.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await s.waitForTimeout(1200);
  await s.screenshot({ path: `${OUT}-0-hero-1366.png` });
  const first = await s.evaluate(() => {
    const cta = [...document.querySelectorAll("a")].find((a) => a.textContent.trim() === "开始分析账单");
    const panel = document.querySelector("#top main section .relative.border");
    const r = cta?.getBoundingClientRect();
    const pr = panel?.getBoundingClientRect();
    return { ctaBottom: Math.round(r?.bottom ?? -1), panelBottom: Math.round(pr?.bottom ?? -1), vh: window.innerHeight };
  });
  console.log("1366×768 CTA 底部:", first.ctaBottom, "/ 面板底部:", first.panelBottom, "/ 视口高:", first.vh);
  await s.close();

  // ---------- 移动端 ----------
  for (const w of [375, 390, 430]) {
    const m = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await m.waitForTimeout(900);
    const o = await m.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    // 固定报头自身是否横滚(报头内部 overflow-x-auto 不算问题,页面级才算)
    console.log(`移动 ${w} 页面横滚:`, o.s > o.c ? `溢出 ${o.s}>${o.c}` : "OK");
    if (w === 390) {
      await m.screenshot({ path: `${OUT}-m1-hero.png` });
      await m.evaluate(() => {
        const el = document.getElementById("s03");
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 58);
      });
      await m.waitForTimeout(600);
      await m.screenshot({ path: `${OUT}-m2-s03.png` });
    }
    await m.close();
  }

  await b.close();
  console.log("截图完成 →", OUT);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
