// =============================================================
// 收款码扫码验证:不靠"看着像",直接解码。
//   ① 源图(frontend/public/tip/*.png)必须能解出内容
//   ② 页面上按真实尺寸渲染出来的那张(截图)也必须能解出同一内容
//      —— 页面里是 248px 显示,移动端 2x 也就是 ~496px,这里按 1x/2x 各截一次
// 依赖:jsqr + pngjs(与 playwright-core 同层,装在 D:\伟大\node_modules,
//       属验证工具层,不进项目依赖)
// 运行:node check-qr.js
// =============================================================
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");
const { chromium } = require("playwright-core");

const B = "http://localhost:3000";

function decode(buf, label) {
  const png = PNG.sync.read(buf);
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!res) return { label, ok: false, size: `${png.width}x${png.height}` };
  return { label, ok: true, size: `${png.width}x${png.height}`, text: res.data };
}

(async () => {
  let bad = 0;

  // ① 源图
  for (const [file, who] of [["wechat.png", "微信"], ["alipay.png", "支付宝"]]) {
    const p = path.join(__dirname, "frontend", "public", "tip", file);
    const r = decode(fs.readFileSync(p), `${who} 源图`);
    console.log(r.ok ? `① ${r.label}: OK (${r.size}) → ${r.text.slice(0, 28)}` : `① ${r.label}: FAIL 解不出 (${r.size})`);
    if (!r.ok) bad++;
  }

  // ② 页面真实渲染(桌面 1x + 移动 2x)
  const b = await chromium.launch({ headless: true });
  for (const [label, opts] of [
    ["桌面 1x", { viewport: { width: 1440, height: 900 } }],
    ["移动 2x", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    await p.goto(`${B}/`, { waitUntil: "networkidle" });
    await p.evaluate(() => document.getElementById("tip").scrollIntoView());
    await p.waitForTimeout(700);
    for (const [tab, who] of [["微信", "微信"], ["支付宝", "支付宝"]]) {
      await p.locator(`button[role="tab"]:has-text("${tab}")`).click();
      await p.waitForTimeout(350);
      const img = p.locator(`img[alt="${who}收款码"]`);
      const buf = await img.screenshot();
      const r = decode(buf, `${label} ${who}`);
      console.log(r.ok ? `② ${r.label}: OK (${r.size}) → ${r.text.slice(0, 28)}` : `② ${r.label}: FAIL 解不出 (${r.size})`);
      if (!r.ok) bad++;
    }
    // 存一张给人看的图
    const box = await p.locator('div[role="tablist"]').locator("..").screenshot();
    fs.writeFileSync(`C:/Users/Administrator/v27-tip-${label.replace(" ", "")}.png`, box);
    await ctx.close();
  }

  await b.close();
  console.log(bad ? `\n${bad} 项失败` : "\n两张收款码在页面上的真实尺寸都能扫出来");
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
