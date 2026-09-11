// v2.7 动效断言:演示台扫描线真的在跑 + reduce 下全部落终态
const { chromium } = require("playwright-core");
const BASE = process.argv[2] || "http://localhost:3000";

(async () => {
  const b = await chromium.launch({ headless: true });
  let bad = 0;

  // ---------- 1. 正常模式:扫到 02 时截一张「正在扫」的图 + 读动画名 ----------
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.evaluate(() => {
      const el = document.getElementById("s02");
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 58);
    });
    await p.waitForTimeout(700); // 扫描线 0.2s 起跑,1.5s 走完
    const st = await p.evaluate(() => {
      const s = document.querySelector(".demo-scan");
      if (!s) return { found: false };
      const cs = getComputedStyle(s);
      const r = s.getBoundingClientRect();
      return { found: true, name: cs.animationName, dur: cs.animationDuration, opacity: cs.opacity, y: Math.round(r.top) };
    });
    await p.screenshot({ path: "C:/Users/Administrator/v27-scan.png" });
    const ok = st.found && st.name === "demo-scan" && st.dur === "1.5s";
    console.log("① 演示台扫描线:", ok ? `OK (${st.name} ${st.dur}, 当前 opacity ${st.opacity} top ${st.y})` : `FAIL ${JSON.stringify(st)}`);
    if (!ok) bad++;

    // 首屏 CUT 行是否真的被划过(动画结束态)
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2000);
    const cuts = await p.evaluate(() => {
      const rows = [...document.querySelectorAll("#top main .cut-strike.is-cut")];
      return rows.map((r) => {
        const after = getComputedStyle(r, "::after");
        return { t: r.textContent.trim(), transform: after.transform };
      });
    });
    const allStruck = cuts.length >= 3 && cuts.every((c) => c.transform.startsWith("matrix(1,") || c.transform === "matrix(1, 0, 0, 1, 0, 0)");
    console.log("② 首屏 CUT 行已划到底:", allStruck ? `OK (${cuts.length} 行)` : `FAIL ${JSON.stringify(cuts)}`);
    if (!allStruck) bad++;
    await p.close();
  }

  // ---------- 2. reduce:不播动画,但内容必须全在 ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".demo-row")];
      const hidden = rows.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length;
      const scan = document.querySelector(".demo-scan");
      const txt = document.body.innerText;
      return { rows: rows.length, hidden, scanOpacity: scan ? getComputedStyle(scan).opacity : "n/a", hasNums: /3,936/.test(txt) && /1,836/.test(txt) };
    });
    const ok = r.hidden === 0 && r.hasNums && String(r.scanOpacity) === "0";
    console.log("③ reduce 模式:", ok ? `OK (${r.rows} 行全部可见, 扫描线不播, 数字在)` : `FAIL ${JSON.stringify(r)}`);
    if (!ok) bad++;
    await ctx.close();
  }

  await b.close();
  console.log(bad ? `\n${bad} 项未通过` : "\n动效断言全过");
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
