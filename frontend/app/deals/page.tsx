// =============================================================
// DEALS /deals —— 价格情报 + 打赏(Trim 的第二个获客面)
// 报纸式版式:报头 → 价格情报(主体)→ 裁切虚线 → 打赏 → 版权条。
// 视觉沿用已锁定的 Trim 纸面语言(纸/墨/红、1px 黑线、零圆角零阴影),
// 只在这一页把"报头 + 全宽黑实线 + 报尾"的印刷逻辑用足。
//
// 打赏部分不做任何金额暗示,也不接任何支付 SDK:只展示收款码。
// 价格数据为示例数据,页面底部已显式标注,不假装是实时抓取。
// =============================================================
import type { Metadata } from "next";
import { Scissors, Zap } from "lucide-react";

import { DealTable } from "@/components/trim/deals/deal-table";
import { TipJar } from "@/components/trim/deals/tip-jar";
import { DealsCountdown } from "@/components/trim/deals/countdown";

export const metadata: Metadata = {
  title: "价格情报 · 会员最低价与历史低点",
  description:
    "充之前先查:主流视频与音乐会员的月卡、季卡、年卡价格,历史低点与跨渠道对比。Trim 永久免费,可请裁剪师喝一杯。",
  alternates: { canonical: "/deals" },
};

export default function DealsPage() {
  return (
    <div>
      {/* ══════════ 报头 ══════════ */}
      <header className="border-b border-ink px-5 pb-5 pt-9 sm:px-8 sm:pb-6 sm:pt-12 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h1 className="flex items-baseline leading-[0.82] tracking-[-0.055em] text-ink">
            <span className="text-[clamp(52px,9.5vw,124px)] font-extrabold">TRIM</span>
            {/* 印刷句点:方形(全站零圆角),落在 M 的右下角 */}
            <span aria-hidden className="ml-[0.06em] inline-block h-[0.17em] w-[0.17em] bg-rust" />
          </h1>
          <p className="mtag pb-2 text-[10px] text-ink sm:pb-3.5">BILLS, TRIMMED.</p>
        </div>
      </header>

      {/* ══════════ 上半 · 价格情报 ══════════ */}
      <section className="px-5 pt-10 sm:px-8 sm:pt-14 lg:px-10">
        <div className="mx-auto w-full max-w-[1280px]">
          {/* 标题区:大标题 + 细线框标签 + 副标题 */}
          <div className="max-w-[46ch]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-[clamp(32px,5.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink">
                价格情报
              </h2>
              <span className="mtag border border-rust px-2.5 py-1.5 text-[9.5px] text-rust">DEALS</span>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-sub">
              充之前先查:自动追踪全网会员最低价,该出手时出手。
            </p>
          </div>

          {/* 大促提醒条 */}
          <div className="mt-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border border-rust px-5 py-4 sm:px-6">
            <p className="text-[14.5px] font-bold leading-relaxed text-rust sm:text-[15.5px]">
              <Zap size={15} strokeWidth={2} aria-hidden className="mr-1.5 inline-block shrink-0 align-[-2px]" />
              <DealsCountdown />
              <span>,历史低价集中期,非急单建议等</span>
            </p>
            <p className="mtag num shrink-0 text-[9px] text-sub">更新于 09-10 19:00</p>
          </div>

          {/* 对比表 */}
          <div className="mt-7">
            <DealTable />
          </div>

          <p className="mtag mt-3 text-[9px] leading-relaxed text-sub/85">
            * 示例数据,实际以实时抓取为准 <span className="text-ink/25">|</span> 点击任意行查看价格趋势和跨渠道对比
          </p>
        </div>
      </section>

      {/* ══════════ 中缝 · 裁切虚线 ══════════ */}
      <div aria-hidden className="mt-14 flex items-center px-5 sm:mt-20 sm:px-8 lg:px-10">
        <span className="cut-rule" />
        <span className="mx-4 flex shrink-0 items-center gap-2.5 text-ink">
          <Scissors size={15} strokeWidth={1.6} />
          <span className="mtag text-[10px] tracking-[0.25em]">──────</span>
        </span>
        <span className="cut-rule" />
      </div>

      {/* ══════════ 下半 · 打赏 ══════════ */}
      <section className="px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:px-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="max-w-[46ch]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-[clamp(28px,4.6vw,54px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
                请裁剪师喝一杯
              </h2>
              <span className="mtag border border-rust px-2.5 py-1.5 text-[9.5px] text-rust">TIP JAR</span>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-sub">
              Trim 永久免费。如果帮到了你,随意请一杯,心意不分多少。
            </p>
          </div>

          <div className="mt-8">
            <TipJar />
          </div>
        </div>
      </section>

      {/* ══════════ 报尾 ══════════ */}
      <footer className="border-t border-ink px-5 pt-5 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-[1280px]">
          {/* 信任事实:与其他页脚一致,只陈述能证明的事 */}
          <ul className="mtag flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[9px] text-sub">
            {["无需注册", "不连银行卡", "本地分析", "本机暂存 7 天"].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-ink/20 py-4">
            <p className="mtag num text-[9px] text-ink">TRIM © 2026</p>
            <p className="mtag text-[9px] text-sub">bills, trimmed. deals, found.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
