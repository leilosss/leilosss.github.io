// =============================================================
// ReportHeadline —— 报告价值头条(v2.0 · 报告页最重要的位置)
// 账单式层级:
//   YOUR SUBSCRIPTION BILL → ¥3,936 / YEAR(现状)
//   ▸ YOU CAN CUT ¥1,836 / YEAR · N SUBSCRIPTIONS(价值,红色最大)
//   四格指标 TOTAL / CUT / KEEP / SAVE + MONTHLY|YEARLY 切换
// 克制:不做金融 Dashboard,信息像一张高级账单。
// =============================================================
"use client";

import * as React from "react";

import type { Subscription } from "@/lib/types";

type Cycle = "monthly" | "yearly";

const yuan = (n: number) => `¥${Math.round(n).toLocaleString("zh-CN")}`;

/** 年化 → 按视图周期折算 */
function per(nAnnual: number, cycle: Cycle): number {
  return cycle === "yearly" ? nAnnual : nAnnual / 12;
}

export function ReportHeadline({
  subs,
  decisions,
  annualTotal,
  isDemo,
  generatedAt,
  cycle,
  onCycle,
}: {
  subs: Subscription[];
  decisions: Record<string, "cut" | "keep">;
  annualTotal: number;
  isDemo: boolean;
  generatedAt: string;
  cycle: Cycle;
  onCycle: (c: Cycle) => void;
}) {
  const cutList = subs.filter((s) => decisions[String(s.id)] === "cut");
  const keepList = subs.filter((s) => decisions[String(s.id)] !== "cut");
  const cutAnnual = cutList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const keepAnnual = keepList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const unit = cycle === "yearly" ? "/ 年" : "/ 月";

  return (
    <header className="px-5 pt-8 sm:px-8 sm:pt-10">
      {/* 眉行:标题 + 元信息 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="mtag text-[10px] text-sub">
          YOUR SUBSCRIPTION BILL · {cycle === "yearly" ? "YEARLY SPEND" : "MONTHLY SPEND"}
        </p>
        <p className="mtag flex flex-wrap items-center gap-x-3 text-[9px] text-sub/80">
          <span className="num">{generatedAt}</span>
          {isDemo && <span className="text-rust">DEMO · 示例数据</span>}
        </p>
      </div>

      {/* 现状总额 */}
      <p className="figure figure-lg mt-4 text-ink">
        {yuan(per(annualTotal, cycle))}
        <span className="mtag ml-2 align-top text-[10px] text-sub">{unit}</span>
      </p>
      <p className="prose-sm mt-1.5 text-[13.5px]">
        {subs.length} 个订阅 · 全部为周期性扣费
      </p>

      {/* ★ 核心价值:能省多少(红色最大字,页面第一视觉重心) */}
      <div className="mt-7 border-t-2 border-rust pt-6">
        <p className="mtag text-[10px] text-rust">YOU CAN CUT · 你可以裁掉</p>
        <p className="figure figure-xl mt-3 text-rust">
          {yuan(per(cutAnnual, cycle))}
          <span className="mtag ml-2 align-top text-[11px] text-rust/70">{unit}</span>
        </p>
        <p className="mtag mt-3 text-[11px] text-ink">
          POTENTIAL SAVINGS · {cutList.length} 个订阅 · 已按账单证据自动标记
        </p>
      </div>

      {/* 四格指标 + 周期切换 */}
      <div className="mt-8 flex items-center justify-between gap-4 border-b border-ink/15 pb-2.5">
        <p className="mtag text-[9.5px] text-sub">明细口径</p>
        <div className="mtag flex items-center gap-4 text-[9.5px]">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => onCycle(c)}
              aria-pressed={cycle === c}
              className={
                cycle === c
                  ? "text-ink underline decoration-rust decoration-2 underline-offset-[5px]"
                  : "text-sub transition-colors hover:text-ink"
              }
            >
              {c === "monthly" ? "MONTHLY" : "YEARLY"}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px border border-ink/15 bg-ink/15 md:grid-cols-4">
        {[
          { k: "TOTAL", label: "订阅总额", v: per(annualTotal, cycle), tone: "ink" },
          { k: "CUT", label: `裁掉 ${cutList.length} 项`, v: per(cutAnnual, cycle), tone: "rust" },
          { k: "KEEP", label: `保留 ${keepList.length} 项`, v: per(keepAnnual, cycle), tone: "ink" },
          // SAVE 换口径,避免与头条重复:显示另一个周期的节省额
          {
            k: "SAVE",
            label: cycle === "yearly" ? "折合每月" : "折合每年",
            v: cycle === "yearly" ? cutAnnual / 12 : cutAnnual,
            tone: "rust",
          },
        ].map((c) => (
          <div key={c.k} className="bg-paper px-5 py-6">
            <dt className="mtag text-[9px] text-sub">{c.k}</dt>
            <dd className={`figure figure-md mt-3 ${c.tone === "rust" ? "text-rust" : "text-ink"}`}>
              {yuan(c.v)}
            </dd>
            <dd className="prose-sm mt-1.5 text-[12.5px]">{c.label}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

export type { Cycle };
