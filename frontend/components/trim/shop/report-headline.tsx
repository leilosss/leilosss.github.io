// =============================================================
// ReportHeadline —— 报告价值头条(v2.1 · 报告页最重要的位置)
// 3 秒内必须回答两个问题:
//   我一年花多少钱?   → YEARLY SPEND   ¥3,936 / YEAR
//   我一年能省多少钱? → YOU CAN CUT    ¥1,836 / YEAR
// 金额全部取自 lib/report-math(与首页叙事、清单、小票同源),
// 年化永不缺失,因此这里不会再出现 ¥0 / YEAR(v2.0 的 ¥0 bug)。
// 克制:不做金融 Dashboard,信息像一张高级账单。
// =============================================================
"use client";

import * as React from "react";

import { cycleUnit, isEstimated, monthlyOf, spendSplit, yuan, type Cycle, type DecisionMap } from "@/lib/report-math";
import type { Subscription } from "@/lib/types";

export function ReportHeadline({
  subs,
  decisions,
  isDemo,
  generatedAt,
  cycle,
  onCycle,
}: {
  subs: Subscription[];
  decisions: DecisionMap;
  isDemo: boolean;
  generatedAt: string;
  cycle: Cycle;
  onCycle: (c: Cycle) => void;
}) {
  const { total, cut, keep, cutList, keepList } = spendSplit(subs, decisions);
  const per = (n: number) => (cycle === "yearly" ? n : monthlyOf(n));
  const unit = cycleUnit(cycle);

  /* 推算口径的条数(账单跨度不足一个周期时如实标注,不做虚假断言) */
  const estimated = subs.filter(isEstimated).length;
  const hasCut = cutList.length > 0;

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

      {/* 问题一:我一年花多少钱 */}
      <p className="figure figure-lg mt-4 text-ink">
        {yuan(per(total))}
        <span className="mtag ml-2 align-top text-[10px] text-sub">{unit}</span>
      </p>
      <p className="prose-sm mt-1.5 text-[13.5px]">
        {subs.length} 个订阅 · 全部为周期性扣费
        {estimated > 0 && <span className="text-sub/80"> · 其中 {estimated} 项按 12 期估算</span>}
      </p>

      {/* ★ 问题二:我一年能省多少钱(红色最大字,页面第一视觉重心) */}
      <div className="mt-7 border-t-2 border-rust pt-6">
        <p className="mtag text-[10px] text-rust">YOU CAN CUT · 你可以裁掉</p>
        {hasCut ? (
          <>
            <p className="figure figure-xl mt-3 text-rust">
              {yuan(per(cut))}
              <span className="mtag ml-2 align-top text-[11px] text-rust/70">{unit}</span>
            </p>
            <p className="mtag mt-3 text-[11px] text-ink">
              POTENTIAL SAVINGS · 裁掉 {cutList.length} 个订阅
              {cycle === "yearly" && <span className="text-sub"> · 折合每月 ¥{Math.round(monthlyOf(cut)).toLocaleString("zh-CN")}</span>}
            </p>
          </>
        ) : (
          /* 0 项可裁:不渲染 ¥0 大数字,改为下一步动作 */
          <>
            <p className="figure figure-lg mt-3 text-ink">全部保留</p>
            <p className="mtag mt-3 text-[11px] text-sub">
              POTENTIAL SAVINGS · 暂无可裁项 —— 点任意一条的 CUT,即可看到能省多少
            </p>
          </>
        )}
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
          { k: "TOTAL", label: "订阅总额", v: yuan(per(total)), tone: "ink" },
          // 空分组不显示 ¥0(读起来像故障)—— 用「—」表示「这项不适用」
          { k: "CUT", label: `裁掉 ${cutList.length} 项`, v: hasCut ? yuan(per(cut)) : "—", tone: "rust" },
          { k: "KEEP", label: `保留 ${keepList.length} 项`, v: keepList.length ? yuan(per(keep)) : "—", tone: "ink" },
          // SAVE 换口径,避免与头条重复:显示另一个周期的节省额
          {
            k: "SAVE",
            label: cycle === "yearly" ? "折合每月" : "折合每年",
            v: hasCut ? yuan(cycle === "yearly" ? monthlyOf(cut) : cut) : "—",
            tone: "rust",
          },
        ].map((c) => (
          <div key={c.k} className="bg-paper px-5 py-6">
            <dt className="mtag text-[9px] text-sub">{c.k}</dt>
            <dd className={`figure figure-md mt-3 ${c.tone === "rust" ? "text-rust" : "text-ink"}`}>
              {c.v}
            </dd>
            <dd className="prose-sm mt-1.5 text-[12.5px]">{c.label}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

export type { Cycle };
