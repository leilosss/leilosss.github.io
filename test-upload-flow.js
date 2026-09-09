// v2.1 极简导入流程验收:三入口(UPLOAD BILL 主 / TRY DEMO / PASTE BILL)
// + 移动端 375/390/430 无横向溢出 + 全流程真实解析
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const BASE = "http://localhost:3000";

const CSV_ALIPAY = [
  "支付宝交易记录明细查询",
  "账号:[138****0000]",
  "起始时间:[2026-06-01 00:00:00]    终止时间:[2026-09-01 23:59:59]",
  "共 3 笔记录",
  "-----------------------------------交易记录明细列表-----------------------------------",
  "交易时间,交易分类,交易对方,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号",
  "2026-06-10 12:00:00,数字娱乐,Netflix,Netflix 会员 自动续费,支出,49.00,余额宝,交易成功,1,1001",
  "2026-07-10 12:00:00,数字娱乐,Netflix,Netflix 会员 自动续费,支出,49.00,余额宝,交易成功,2,1001",
  "2026-08-10 12:00:00,数字娱乐,Netflix,Netflix 会员 自动续费,支出,49.00,余额宝,交易成功,3,1001",
  "-----------------------------------------------------------------------",
].join("\n");

const TXT_BILL = [
  "微信支付账单明细",
  "2026-06-10 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  "2026-07-10 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
  "2026-08-10 商户消费", "Adobe 创意应用 自动续费", "¥68.00",
].join("\n");

// 单笔一次性消费(无周期、无关键词)→ 识别 0 个订阅 → 应走"没有发现订阅"守卫,绝不显示 ¥0 / 年
const CSV_ONEOFF = [
  "支付宝交易记录明细查询",
  "账号:[138****0000]",
  "起始时间:[2026-06-01 00:00:00]    终止时间:[2026-09-01 23:59:59]",
  "共 1 笔记录",
  "-----------------------------------交易记录明细列表-----------------------------------",
  "交易时间,交易分类,交易对方,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号",
  "2026-06-10 12:00:00,日用百货,某商店,一箱矿泉水,支出,35.00,余额宝,交易成功,1,1001",
  "-----------------------------------------------------------------------",
].join("\n");

async function checkOverflow(page, label) {
  const ov = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  const ok = ov.s <= ov.c;
  console.log(`  [${label}] overflow:`, ok ? "OK" : `FAIL (${ov.s} > ${ov.c})`);
  return ok;
}

(async () => {
  const b = await chromium.launch();
  let allOk = true;

  // ---------- 1. 三视口无横向溢出扫描 ----------
  for (const [w, h, tag] of [[375, 812, "375"], [390, 844, "390"], [430, 932, "430"]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    for (const [name, path] of [["home", "/"], ["upload", "/upload"], ["report-demo", "/report?d=demo"], ["guide", "/guide"], ["pricing", "/pricing"]]) {
      await p.goto(BASE + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(name === "report-demo" ? 1600 : 800);
      const ok = await checkOverflow(p, `${tag}px ${name}`);
      allOk = allOk && ok;
    }
    await ctx.close();
  }

  // ---------- 2. 首页:IMPORT BILL / TRY DEMO 两个核心按钮 + 隐私三条 ----------
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    const txt = await p.locator("body").innerText();
    const importBtn = await p.locator("text=IMPORT BILL").count();
    const demoBtn = await p.locator("text=TRY DEMO").count();
    const order = { importIdx: txt.indexOf("IMPORT BILL"), demoIdx: txt.indexOf("TRY DEMO") };
    const ok = importBtn >= 1 && demoBtn >= 1 && order.importIdx > 0 && order.importIdx < order.demoIdx;
    const privacy = ["NO ACCOUNT", "NO BANK CONNECTION", "LOCAL ANALYSIS"].every((s) => txt.includes(s));
    const flowShown = ["导入账单", "自动分析", "看到一年花多少", "看到一年省多少"].every((s) => txt.includes(s));
    console.log("首页按钮: IMPORT BILL", importBtn, "| TRY DEMO", demoBtn, "| 主按钮在前:", ok ? "OK" : "FAIL");
    console.log("首页隐私三条:", privacy ? "OK" : "FAIL", "| 流程四步:", flowShown ? "OK" : "FAIL");
    if (!ok || !privacy || !flowShown) allOk = false;
    await ctx.close();
  }

  // ---------- 2.5. Upload 页三入口检查 ----------
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 100)));
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    const uploadBtn = await p.locator("text=UPLOAD BILL").count();
    const demoBtn = await p.locator("text=TRY DEMO").count();
    const pasteBtn = await p.locator("text=PASTE BILL").count();
    console.log("三入口:", "UPLOAD BILL", uploadBtn, "| TRY DEMO", demoBtn, "| PASTE BILL", pasteBtn);
    if (!(uploadBtn && demoBtn && pasteBtn)) allOk = false;

    // 上传区域是第一个可见交互(主入口在最上方)
    const order = await p.evaluate(() => {
      const txt = document.body.innerText;
      return {
        uploadIdx: txt.indexOf("UPLOAD BILL"),
        demoIdx: txt.indexOf("TRY DEMO"),
        pasteIdx: txt.indexOf("PASTE BILL"),
      };
    });
    const primaryFirst = order.uploadIdx > 0 && order.uploadIdx < order.demoIdx && order.uploadIdx < order.pasteIdx;
    console.log("UPLOAD BILL 是否排在最前(主入口):", primaryFirst ? "OK" : "FAIL", JSON.stringify(order));
    allOk = allOk && primaryFirst;
    console.log(errs.length ? "ERRORS: " + errs.join(" | ") : "NO-JS-ERRORS(idle)");
    await ctx.close();
  }

  // ---------- 3. TRY DEMO → 完整报告(非空、非 ¥0、核心标签齐全) ----------
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    await p.click("text=TRY DEMO");
    await p.waitForURL(/report\?d=demo/, { timeout: 15000 });
    await p.waitForTimeout(1800);
    const txt = await p.locator("body").innerText();
    const hasCut = /YOU CAN CUT/.test(txt);
    const annual = txt.match(/¥3,936/);
    const potential = txt.match(/¥1,836/);
    const zero = /¥0\s*\/\s*年/.test(txt) && !/KEEP[\s\S]{0,80}¥0/.test(txt); // 允许 KEEP 区个别 ¥0 但头条不能是 0
    const yearLabel = /YEARLY SPEND/.test(txt);
    const potLabel = /POTENTIAL SAVINGS/.test(txt);
    console.log("DEMO 报告:", hasCut ? "OK(有 YOU CAN CUT)" : "FAIL", "| 年度总额 ¥3,936:", !!annual, "| 可省 ¥1,836:", !!potential);
    console.log("DEMO 标签: YEARLY SPEND:", yearLabel ? "OK" : "FAIL", "| POTENTIAL SAVINGS:", potLabel ? "OK" : "FAIL");
    if (!hasCut || !annual || !potential || !yearLabel || !potLabel) allOk = false;
    // 每条被裁行应显示 POTENTIAL SAVING ¥X / 年
    const savingNotes = await p.locator("text=POTENTIAL SAVING").count();
    console.log("DEMO 行级 POTENTIAL SAVING 出现次数:", savingNotes, savingNotes >= 3 ? "OK" : "FAIL");
    if (savingNotes < 3) allOk = false;
    await ctx.close();
  }

  // ---------- 4. UPLOAD BILL 真实文件流程(CSV) ----------
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    const csvPath = os.tmpdir() + "/trim-test-alipay.csv";
    fs.writeFileSync(csvPath, CSV_ALIPAY, "utf8");
    const input = p.locator('input[type="file"]');
    // 主入口是一个 <button>,点击后触发隐藏 input;直接对 input 设值,等效点击+选择文件
    await input.setInputFiles(csvPath);
    await p.waitForURL(/report\?d=/, { timeout: 20000 });
    await p.waitForTimeout(1800);
    const txt = await p.locator("body").innerText();
    console.log("UPLOAD BILL(CSV) → 报告:", /YOU CAN CUT/.test(txt) ? "OK" : "FAIL", "| 订阅:", txt.match(/\d+ 个订阅/)?.[0]);
    if (!/YOU CAN CUT/.test(txt)) allOk = false;
    await ctx.close();
  } catch (e) {
    console.log("UPLOAD BILL(CSV) → 报告: FAIL(异常)", e.message);
    allOk = false;
  }

  // ---------- 5. UPLOAD BILL 真实文件流程(TXT,新支持) ----------
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    const txtPath = os.tmpdir() + "/trim-test-wechat.txt";
    fs.writeFileSync(txtPath, TXT_BILL, "utf8");
    const input = p.locator('input[type="file"]');
    await input.setInputFiles(txtPath);
    await p.waitForURL(/report\?d=/, { timeout: 20000 });
    await p.waitForTimeout(1800);
    const txt = await p.locator("body").innerText();
    const annual = txt.match(/¥816/); // 68*12
    const ok = /YOU CAN CUT|KEEP/.test(txt);
    console.log("UPLOAD BILL(TXT) → 报告:", ok ? "OK" : "FAIL", "| Adobe 年化 ¥816:", !!annual);
    if (!ok) allOk = false;
    await ctx.close();
  } catch (e) {
    console.log("UPLOAD BILL(TXT) → 报告: FAIL(异常)", e.message);
    allOk = false;
  }

  // ---------- 6. ¥0 守卫:单笔一次性账单 → 不出现 ¥0 / 年 ----------
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    const oneoffPath = os.tmpdir() + "/trim-test-oneoff.csv";
    fs.writeFileSync(oneoffPath, CSV_ONEOFF, "utf8");
    const input = p.locator('input[type="file"]');
    await input.setInputFiles(oneoffPath);
    await p.waitForURL(/report\?d=/, { timeout: 20000 });
    await p.waitForTimeout(1800);
    const txt = await p.locator("body").innerText();
    const guardShown = /没有发现订阅|没有周期性订阅/.test(txt);
    const noZero = !/¥0\s*\/\s*年/.test(txt);
    console.log("¥0 守卫: 无订阅提示:", guardShown ? "OK" : "FAIL", "| 无 ¥0/年 头条:", noZero ? "OK" : "FAIL");
    if (!guardShown || !noZero) allOk = false;
    await ctx.close();
  } catch (e) {
    console.log("¥0 守卫: FAIL(异常)", e.message);
    allOk = false;
  }

  // ---------- 7. PASTE BILL(剪贴板)仍可用 ----------
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
    const p = await ctx.newPage();
    await p.goto(BASE + "/upload", { waitUntil: "networkidle" });
    await p.evaluate((t) => navigator.clipboard.writeText(t), TXT_BILL);
    await p.click("text=PASTE BILL");
    await p.waitForURL(/report\?d=/, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const txt = await p.locator("body").innerText();
    const ok = /YOU CAN CUT|KEEP/.test(txt);
    console.log("PASTE BILL(剪贴板按钮) → 报告:", ok ? "OK" : "FAIL");
    if (!ok) allOk = false;
    await ctx.close();
  } catch (e) {
    console.log("PASTE BILL(剪贴板按钮) → 报告: FAIL(异常)", e.message);
    allOk = false;
  }

  console.log(allOk ? "\n✅ ALL CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  await b.close();
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
