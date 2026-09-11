// =============================================================
// triage —— 三档初裁(CUT / REVIEW / KEEP)
//
// 为什么是三档:识别引擎自己就会说「周期未确认,请人工复核」(LOW SIGNAL)。
// 这类项既不该被划掉,也不该被无脑保留,于是单独立一档 REVIEW ——
// 「证据不足,你来判断」比强行二分更诚实。
//
// 判定只依据账单能证明的证据(语义与 local-detect.reasonFor 同一套):
//   CUT    高单价(HIGH COST);示例数据里的长期不用 / 功能重叠
//   REVIEW 周期未确认(LOW SIGNAL)、置信度非 high、检测到涨价
//   KEEP   周期稳定的常规订阅
//
// 首页与报告展示共用这一份口径,不各写一套。
// =============================================================
import type { Subscription } from "./types";

export type Tier = "cut" | "review" | "keep";

export const TIER_META: Record<Tier, { en: string; cn: string; note: string }> = {
  cut: { en: "CUT", cn: "建议裁掉", note: "证据充分,可以停" },
  review: { en: "REVIEW", cn: "建议复核", note: "证据不足,你自己判断" },
  keep: { en: "KEEP", cn: "建议保留", note: "周期稳定的常规订阅" },
};

/** 理由标签的中文注解(只解释账单能证明的事) */
export const REASON_CN: Record<string, string> = {
  "HIGH COST": "高单价",
  UNUSED: "长期闲置",
  DUPLICATE: "重复功能",
  "LOW SIGNAL": "周期未确认",
  RECURRING: "周期稳定",
  ACTIVE: "在用",
};

/** 单条订阅的初裁档位(纯函数,无副作用) */
export function tierOf(s: Subscription): Tier {
  const r = s.reason ?? "";
  if (r === "HIGH COST" || r === "UNUSED" || r === "DUPLICATE") return "cut";
  if (r === "LOW SIGNAL") return "review";
  if (s.confidence === "medium" || s.confidence === "low") return "review";
  if (s.prev_amount != null && s.prev_amount < s.amount) return "review"; // 涨价项值得复核
  return "keep";
}

export interface TierSplit<T extends Subscription> {
  cut: T[];
  review: T[];
  keep: T[];
}

/**
 * 这一条为什么在这个档位(界面上的那行小字)。
 * REVIEW 档必须说清楚"哪一点证据不足":涨价 / 记录太少,而不是笼统写「在用」——
 * 笼统的理由会让复核档看起来像随便分的。
 */
export function tierNote(s: Subscription): string {
  const tier = tierOf(s);
  if (tier === "review") {
    if (s.prev_amount != null && s.prev_amount < s.amount) return `涨价 ¥${s.prev_amount} → ¥${s.amount}`;
    if (s.confidence !== "high") return "周期未完全确认";
    return "需要你判断";
  }
  return s.reason ? (REASON_CN[s.reason] ?? s.reason) : TIER_META[tier].note;
}

/** 按档位分组(顺序恒为 CUT → REVIEW → KEEP) */
export function triageSplit<T extends Subscription>(subs: T[]): TierSplit<T> {
  const out: TierSplit<T> = { cut: [], review: [], keep: [] };
  for (const s of subs) out[tierOf(s)].push(s);
  return out;
}

/** 档位显示顺序(渲染循环用,避免各处硬写数组) */
export const TIERS: Tier[] = ["cut", "review", "keep"];
