// =============================================================
// INDEX(首页 /) —— v2.6 完整长页
// 报纸排版逻辑:固定报头(章节锚点)→ Hero → 01..06 章节 → 最终 CTA → 打赏 → 报尾。
// 全页 1px 墨线分割,零圆角零阴影零渐变;超大标题与极小注释成对比。
//
// 数据同源:数字与清单全部取自 lib/sample-report + lib/report-math,
// 与报告页算的是同一套,首页不另写一份。
// 价格情报与打赏直接复用 /deals 的组件(DealTable / TipJar),不重复实现。
// =============================================================
import Link from "next/link";
import { Scissors, Zap } from "lucide-react";

import { DealTable } from "@/components/trim/deals/deal-table";
import { DealsCountdown } from "@/components/trim/deals/countdown";
import { TipJar } from "@/components/trim/deals/tip-jar";
import {
  ClaimAccumulate,
  ClaimPrivacy,
  ClaimSavings,
  ClaimSmall,
  ClaimTriage,
  SectionHead,
} from "@/components/trim/home/sections";
import { SiteNav } from "@/components/trim/home/site-nav";

/** 全站信任三条(只陈述能证明的事实) */
const TRUST = ["NO ACCOUNT", "NO BANK CONNECTION", "LOCAL ANALYSIS"];

/** 首屏以下章节的统一内边距与滚动留白(避开固定报头) */
const SECTION = "scroll-mt-[58px] border-t border-ink px-5 py-16 sm:px-8 sm:py-24 lg:px-10";
const WRAP = "mx-auto w-full max-w-[1280px]";

export default function Home() {
  return (
    <div id="top">
      <SiteNav />

      <main className="pt-[54px] sm:pt-[58px]">
        {/* ══════════ Hero ══════════ */}
        <section className="px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-10">
          <div className={WRAP}>
            <p className="mtag text-[10px] text-rust">SUBSCRIPTION INTELLIGENCE · BILLS, TRIMMED.</p>

            {/* 三行海报式标题:同时受视口宽与高约束(min(8vw,11vh)),
                保证 1366×768 这类矮屏也能整屏放下,不把 CTA 挤出首屏 */}
            <h1 className="mt-6 text-[clamp(40px,min(8vw,11vh),104px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink">
              你每年
              <br />
              在订阅上
              <br />
              <span className="text-rust">浪费了多少?</span>
            </h1>

            <p className="mt-7 max-w-[42ch] text-[16px] leading-[1.75] text-sub">
              把账单导入进来,Trim 算出你的年度订阅支出,并找出可以裁掉的部分。
            </p>

            {/* 信任三条:1px 黑框等宽字 */}
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {TRUST.map((t) => (
                <li key={t} className="mtag border border-ink px-3 py-2 text-[9.5px] text-ink">
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-5">
              <Link href="/upload" className="btn btn-ink !px-8 !py-4 !text-[15px]">
                导入账单
              </Link>
              <Link href="/report?d=demo" className="btn btn-paper !px-8 !py-4 !text-[15px]">
                试用演示
              </Link>
            </div>

            <p className="mtag mt-5 text-[9.5px] text-sub">≈ 30 秒完成</p>
          </div>
        </section>

        {/* ══════════ 01 单笔感知 ══════════ */}
        <section id="s01" className={SECTION}>
          <div className={WRAP}>
            <ClaimSmall />
          </div>
        </section>

        {/* ══════════ 02 年度累加 ══════════ */}
        <section id="s02" className={SECTION}>
          <div className={WRAP}>
            <ClaimAccumulate />
          </div>
        </section>

        {/* ══════════ 03 裁剪识别 ══════════ */}
        <section id="s03" className={SECTION}>
          <div className={WRAP}>
            <ClaimTriage />
          </div>
        </section>

        {/* ══════════ 04 节省金额 ══════════ */}
        <section id="s04" className={SECTION}>
          <div className={WRAP}>
            <ClaimSavings />
          </div>
        </section>

        {/* ══════════ 05 价格情报 ══════════ */}
        <section id="s05" className={SECTION}>
          <div className={WRAP}>
            <SectionHead
              no="05"
              title="留下的,怎么充最便宜"
              tag="DEALS"
              sub="砍完了该省的,再把留下的订阅充到最低价。"
            />

            {/* 大促提醒条 */}
            <div className="mt-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border border-rust px-5 py-4 sm:px-6">
              <p className="text-[14.5px] font-bold leading-relaxed text-rust sm:text-[15.5px]">
                <Zap size={15} strokeWidth={2} aria-hidden className="mr-1.5 inline-block shrink-0 align-[-2px]" />
                <DealsCountdown />
                <span>,历史低价集中期,非急单建议等</span>
              </p>
              <p className="mtag num shrink-0 text-[9px] text-sub">更新于 09-10 19:00</p>
            </div>

            <div className="mt-7">
              <DealTable />
            </div>

            <p className="mtag mt-3 text-[9px] leading-relaxed text-sub/85">
              * 示例数据,实际以实时抓取为准 <span className="text-ink/25">|</span> 点击任意行查看价格趋势和跨渠道对比
            </p>
          </div>
        </section>

        {/* ══════════ 中缝 · 裁切虚线 ══════════ */}
        <div aria-hidden className="flex items-center px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <span className="cut-rule" />
          <span className="mx-4 flex shrink-0 items-center gap-2.5 text-ink">
            <Scissors size={15} strokeWidth={1.6} />
            <span className="mtag text-[10px] tracking-[0.25em]">──────</span>
          </span>
          <span className="cut-rule" />
        </div>

        {/* ══════════ 06 隐私说明 ══════════ */}
        <section id="s06" className={SECTION}>
          <div className={WRAP}>
            <ClaimPrivacy />
          </div>
        </section>

        {/* ══════════ 最终 CTA ══════════ */}
        <section className="border-t border-ink px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className={`${WRAP} text-center`}>
            <h2 className="mx-auto max-w-[16ch] text-[clamp(32px,5.6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
              现在就知道
              <br />
              你一年能省多少
            </h2>
            <p className="mt-6 text-[15.5px] leading-relaxed text-sub">
              导入一次账单,30 秒看到结果。不需要注册。
            </p>
            <Link href="/upload" className="btn btn-ink mt-9 !px-10 !py-[1.05rem] !text-[15.5px]">
              导入账单
            </Link>
          </div>
        </section>

        {/* ══════════ 打赏 ══════════ */}
        <section id="tip" className="scroll-mt-[58px] border-t border-ink px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className={WRAP}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-[clamp(28px,4.6vw,54px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
                请裁剪师喝一杯
              </h2>
              <span className="mtag border border-rust px-2.5 py-1.5 text-[9.5px] text-rust">TIP JAR</span>
            </div>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-sub">
              Trim 永久免费。如果帮到了你,随意请一杯,心意不分多少。
            </p>
            <div className="mt-8">
              <TipJar />
            </div>
          </div>
        </section>

        {/* ══════════ 报尾 ══════════ */}
        <footer className="border-t border-ink px-5 pt-5 sm:px-8 lg:px-10">
          <div className={WRAP}>
            <nav aria-label="全站导航" className="mtag flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[9px] text-sub">
              {[
                { label: "START", href: "/upload" },
                { label: "DEMO", href: "/report?d=demo" },
                { label: "HOW", href: "/guide" },
                { label: "DEALS", href: "/deals" },
                { label: "PRICING", href: "/pricing" },
                { label: "ANNUAL", href: "/annual" },
              ].map((n) => (
                <Link key={n.label} href={n.href} className="transition-colors hover:text-rust">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-ink/20 py-4">
              <p className="mtag num text-[9px] text-ink">TRIM © 2026</p>
              <p className="mtag text-[9px] text-sub">bills, trimmed. deals, found.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
