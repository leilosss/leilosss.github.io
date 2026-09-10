// =============================================================
// DealTable —— 价格对比表(价格情报页主体)
// 参考 Wise 对比表的读法:表头反白、数字用等宽、结论单独成列。
// 版式遵守 Trim 已锁定的纸面印刷语言:1px 黑细线网格、零圆角零阴影、
// 红只用在"该出手"的信号上,不做装饰。
//
// 交互:整行可点开 → 展开一条价格走势(6 个月年卡价)+ 跨渠道对比。
// 展开内容是**示例数据**(与表内数据同源),页脚已显式标注,不假装实时抓取。
// =============================================================
"use client";

import * as React from "react";

export interface DealRow {
  id: string;
  name: string;
  desc: string;
  monthly: number;
  quarterly: number;
  yearly: number;
  /** 历史低价(年卡口径);**必须等于 trend 里的最小值**,图上的低点标记才对得上账 */
  low: number;
  lowAt: string;
  advice: "now" | "wait";
  /** 近 12 个月年卡价(示例);下标 0 = 2025-10,下标 11 = 2026-09 */
  trend: number[];
  channels: { name: string; price: number; note: string }[];
}

export const DEALS: DealRow[] = [
  {
    id: "iqiyi",
    name: "爱奇艺黄金",
    desc: "黄金 VIP · 手机/平板/电脑",
    monthly: 25,
    quarterly: 68,
    yearly: 238,
    low: 148,
    lowAt: "2025-11-11",
    advice: "wait",
    trend: [238, 148, 238, 238, 238, 238, 178, 238, 238, 238, 168, 238],
    channels: [
      { name: "官方 App", price: 238, note: "标准年卡,随时可退" },
      { name: "电商旗舰店", price: 178, note: "需绑定手机号,到账 1 小时" },
      { name: "联合会员", price: 168, note: "与外卖平台捆绑,含两张券" },
    ],
  },
  {
    id: "tencent",
    name: "腾讯视频 VIP",
    desc: "VIP · 不含体育与超前点播",
    monthly: 30,
    quarterly: 78,
    yearly: 128,
    low: 118,
    lowAt: "2026-06-18",
    advice: "now",
    trend: [168, 158, 168, 168, 138, 128, 128, 128, 118, 128, 128, 128],
    channels: [
      { name: "官方 App", price: 128, note: "当前价已接近历史低位" },
      { name: "电商旗舰店", price: 128, note: "与官方同价,发货更快" },
      { name: "联合会员", price: 138, note: "捆绑音乐会员,单买更划算" },
    ],
  },
  {
    id: "netease",
    name: "网易云黑胶",
    desc: "黑胶 VIP · 含无损音质",
    monthly: 15,
    quarterly: 45,
    yearly: 168,
    low: 88,
    lowAt: "2025-11-11",
    advice: "wait",
    trend: [168, 88, 168, 168, 168, 168, 128, 168, 168, 168, 168, 168],
    channels: [
      { name: "官方 App", price: 168, note: "标准年卡" },
      { name: "电商旗舰店", price: 128, note: "常见折扣位,常年有货" },
      { name: "联合会员", price: 108, note: "与阅读平台捆绑" },
    ],
  },
  {
    id: "bilibili",
    name: "B站大会员",
    desc: "大会员 · 含番剧与 1080P60",
    monthly: 25,
    quarterly: 68,
    yearly: 148,
    low: 98,
    lowAt: "2025-11-11",
    advice: "wait",
    trend: [168, 98, 168, 168, 148, 168, 168, 168, 168, 148, 168, 168],
    channels: [
      { name: "官方 App", price: 148, note: "标准年卡" },
      { name: "电商旗舰店", price: 128, note: "大促期间常见" },
      { name: "联合会员", price: 118, note: "与漫画平台捆绑" },
    ],
  },
];

const yuan = (n: number) => `¥${n}`;

/** 走势线:1px 墨线 + 当前值/历史低点两个方点(无网格无填充) */
function Trend({ points, low }: { points: number[]; low: number }) {
  const W = 168;
  const H = 44;
  const min = Math.min(...points, low);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * (H - 6) - 3;
  const path = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  // 历史低点标记要落在它**实际发生的那一月**(最早出现最低价的位置),不是右端
  const lowIdx = points.indexOf(Math.min(...points));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden fill="none" className="overflow-visible">
      <path d={path} stroke="currentColor" strokeWidth="1" className="text-ink" />
      {/* 历史低点(发生在 lowIdx 那一月) */}
      <rect x={x(lowIdx) - 2} y={y(points[lowIdx]) - 2} width="4" height="4" className="fill-rust" />
      {/* 当前价 */}
      <rect x={x(points.length - 1) - 2} y={y(last) - 2} width="4" height="4" className="fill-ink" />
    </svg>
  );
}

function PriceCell({ value, low, unit }: { value: number; low?: number; unit: string }) {
  return (
    <td className="border-l border-ink px-3 py-4 text-right align-top sm:px-4">
      <span className="num block text-[15px] font-semibold text-ink">{yuan(value)}</span>
      <span className="mtag mt-1 block text-[8.5px] text-sub/70">{unit}</span>
      {low !== undefined && low < value && (
        <span className="mtag mt-1.5 block text-[8.5px] text-sub">低 {yuan(low)}</span>
      )}
    </td>
  );
}

export function DealTable() {
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <div className="border border-ink">
      {/* 横向滚动容器:窄屏下表格整块滑动,页面本身不横滚 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">主流视频与音乐会员的月卡、季卡、年卡价格与购买建议(示例数据)</caption>
          <thead>
            <tr className="bg-ink text-paper">
              <th scope="col" className="px-4 py-3 text-left sm:px-5">
                <span className="mtag text-[9px] text-paper/70">APP / 服务</span>
              </th>
              <th scope="col" className="border-l border-paper/25 px-3 py-3 text-right sm:px-4">
                <span className="mtag text-[9px]">月卡</span>
              </th>
              <th scope="col" className="border-l border-paper/25 px-3 py-3 text-right sm:px-4">
                <span className="mtag text-[9px]">季卡</span>
              </th>
              <th scope="col" className="border-l border-paper/25 px-3 py-3 text-right sm:px-4">
                <span className="mtag text-[9px]">年卡</span>
              </th>
              <th scope="col" className="border-l border-paper/25 px-4 py-3 text-right sm:px-5">
                <span className="mtag text-[9px]">建议</span>
              </th>
            </tr>
          </thead>

          {/* 行数据:每个服务一段,展开面板紧跟其行 */}
          {DEALS.map((d) => {
            const expanded = open === d.id;
            return (
              <tbody key={d.id}>
                <tr
                  onClick={() => setOpen(expanded ? null : d.id)}
                  className={`cursor-pointer border-t border-ink transition-colors ${
                    d.advice === "now" ? "bg-rust/[0.055]" : "bg-paper hover:bg-paperDeep/60"
                  }`}
                >
                  <th scope="row" className="px-4 py-4 text-left font-normal sm:px-5">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[16px] font-bold tracking-[-0.015em] text-ink">{d.name}</span>
                      <span
                        aria-hidden
                        className={`mtag text-[9px] text-sub transition-transform ${expanded ? "rotate-90" : ""}`}
                      >
                        ▶
                      </span>
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-sub">{d.desc}</span>
                  </th>
                  <PriceCell value={d.monthly} unit="/ 月" />
                  <PriceCell value={d.quarterly} unit="/ 季" />
                  <PriceCell value={d.yearly} low={d.low} unit="/ 年" />
                  <td className="border-l border-ink px-4 py-4 text-right align-top sm:px-5">
                    {d.advice === "now" ? (
                      <span className="mtag inline-block bg-rust px-2.5 py-1.5 text-[9.5px] text-paper">现在充</span>
                    ) : (
                      <span className="mtag inline-block border border-ink px-2.5 py-1.5 text-[9.5px] text-ink">建议等</span>
                    )}
                  </td>
                </tr>

                {expanded && (
                  <tr className="border-t border-ink/25 bg-paperDeep/50">
                    <td colSpan={5} className="px-4 py-6 sm:px-5">
                      <div className="grid gap-x-12 gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                        {/* 左:近 6 个月年卡价走势 */}
                        <div>
                          <p className="mtag text-[9px] text-sub">近 12 个月年卡价</p>
                          <div className="mt-3 text-ink">
                            <Trend points={d.trend} low={d.low} />
                          </div>
                          <div className="mt-3 flex items-baseline gap-x-5">
                            <span className="mtag flex items-center gap-1.5 text-[9px] text-ink">
                              <span aria-hidden className="inline-block h-[5px] w-[5px] bg-ink" />
                              当前 {yuan(d.trend[d.trend.length - 1])}
                            </span>
                            <span className="mtag flex items-center gap-1.5 text-[9px] text-rust">
                              <span aria-hidden className="inline-block h-[5px] w-[5px] bg-rust" />
                              历史低 {yuan(d.low)} · {d.lowAt}
                            </span>
                          </div>
                        </div>

                        {/* 右:跨渠道对比 */}
                        <div>
                          <p className="mtag text-[9px] text-sub">跨渠道对比</p>
                          <ul className="mt-3 border-t border-ink/25">
                            {d.channels.map((c) => (
                              <li key={c.name} className="flex items-baseline gap-x-4 border-b border-ink/15 py-2.5">
                                <span className="w-[86px] shrink-0 text-[13.5px] font-semibold text-ink">{c.name}</span>
                                <span className="num w-[54px] shrink-0 text-right text-[14px] font-semibold text-ink">
                                  {yuan(c.price)}
                                </span>
                                <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-sub">{c.note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
