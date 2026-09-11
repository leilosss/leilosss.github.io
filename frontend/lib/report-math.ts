// =============================================================
// report-math —— 全站唯一的金额口径(v2.1)
// 首页叙事、报告头条、账单清单、复制清单、裁剪小票、年度体检 全部从这里取值,
// 保证「首页说的数字」和「报告算出的数字」永远是同一个来源,不会各算各的。
//
// 铁律:**年化金额永不缺失**。
//   有实测周期(月/季/年)→ 按实测周期算;
//   周期未确认(账单只覆盖很短时间,某个订阅只出现一次)→ 按最普遍的
//   月付节奏推算 12 期,并由 isEstimated() 标出「估算」,UI 如实标注,
//   不做虚假断言。
// 这样就不会再出现「识别到 N 个订阅,却显示 ¥0 / YEAR」的情况。
// =============================================================
import type { Subscription } from "./types";

export type Cycle = "monthly" | "yearly";
export type DecisionMap = Record<string, "cut" | "keep">;

/** 未确认周期时的推算期数(订阅最常见的节奏是月付) */
const ASSUMED_PERIODS: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export const yuan = (n: number) => `¥${Math.round(n).toLocaleString("zh-CN")}`;

/** 周期单位后缀(英文大写字,与 YOU CAN CUT / POTENTIAL SAVINGS 同一语声) */
export const cycleUnit = (c: Cycle) => (c === "yearly" ? "/ YEAR" : "/ MONTH");

/**
 * 周期的单字后缀(行内单价用)。
 * 周期未确认时必须给「期」而不是取首字 —— 取 "周期待确认"[0] 会得到「周」,
 * 那是真实出现过的显示 bug(report-ledger 里曾有同名表)。
 */
export function periodShort(p: string): string {
  return p === "monthly" ? "月" : p === "quarterly" ? "季" : p === "yearly" ? "年" : "期";
}

/** 年化 → 按视图周期折算 */
export function perCycle(nAnnual: number, cycle: Cycle): number {
  return cycle === "yearly" ? nAnnual : nAnnual / 12;
}

/**
 * 单价 × 周期 → 年化(周期未确认按 12 期推算)。
 * 与 subAnnual 同一口径;价格监控里只有"单价 + 周期"两个数字,
 * 也需要年化才能算"一年多花多少",所以抽出来共用,不另立一套算法。
 */
export function annualOfAmount(amount: number, period: string): number {
  if (!(amount > 0)) return 0;
  return Math.round(amount * (ASSUMED_PERIODS[period] ?? 12));
}

/**
 * 单条订阅的年化金额 —— 全站唯一入口。
 * annual_amount 缺失时按周期推算(未确认周期按 12 期),金额为 0 时才返回 0。
 */
export function subAnnual(s: Subscription): number {
  if (s.annual_amount != null && s.annual_amount > 0) return Math.round(s.annual_amount);
  return annualOfAmount(s.amount, s.period);
}

/** 该条年化是否属于「推算」(账单未跑到一个完整周期)—— UI 用来如实标注 */
export function isEstimated(s: Subscription): boolean {
  return !(s.annual_amount != null && s.annual_amount > 0);
}

export function sumAnnual(subs: Subscription[]): number {
  return subs.reduce((n, s) => n + subAnnual(s), 0);
}

export interface SpendSplit {
  total: number;
  cut: number;
  keep: number;
  cutList: Subscription[];
  keepList: Subscription[];
}

/** 订阅集合 + 裁决 → 年化总额 / 可裁 / 保留(头条、清单、小票共用同一份结果) */
export function spendSplit(subs: Subscription[], decisions: DecisionMap): SpendSplit {
  const cutList: Subscription[] = [];
  const keepList: Subscription[] = [];
  for (const s of subs) {
    (decisions[String(s.id)] === "cut" ? cutList : keepList).push(s);
  }
  return {
    total: sumAnnual(subs),
    cut: sumAnnual(cutList),
    keep: sumAnnual(keepList),
    cutList,
    keepList,
  };
}

/** 年化 → 月均(用于「折合每月」这类次级口径) */
export const monthlyOf = (nAnnual: number) => nAnnual / 12;
