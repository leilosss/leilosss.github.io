// =============================================================
// ProductPanel —— 首屏的「产品本身」(v2.7)
//
// 设计原则:Don't decorate the product. Show the product.
// 首屏不解释产品,直接把产品**已经算完的结果**摊在纸面上:
//   年度订阅支出 → 逐条订阅与判定 → 可省金额
// 这不是插画,也不是概念稿:面板里的每一行、每一个数字都来自
// lib/sample-report + lib/report-math + lib/triage ——
// 与报告页算的是同一套,首页永远不可能与产品分叉。
//
// 唯一的动效:进入视口后逐条划下红线(220ms/条,与报告页同一节奏),
// 一次性播完即静止;reduce 下直接落终态。
// =============================================================
"use client";

import * as React from "react";

import { useInViewOnce } from "@/components/trim/reveal";
import { monthlyOf, periodShort, spendSplit, sumAnnual, yuan } from "@/lib/report-math";
import { demoInitialCut, sampleReport } from "@/lib/sample-report";
import { TIER_META, tierOf, type Tier } from "@/lib/triage";
import type { Subscription } from "@/lib/types";

const SAMPLE = sampleReport();
const SUBS = SAMPLE.subscriptions;
const TOTAL = sumAnnual(SUBS);
const SPLIT = spendSplit(SUBS, demoInitialCut(SUBS));

/** 面板里显示几条(其余用一行「另有 N 项」收口,不把首屏撑长) */
const ROWS = 6;
const SHOWN = SUBS.slice(0, ROWS);

/** 档位记号:三档各自的纸面记号(与报告页/分析节同一套语言) */
export function TierTag({ tier, className = "", style }: { tier: Tier; className?: string; style?: React.CSSProperties }) {
  const base = "mtag inline-block shrink-0 px-1.5 py-[3px] text-[8px] leading-none";
  const skin =
    tier === "cut"
      ? "bg-rust text-paper"
      : tier === "review"
        ? "border border-rust/60 text-rust"
        : "border border-ink/30 text-ink";
  return (
    <span className={`${base} ${skin} ${className}`} style={style}>
      {TIER_META[tier].en}
    </span>
  );
}

function PanelRow({ sub, i, struck }: { sub: Subscription; i: number; struck: boolean }) {
  const tier = tierOf(sub);
  const cut = tier === "cut" && struck;
  // 逐条延迟写在 CSS 变量上(划痕由 ::after 的 transition-delay 读取)
  const delay = `${i * 200}ms`;
  return (
    <li className="flex items-center gap-x-3 border-b border-ink/12 px-4 py-2.5 last:border-b-0 sm:px-5">
      {/* 名字自身 inline-block:划痕只覆盖文字宽度,不会拉成一条横贯整行的横线 */}
      <span className="min-w-0 flex-1">
        <span
          className={`cut-strike inline-block max-w-full truncate align-bottom text-[14.5px] font-semibold tracking-[-0.01em] transition-colors duration-300 ${
            cut ? "is-cut text-sub" : "text-ink"
          }`}
          style={{ "--strike-delay": delay } as React.CSSProperties}
        >
          {sub.name}
        </span>
      </span>
      <span className={`num shrink-0 text-[13.5px] font-semibold ${cut ? "text-sub" : "text-ink"}`}>
        {yuan(sub.amount)}
        <span className="text-[10.5px] font-normal text-sub/70">/{periodShort(sub.period)}</span>
      </span>
      <TierTag
        tier={tier}
        style={
          tier === "cut"
            ? {
                opacity: struck ? 1 : 0,
                transition: "opacity .25s ease",
                transitionDelay: `${i * 200 + 140}ms`,
              }
            : undefined
        }
      />
    </li>
  );
}

export function ProductPanel() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.15);
  const [struck, setStruck] = React.useState(false);

  React.useEffect(() => {
    if (!on) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduce ? 0 : 260;
    const t = window.setTimeout(() => setStruck(true), delay);
    return () => window.clearTimeout(t);
  }, [on]);

  return (
    <div ref={ref} className="relative">
      {/* 底层纸:错位 6px 的硬棱(纸张堆叠,无模糊阴影) */}
      <span aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-ink/25" />

      <div className="relative border border-ink bg-paper">
        {/* 面板头 */}
        <div className="flex items-center justify-between gap-x-4 border-b border-ink px-4 py-2.5 sm:px-5">
          <p className="mtag text-[9px] text-ink">TRIM REPORT</p>
          <p className="mtag text-[9px] text-rust">DEMO · 示例数据</p>
        </div>

        {/* 一年花了多少 */}
        <div className="border-b border-ink/15 px-4 py-5 sm:px-5">
          <p className="mtag text-[9px] text-sub">YEARLY SPEND · 年度订阅支出</p>
          <p className="figure figure-md num mt-2.5 text-ink">
            {yuan(TOTAL)}
            <span className="mtag ml-2 align-top text-[10px] font-normal text-sub">/ YEAR</span>
          </p>
          <p className="prose-sm mt-1.5 text-[12.5px]">
            {SUBS.length} 个订阅被识别 · 支付宝账单 · 12 个月
          </p>
        </div>

        {/* 逐条 */}
        <ul>
          {SHOWN.map((s, i) => (
            <PanelRow key={s.id} sub={s} i={i} struck={struck} />
          ))}
        </ul>
        <div className="border-t border-ink/12 px-4 py-2 sm:px-5">
          <p className="mtag text-[9px] text-sub">
            另有 {SUBS.length - ROWS} 项 · 共 {SUBS.length} 项
          </p>
        </div>

        {/* 一年能省多少 */}
        <div className="border-t-2 border-rust px-4 py-5 sm:px-5">
          <p className="mtag text-[9px] text-rust">YOU CAN CUT · 可省</p>
          <p
            className="figure figure-md num mt-2.5 text-rust transition-opacity duration-500"
            style={{ opacity: struck ? 1 : 0.35 }}
          >
            {yuan(SPLIT.cut)}
            <span className="mtag ml-2 align-top text-[10px] font-normal text-rust/70">/ YEAR</span>
          </p>
          <p className="mtag mt-2 text-[9px] text-ink">
            裁掉 {SPLIT.cutList.length} 个订阅 · 折合每月 {yuan(monthlyOf(SPLIT.cut))}
          </p>
        </div>
      </div>
    </div>
  );
}
