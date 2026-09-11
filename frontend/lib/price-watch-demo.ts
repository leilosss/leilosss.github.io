// =============================================================
// price-watch-demo —— 价格监控的演示条目(五种信号各一条)
//
// ⚠️ 全部是示例数据:价格不代表任何平台的当前实际售价,只为把
// 「涨价 / 降价 / 套餐变化 / 优惠结束 / 无法验证」五种形态各展示一次。
// 页面上必须带「示例」标记 —— 与 /deals、示例报告同一条纪律。
//
// 与真实路径完全同构:同样走 lib/price-watch 的 signalOf() 判定,
// 所以演示卡里出现的结论,就是真实记录会得到的结论,没有第二套逻辑。
// =============================================================
import { watchKeyOf, type WatchItem } from "./price-watch";

const CN = "中国大陆";

export const DEMO_WATCH: WatchItem[] = [
  // ① 涨价(常见的那个形态)
  {
    key: watchKeyOf("Netflix", CN, "CNY"),
    name: "Netflix",
    region: CN,
    currency: "CNY",
    points: [
      { amount: 58, period: "monthly", at: "2026-06-08" },
      { amount: 58, period: "monthly", at: "2026-07-08" },
      { amount: 65, period: "monthly", at: "2026-08-08" },
    ],
  },
  // ② 降价(少花也是要告诉你的)
  {
    key: watchKeyOf("云盘会员", CN, "CNY"),
    name: "云盘会员",
    region: CN,
    currency: "CNY",
    points: [
      { amount: 78, period: "monthly", at: "2026-06-01" },
      { amount: 65, period: "monthly", at: "2026-07-01" },
      { amount: 58, period: "monthly", at: "2026-08-01" },
    ],
  },
  // ③ 优惠结束(价格回到折扣前 —— 属推断,卡片上会写明)
  {
    key: watchKeyOf("网易云音乐", CN, "CNY"),
    name: "网易云音乐黑胶VIP",
    region: CN,
    currency: "CNY",
    points: [
      { amount: 168, period: "yearly", at: "2025-12-01" },
      { amount: 88, period: "yearly", at: "2026-06-18" },
      { amount: 168, period: "yearly", at: "2026-08-20" },
    ],
  },
  // ④ 套餐变化(月付改年付:单价看着变了,年化其实更便宜)
  {
    key: watchKeyOf("效率工具 Pro", CN, "CNY"),
    name: "效率工具 Pro",
    region: CN,
    currency: "CNY",
    points: [
      { amount: 25, period: "monthly", at: "2026-05-10" },
      { amount: 188, period: "yearly", at: "2026-09-05" },
    ],
  },
  // ⑤ 无法验证(数据不足 / 口径对不上 —— 明确显示,绝不猜)
  {
    key: watchKeyOf("设计软件订阅", CN, "CNY"),
    name: "设计软件订阅",
    region: CN,
    currency: "CNY",
    points: [{ amount: 0, period: "unknown", at: "2026-08-12" }],
    unverified: "这份账单里只有一条记录,且金额与计费币种对不上(可能为外币扣款),无法确认单价",
  },
];
