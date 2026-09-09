// =============================================================
// 示例报告(DEMO 模式)—— v2.0 数据源
// 免注册、免账单即可完整体验产品价值(Try Demo 路径)。
// 口径(与首页叙事、报告头条完全一致):
//   8 个订阅 · 月 ¥328 · 年 ¥3,936
//   建议 CUT 3 项 = 月 ¥153 = **年 ¥1,836**(Adobe 68 + 健身 60 + 效率 25)
//   保留 5 项 = 月 ¥175 = 年 ¥2,100
// 每条带 reason(裁剪/保留理由)与 usage(使用情况),让报告不只是数字。
// =============================================================
import type { DetectResult, Subscription } from "./types";

function month(m: number, sub: number): { month: string; out: number; sub: number } {
  const mm = String(m).padStart(2, "0");
  return { month: `2026-${mm}`, out: sub + Math.round(sub * 0.7 + m * 7), sub };
}

const SUBS: Subscription[] = [
  {
    id: 1, name: "Adobe Creative Cloud", merchant: "Adobe", source: "keyword", period: "monthly",
    amount: 68, annual_amount: 816, occurrences: 7, first_at: "2026-03-01", last_at: "2026-09-01",
    median_gap_days: 30, confidence: "high", category: "效率工具", sample_text: "Adobe 创意应用 自动续费",
    reason: "HIGH COST", usage: "单价最高的一项 · 近 6 个月无使用记录",
  },
  {
    id: 2, name: "健身 App 会员", merchant: "健身服务", source: "keyword", period: "monthly",
    amount: 60, annual_amount: 720, occurrences: 6, first_at: "2026-04-01", last_at: "2026-09-01",
    median_gap_days: 30, confidence: "high", category: "电商生活", sample_text: "健身会员 连续包月",
    reason: "UNUSED", usage: "办卡后仅前两周有使用",
  },
  {
    id: 3, name: "效率工具 Pro", merchant: "工具服务", source: "keyword", period: "monthly",
    amount: 25, annual_amount: 300, occurrences: 6, first_at: "2026-04-02", last_at: "2026-09-02",
    median_gap_days: 30, confidence: "high", category: "效率工具", sample_text: "效率工具 Pro 订阅",
    reason: "DUPLICATE", usage: "与已订阅的云盘功能重叠",
  },
  {
    id: 4, name: "云盘会员", merchant: "网盘服务商", source: "keyword", period: "monthly",
    amount: 65, annual_amount: 780, occurrences: 8, first_at: "2026-02-01", last_at: "2026-09-01",
    median_gap_days: 30, confidence: "high", category: "网盘云存储", sample_text: "云盘会员 自动续费",
    reason: "ACTIVE", usage: "存储已用 82% · 每周同步",
  },
  {
    id: 5, name: "Netflix", merchant: "Netflix", source: "keyword", period: "monthly",
    amount: 49, annual_amount: 588, occurrences: 9, first_at: "2026-01-05", last_at: "2026-09-05",
    median_gap_days: 30, confidence: "high", category: "影音会员", sample_text: "Netflix 会员 自动续费",
    reason: "ACTIVE", usage: "近 30 天观看 12 次",
  },
  {
    id: 6, name: "阅读会员", merchant: "阅读服务", source: "keyword", period: "monthly",
    amount: 40, annual_amount: 480, occurrences: 8, first_at: "2026-02-10", last_at: "2026-09-10",
    median_gap_days: 30, confidence: "medium", category: "阅读知识", sample_text: "阅读会员 月付",
    reason: "ACTIVE", usage: "每周阅读 3 次以上",
  },
  {
    id: 7, name: "Spotify", merchant: "Spotify", source: "keyword", period: "monthly",
    amount: 15, annual_amount: 180, occurrences: 7, first_at: "2026-03-15", last_at: "2026-09-15",
    median_gap_days: 30, confidence: "high", category: "音乐音频", sample_text: "Spotify Premium 订阅",
    reason: "ACTIVE", usage: "几乎每天播放",
  },
  {
    id: 8, name: "iCloud 存储", merchant: "Apple", source: "keyword", period: "monthly",
    amount: 6, annual_amount: 72, occurrences: 9, first_at: "2026-01-02", last_at: "2026-09-02",
    median_gap_days: 30, confidence: "high", category: "网盘云存储", sample_text: "iCloud 50GB 月度订阅",
    reason: "ACTIVE", usage: "系统备份依赖项 · 单价低",
    prev_amount: 5, // v2.0 价格监测示例:¥5 → ¥6
  },
];

export function sampleReport(): DetectResult {
  const subs = SUBS.map((s) => ({ ...s }));
  const months = Array.from({ length: 9 }, (_, i) => month(i + 1, i === 8 ? 175 : 328));
  return {
    ok: true,
    generated_at: "2026-09-08T10:00:00",
    platform: "alipay",
    summary: {
      tx_count: 261,
      out_total: 688.66,
      in_total: 0,
      date_start: "2026-06-08",
      date_end: "2026-09-08",
      sub_count: subs.length,
      annual_total: 3936, // 月 328 × 12
    },
    subscriptions: subs,
    months,
    categories: [
      { category: "效率工具", annual: 816 + 300, count: 2 },
      { category: "网盘云存储", annual: 780 + 72, count: 2 },
      { category: "影音会员", annual: 588, count: 1 },
      { category: "电商生活", annual: 720, count: 1 },
      { category: "阅读知识", annual: 480, count: 1 },
      { category: "音乐音频", annual: 180, count: 1 },
    ],
  };
}

/** DEMO 默认建议:前 3 项(HIGH COST / UNUSED / DUPLICATE)= CUT,年省 ¥1,836 */
export function demoInitialCut(subs: Subscription[]): Record<string, "cut" | "keep"> {
  const map: Record<string, "cut" | "keep"> = {};
  subs.forEach((s) => {
    map[String(s.id)] = s.reason && s.reason !== "ACTIVE" ? "cut" : "keep";
  });
  return map;
}

/** 首页叙事用的四个"看起来很小"的单价(与 demo 同源) */
export const SMALL_PRICES = [49, 68, 25, 60] as const;
