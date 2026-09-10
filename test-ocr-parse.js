// =============================================================
// OCR 解析层回归 —— 用真实识别输出验证「OCR 文本 → 交易数组」
// 用例文本来自 PaddleOCR 对仿微信账单截图的真实识别结果(含 OCR 错字)。
// 运行:
//   cd frontend && npx tsc lib/paste-parse.ts lib/ocr-parse.ts lib/types.ts \
//     --outDir ../.ocrtest --module commonjs --target es2020 --skipLibCheck --esModuleInterop
//   node SubscriptionScanner/test-ocr-parse.js
// =============================================================
const { ocrLinesToBillRows } = require("./.ocrtest/ocr-parse.js");

/* 真实 OCR 输出:日期与时间粘连、商户名有错字(Netfix/订南)、末尾有支付方式碎片 */
const REAL_OCR = [
  "账单明细",
  "Netfix会员自动续费）",
  "支出￥49.00",
  "2026-06-1012:00:00商户消费",
  "",
  "Netflix会员自动续费",
  "支出￥49.00",
  "2026-07-1012:01:1商户消费",
  "",
  "Netflix会员自动续费",
  "支出￥49.00",
  "2026-08-1012:02:2商户消费",
  "",
  "SpotifyPremium订南",
  "支出￥15.00",
  "2026-06-1509:30:0商户消费",
  "",
  "SpotifyPremium订通",
  "支出￥15.00",
  "2026-07-1509:31：00商户消费",
  "",
  "SpotifyPremium订南",
  "支出￥15.00",
  "2026-08-1509:32:0商户消费",
  "",
  "Adobe创意应用自动续费",
  "支出￥68.00",
  "2026-06-2020:10:0商户消费",
  "额宝",
];

/* 支付宝风格长图:日期在金额上方(与微信相反),验证上下双向找日期 */
const ALIPAY_OCR = [
  "账单明细",
  "2026-03-05 10:00:00",
  "腾讯视频VIP",
  "商户消费",
  "-¥30.00",
  "2026-04-05 10:00:00",
  "腾讯视频VIP",
  "商户消费",
  "-¥30.00",
  "2026-05-05 10:00:00",
  "腾讯视频VIP",
  "商户消费",
  "-¥30.00",
];

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    pass += 1;
    console.log("  ✓", name);
  } catch (e) {
    fail += 1;
    console.log("  ✗", name, "\n      →", e.message);
  }
};

console.log("OCR 文本 → 交易数组(真实识别输出):\n");

const r = ocrLinesToBillRows(REAL_OCR);

check("解析出 7 笔交易", () => {
  if (r.rows.length !== 7) {
    throw new Error(`应 7 笔,实得 ${r.rows.length}:\n` + JSON.stringify(r.rows.map((x) => [x.time, x.counterparty, x.amount]), null, 1));
  }
});

check("金额正确(49×3 / 15×3 / 68)", () => {
  const by = {};
  for (const row of r.rows) by[row.amount] = (by[row.amount] || 0) + 1;
  if (by[49] !== 3 || by[15] !== 3 || by[68] !== 1) throw new Error("金额分布不对:" + JSON.stringify(by));
});

check("日期与金额一一对应(日期没串行)", () => {
  const got = r.rows.map((x) => `${x.time.slice(0, 10)}|${x.amount}`);
  const want = [
    "2026-06-10|49",
    "2026-07-10|49",
    "2026-08-10|49",
    "2026-06-15|15",
    "2026-07-15|15",
    "2026-08-15|15",
    "2026-06-20|68",
  ];
  for (const w of want) {
    if (!got.includes(w)) throw new Error(`缺少 ${w}\n实得:\n` + got.join("\n"));
  }
});

check("OCR 错字被归一化到规范商户名(否则同一订阅会被拆成两条)", () => {
  const names = new Set(r.rows.map((x) => x.counterparty));
  const want = ["Netflix", "Spotify", "Adobe Creative Cloud"];
  for (const w of want) {
    if (!names.has(w)) throw new Error(`缺少规范名「${w}」,实得商户名:${[...names].join(" / ")}`);
  }
  if (names.size !== 3) throw new Error(`应只有 3 个不同商户,实得 ${names.size} 个:${[...names].join(" / ")}`);
  // 同一商户的多次扣费必须落在同一个分组键上(识别引擎按 商户+金额 分组)
  const key = (x) => `${x.counterparty}|${x.amount}`;
  const spotify = new Set(r.rows.filter((x) => x.counterparty === "Spotify").map(key));
  if (spotify.size !== 1) throw new Error(`Spotify 被拆成 ${spotify.size} 组:${[...spotify].join(" / ")}`);
});

check("时刻被保留而不是 00:00:00(OCR 把日期时间粘在一起)", () => {
  const bad = r.rows.filter((x) => x.time.endsWith("00:00:00"));
  if (bad.length) throw new Error(`${bad.length} 笔时刻丢了:\n` + JSON.stringify(bad.map((b) => b.time)));
});

check("界面噪声(账单明细)与支付方式碎片(额宝)未成为商户名", () => {
  const names = r.rows.map((x) => x.counterparty);
  if (names.some((n) => /账单明细|^额宝$/.test(n))) throw new Error("噪声混入:" + names.join(" / "));
});

check("方向全部为支出", () => {
  const bad = r.rows.filter((x) => x.direction !== "out");
  if (bad.length) throw new Error(`${bad.length} 笔方向不对`);
});

console.log("\n支付宝风格(日期在金额上方):\n");
const a = ocrLinesToBillRows(ALIPAY_OCR);

check("上下双向都能找到日期 → 3 笔且日期正确", () => {
  if (a.rows.length !== 3) throw new Error("应 3 笔,实得 " + a.rows.length);
  const dates = a.rows.map((x) => x.time.slice(0, 10)).sort();
  if (dates.join(",") !== "2026-03-05,2026-04-05,2026-05-05") throw new Error("日期不对:" + dates.join(","));
  if (a.platform !== "alipay") throw new Error("平台判断应 alipay,实得 " + a.platform);
});

console.log("\n失败态:\n");
check("读不出文字时抛出可提示的错误", () => {
  let threw = false;
  try {
    ocrLinesToBillRows(["", "  ", "-----"]);
  } catch (e) {
    threw = true;
    if (!/没能从截图里读出账目文字/.test(e.message)) throw new Error("错误信息不友好:" + e.message);
  }
  if (!threw) throw new Error("空白输入应当抛错");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
