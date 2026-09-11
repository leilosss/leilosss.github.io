// =============================================================
// INDEX(首页 /) —— v2.7 长页
//
// 一条链走到黑:账单 → 订阅识别 → 支出统计 → 问题发现 → 节省金额。
// 首屏不再只讲产品,而是把产品**算完的结果**直接摊开(ProductPanel);
// 往下每一节只回答一个问题,答完就走,不摆与价值链无关的内容。
//
// 数据同源:数字与清单全部取自 lib/sample-report + lib/report-math + lib/triage,
// 与报告页算的是同一套,首页不另写一份。
// =============================================================
import Link from "next/link";
import { Scissors } from "lucide-react";

import { TipJar } from "@/components/trim/deals/tip-jar";
import { ProductPanel } from "@/components/trim/home/product-panel";
import {
  ClaimDemo,
  ClaimPrivacy,
  ClaimProblem,
  ClaimSavings,
  ClaimSupported,
  ClaimTriage,
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
        {/* ══════════ Hero:价值主张 + 产品本身 ══════════ */}
        <section className="px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10">
          <div className={WRAP}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-14">
              {/* 左:说的是什么、为什么可信、下一步点哪 */}
              <div>
                <p className="mtag text-[10px] text-rust">SUBSCRIPTION INTELLIGENCE · BILLS, TRIMMED.</p>

                {/* 两行海报式标题:字号同时受视口宽与高约束(min(6.2vw,9.5vh)),
                    矮屏(1366×768)也整屏放得下,不把 CTA 挤出首屏 */}
                <h1 className="mt-6 text-[clamp(36px,min(6.2vw,9.5vh),80px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink">
                  你每年在订阅上
                  <br />
                  <span className="text-rust">浪费了多少?</span>
                </h1>

                <p className="mt-6 max-w-[40ch] text-[16px] leading-[1.75] text-sub">
                  导入支付宝或微信账单,Trim 在本机算出你的年度订阅支出,并标出可以裁掉的部分。
                </p>

                <ul className="mt-7 flex flex-wrap gap-2.5">
                  {TRUST.map((t) => (
                    <li key={t} className="mtag border border-ink px-3 py-2 text-[9.5px] text-ink">
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
                  <Link href="/upload" className="btn btn-ink !px-8 !py-4 !text-[15px]">
                    开始分析账单
                  </Link>
                  <Link
                    href="/report?d=demo"
                    className="linku text-[14.5px] font-semibold text-ink"
                  >
                    看示例报告 →
                  </Link>
                </div>

                <p className="mtag mt-5 text-[9.5px] text-sub">≈ 30 秒完成 · 不需要注册</p>
                {/* 宽屏左栏的收尾:一句话讲完价值链,不做成 feature 列表 */}
                <p className="mtag mt-3 hidden text-[9.5px] text-ink/45 lg:block">
                  复制账单 → 本机识别 → 支出统计 → 可裁剪清单
                </p>
              </div>

              {/* 右:产品本身(示例报告,数字与报告页同源) */}
              <div>
                <p className="mtag mb-3 flex flex-wrap items-baseline gap-x-3 text-[9px] text-sub">
                  <span>EXAMPLE REPORT</span>
                  <span className="text-ink/45">导入后你会看到的,长这样</span>
                </p>
                <ProductPanel />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 01 问题 ══════════ */}
        <section id="s01" className={SECTION}>
          <div className={WRAP}>
            <ClaimProblem />
          </div>
        </section>

        {/* ══════════ 02 产品演示 ══════════ */}
        <section id="s02" className={SECTION}>
          <div className={WRAP}>
            <ClaimDemo />
          </div>
        </section>

        {/* ══════════ 03 订阅分析(CUT / REVIEW / KEEP) ══════════ */}
        <section id="s03" className={SECTION}>
          <div className={WRAP}>
            <ClaimTriage />
          </div>
        </section>

        {/* ══════════ 04 潜在节省 ══════════ */}
        <section id="s04" className={SECTION}>
          <div className={WRAP}>
            <ClaimSavings />
          </div>
        </section>

        {/* ══════════ 05 隐私 ══════════ */}
        <section id="s05" className={SECTION}>
          <div className={WRAP}>
            <ClaimPrivacy />
          </div>
        </section>

        {/* ══════════ 06 支持的账单 ══════════ */}
        <section id="s06" className={SECTION}>
          <div className={WRAP}>
            <ClaimSupported />
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

        {/* ══════════ 最终 CTA ══════════ */}
        <section className="border-t border-ink px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className={`${WRAP} text-center`}>
            <h2 className="mx-auto max-w-[16ch] text-[clamp(32px,5.6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
              现在就知道
              <br />
              你一年能省多少
            </h2>
            <p className="mt-6 text-[15.5px] leading-relaxed text-sub">
              导入一次账单,30 秒看到结果。不需要注册,账单不会离开你的设备。
            </p>
            <Link href="/upload" className="btn btn-ink mt-9 !px-10 !py-[1.05rem] !text-[15.5px]">
              开始分析账单
            </Link>
            <p className="mtag mt-5 text-[9px] text-sub">
              或在{" "}
              <Link href="/report?d=demo" className="linku text-ink">
                示例报告
              </Link>{" "}
              里先看一眼结果
            </p>
          </div>
        </section>

        {/* ══════════ 关掉账单之后:留下的怎么省 ══════════ */}
        <section className="border-t border-ink px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className={WRAP}>
            <p className="mtag text-[9.5px] text-sub">AFTER TRIMMING · 裁完之后</p>
            <div className="mt-5 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
              <Link href="/deals" className="group bg-paper px-5 py-6 transition-colors hover:bg-paperDeep">
                <p className="mtag text-[9.5px] text-rust">DEALS · 价格情报</p>
                <p className="mt-2.5 text-[17px] font-bold tracking-[-0.02em] text-ink">
                  留下的,怎么充最便宜
                </p>
                <p className="prose-sm mt-1.5 text-[13.5px]">
                  常见订阅的历史价格与建议出手时机,全是示例数据,不假装实时行情。
                </p>
              </Link>
              <Link href="/annual" className="group bg-paper px-5 py-6 transition-colors hover:bg-paperDeep">
                <p className="mtag text-[9.5px] text-sub">ANNUAL TRIM · 年度体检</p>
                <p className="mt-2.5 text-[17px] font-bold tracking-[-0.02em] text-ink">
                  一年后再体检一次
                </p>
                <p className="prose-sm mt-1.5 text-[13.5px]">
                  年度总支出 · 新增订阅 · 涨价记录,全部基于本机历史,不联网追踪。
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════ 打赏 ══════════ */}
        <section id="tip" className="scroll-mt-[58px] border-t border-ink px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className={WRAP}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-[clamp(24px,3.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
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
