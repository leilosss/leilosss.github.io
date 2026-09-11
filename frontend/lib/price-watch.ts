// =============================================================
// price-watch —— 价格监控(纯逻辑,不碰存储、不碰 DOM)
//
// 一句话:**Trim 免费版帮你看清花了多少钱,Pro 帮你盯着这些钱有没有变贵。**
//
// 这个模块只做一件事:把「同一个订阅在不同时间点的单价」比对出结论。
// 它**不猜**任何数字 —— 只有两次以上真实记录才会给出涨价/降价结论,
// 只有一次记录就老实说「已记录,下次导入才能比对」。
//
// 匹配身份(必须同时一致才比对,否则宁可显示 Price unverified):
//   服务名 + 地区 + 币种
// 周期与套餐**不进身份键** —— 否则「月付改年付」会被当成两个不同订阅,
// 而那恰恰是最该提醒用户的套餐变化。
//
// 五种信号(与 brief 一一对应):
//   increase    涨价      amount 升、周期不变
//   decrease    降价      amount 降、周期不变
//   plan-change 套餐变化  周期变了(月付 ↔ 年付 ↔ 季付)
//   promo-end   优惠结束  价格回到促销前水平(**推断**,文案里如实标注)
//   unverified  无法验证  数据不足或有冲突 —— 明确显示,不给任何推断
// =============================================================
import { annualOfAmount } from "./report-math";
import type { PeriodType, Subscription } from "./types";

export type SignalKind = "increase" | "decrease" | "plan-change" | "promo-end" | "unverified" | "tracking";
export type Advice = "keep" | "review" | "cut";

/** 一次记录到的价格(账单里某一期该订阅的单价) */
export interface PricePoint {
  amount: number;
  period: PeriodType;
  /** 记录日期 YYYY-MM-DD(取账单的扣费日) */
  at: string;
}

export interface WatchItem {
  /** 匹配身份:归一化服务名 | 地区 | 币种 */
  key: string;
  name: string;
  /** 地区(如 中国大陆 / 港区);未知时留空并在 UI 上显示未标注 */
  region: string;
  /** 币种(CNY / USD…);账单默认 CNY */
  currency: string;
  points: PricePoint[];
  /** 非空 = 无法验证的原因(有此字段时不产出任何涨跌推断) */
  unverified?: string;
}

export interface PriceSignal {
  item: WatchItem;
  kind: SignalKind;
  from?: PricePoint;
  to?: PricePoint;
  /** 涨跌幅(%,正=涨);仅 increase / decrease / plan-change 有 */
  pct?: number;
  annualFrom?: number;
  annualTo?: number;
  /** 一年多花的钱(正=多花,负=少花) */
  annualImpact?: number;
  advice?: Advice;
  /** 结论依据的出处(如实写"你的账单",不写"官方校验"——本机监控做不到官方校验) */
  source: "bill";
  /** 需要额外说明的地方(如"优惠结束"属推断) */
  note?: string;
}

export const PERIOD_CN: Record<string, string> = {
  monthly: "月付",
  quarterly: "季付",
  yearly: "年付",
  unknown: "周期待确认",
};

/** 服务名归一化:去掉空白/大小写差异,让"Netflix"与"netflix 会员"能对上 */
export function normalizeServiceName(name: string): string {
  return (name || "")
    .replace(/[\s　]/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/(会员|订阅|自动续费|续费|包月|包年|premium|plus|pro)$/i, "")
    .toLowerCase();
}

/** 匹配身份键:服务 + 地区 + 币种(周期/套餐刻意不入键,见文件头注释) */
export function watchKeyOf(name: string, region: string, currency: string): string {
  return [normalizeServiceName(name), region || "未知地区", currency || "CNY"].join("|");
}

/** 订阅 → 监控条目(账单里的一条订阅 = 一次价格记录) */
export function itemFromSubscription(sub: Subscription, at: string): WatchItem {
  const currency = "CNY"; // 账单口径:境内支付宝/微信流水均为人民币
  const region = "中国大陆";
  return {
    key: watchKeyOf(sub.merchant || sub.name, region, currency),
    name: sub.name,
    region,
    currency,
    points: [{ amount: sub.amount, period: sub.period, at: at.slice(0, 10) }],
  };
}

/** 合并一条价格记录(同期同价去重;按时间升序;最多留 24 个点) */
export function mergePoint(item: WatchItem, point: PricePoint): WatchItem {
  const dup = item.points.some((p) => p.at === point.at && p.amount === point.amount && p.period === point.period);
  if (dup) return item;
  const points = [...item.points, point].sort((a, b) => a.at.localeCompare(b.at)).slice(-24);
  return { ...item, points };
}

export function mergeItem(items: WatchItem[], item: WatchItem): WatchItem[] {
  const i = items.findIndex((x) => x.key === item.key);
  if (i < 0) return [...items, item];
  const merged = item.points.reduce(mergePoint, items[i]);
  const next = [...items];
  next[i] = merged;
  return next;
}

/** 涨跌幅(%):保留 1 位小数 */
function pctOf(from: number, to: number): number {
  if (!(from > 0)) return 0;
  return Math.round(((to - from) / from) * 1000) / 10;
}

/**
 * 一年要多花 / 少花多少(正 = 多花)。
 * 单价 × 周期 → 年化,再相减;周期口径与全站一致(走 report-math)。
 */
export function annualImpactOf(from: PricePoint, to: PricePoint): number {
  return annualOfAmount(to.amount, to.period) - annualOfAmount(from.amount, from.period);
}

/**
 * 建议(只给方向,不下命令):
 *   降价 / 年化变便宜            → KEEP
 *   涨价                         → REVIEW(值得重新考虑)
 *   涨幅 ≥ 25% 且一年多花 ≥ ¥200,或一年多花 ≥ ¥400 → CUT(重新评估是否值得留)
 *   优惠结束                     → REVIEW
 * **相对涨幅与绝对金额要同时够大**,才配得上"建议裁掉":
 *   ¥5 → ¥6 是 +20%,但一年只多 ¥12,为它退订不划算 —— 这类只提示复核。
 * 涨价是"该重新看一眼"的信号,不是"必须退订"的命令。
 */
export function adviceOf(kind: SignalKind, pct?: number, annualImpact?: number): Advice | undefined {
  const up = pct ?? 0;
  const impact = annualImpact ?? 0;
  switch (kind) {
    case "decrease":
      return "keep";
    case "increase":
      return (up >= 25 && impact >= 200) || impact >= 400 ? "cut" : "review";
    case "plan-change":
      return impact <= 0 ? "keep" : "review";
    case "promo-end":
      return "review";
    case "unverified":
    case "tracking":
      return undefined;
    default:
      return undefined;
  }
}

/** 单个条目 → 信号(不足两次记录 = tracking;无变化 = null,不制造噪音) */
export function signalOf(item: WatchItem): PriceSignal | null {
  if (item.unverified) {
    return { item, kind: "unverified", source: "bill", note: item.unverified };
  }
  const ps = item.points;
  if (ps.length < 2) {
    return { item, kind: "tracking", source: "bill" };
  }
  const from = ps[ps.length - 2];
  const to = ps[ps.length - 1];
  if (!(from.amount > 0) || !(to.amount > 0)) {
    return { item, kind: "unverified", source: "bill", note: "有一期金额缺失,无法比对" };
  }

  const annualFrom = annualOfAmount(from.amount, from.period);
  const annualTo = annualOfAmount(to.amount, to.period);
  const annualImpact = annualTo - annualFrom;

  // 周期变了 = 套餐变化(月付改年付这类,年化可能反而更便宜 —— 这正是要告诉用户的)
  if (from.period !== to.period) {
    return {
      item, kind: "plan-change", from, to,
      annualFrom, annualTo, annualImpact,
      // ⚠️ 百分比走**年化**口径:月付 ¥25 改年付 ¥188,单价是 +652%,
      // 但一年其实少花 ¥112。拿单价涨幅当结论会彻底误导人。
      pct: annualFrom > 0 ? Math.round(((annualTo - annualFrom) / annualFrom) * 1000) / 10 : 0,
      advice: adviceOf("plan-change", undefined, annualImpact),
      source: "bill",
      note: `计费周期从「${PERIOD_CN[from.period] ?? from.period}」变成「${PERIOD_CN[to.period] ?? to.period}」,百分比按年化折算`,
    };
  }

  if (to.amount === from.amount) return null; // 没变就不报,不制造噪音

  if (to.amount > from.amount) {
    // 是否只是优惠期结束:再往前的价格本来就比上一期高,现在回到了那个水平
    const before = ps[ps.length - 3];
    if (before && before.period === to.period && before.amount >= to.amount && from.amount < before.amount) {
      return {
        item, kind: "promo-end", from, to,
        annualFrom, annualTo, annualImpact,
        pct: pctOf(from.amount, to.amount),
        advice: adviceOf("promo-end"),
        source: "bill",
        note: "价格回到优惠前的水平(推断:折扣期结束,非平台调价)",
      };
    }
    return {
      item, kind: "increase", from, to,
      annualFrom, annualTo, annualImpact,
      pct: pctOf(from.amount, to.amount),
      advice: adviceOf("increase", pctOf(from.amount, to.amount), annualImpact),
      source: "bill",
      note: "若你主动换过套餐,这条不适用",
    };
  }

  return {
    item, kind: "decrease", from, to,
    annualFrom, annualTo, annualImpact,
    pct: pctOf(from.amount, to.amount),
    advice: adviceOf("decrease"),
    source: "bill",
    note: "同样可能是短期折扣,别急着当成永久降价",
  };
}

/** 全部条目的信号(涨价排前面、金额大的排前面 —— 用户最该先看什么) */
export function signalsOf(items: WatchItem[]): PriceSignal[] {
  const rank: Record<SignalKind, number> = { increase: 0, "promo-end": 1, "plan-change": 2, decrease: 3, unverified: 4, tracking: 5 };
  return items
    .map(signalOf)
    .filter((s): s is PriceSignal => s !== null)
    .sort((a, b) => {
      const r = rank[a.kind] - rank[b.kind];
      if (r !== 0) return r;
      return Math.abs(b.annualImpact ?? 0) - Math.abs(a.annualImpact ?? 0);
    });
}

/** 涨价的年化合计(用于"这些涨价一共让你一年多花多少") */
export function totalIncrease(signals: PriceSignal[]): number {
  return signals
    .filter((s) => s.kind === "increase" || s.kind === "promo-end")
    .reduce((n, s) => n + Math.max(0, s.annualImpact ?? 0), 0);
}
