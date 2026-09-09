// =============================================================
// local-detect —— 订阅识别引擎(浏览器本地版,v12)
// 后端 services/detector.py 的 TypeScript 移植(隐私硬约束:粘贴文本在
// 浏览器内识别,不进任何网络请求;算法/关键词库与后端保持镜像)。
// 双策略:①关键词库匹配(70+ 条,最长关键词胜)②周期规律(同商户同金额
// 间隔中位数 → 月 24-36 / 季 85-110 / 年 320-400 天窗口)+ 文本周期提示。
// 输出与 lib/types.ts 的 DetectResult 契约完全一致,可直接渲染。
// =============================================================
import type { BillRow, DetectResult, Subscription } from "./types";

/* ---------- 关键词库(镜像 backend/services/keywords.py) ---------- */
interface Rule {
  name: string;
  category: string;
  keywords: string[];
  require_any?: string[];
  generic?: boolean;
}

const KEYWORD_RULES: Rule[] = [
  { name: "腾讯视频", category: "影音会员", keywords: ["腾讯视频"] },
  { name: "爱奇艺", category: "影音会员", keywords: ["爱奇艺", "奇艺果"] },
  { name: "优酷", category: "影音会员", keywords: ["优酷"] },
  { name: "芒果TV", category: "影音会员", keywords: ["芒果tv", "芒果视频"] },
  { name: "哔哩哔哩大会员", category: "影音会员", keywords: ["bilibili", "哔哩哔哩"], require_any: ["大会员", "会员", "vip", "年度"] },
  { name: "咪咕视频", category: "影音会员", keywords: ["咪咕视频", "咪咕会员"] },
  { name: "腾讯体育", category: "影音会员", keywords: ["腾讯体育"] },
  { name: "爱奇艺体育", category: "影音会员", keywords: ["爱奇艺体育"] },
  { name: "西瓜视频", category: "影音会员", keywords: ["西瓜视频会员"] },
  { name: "腾讯START云游戏", category: "游戏娱乐", keywords: ["start云游戏"] },
  { name: "网易云音乐", category: "音乐音频", keywords: ["网易云音乐", "云音乐"] },
  { name: "QQ音乐", category: "音乐音频", keywords: ["qq音乐", "qq绿钻", "豪华绿钻"] },
  { name: "酷狗音乐", category: "音乐音频", keywords: ["酷狗"] },
  { name: "酷我音乐", category: "音乐音频", keywords: ["酷我"] },
  { name: "喜马拉雅", category: "音乐音频", keywords: ["喜马拉雅"] },
  { name: "蜻蜓FM", category: "音乐音频", keywords: ["蜻蜓fm"] },
  { name: "荔枝FM", category: "音乐音频", keywords: ["荔枝fm", "荔枝播客"] },
  { name: "Apple Music", category: "音乐音频", keywords: ["apple music"], require_any: ["订阅", "续费", "会员"] },
  { name: "Spotify", category: "音乐音频", keywords: ["spotify", "声破天"] },
  { name: "YouTube Premium", category: "影音会员", keywords: ["youtube premium", "youtube music"] },
  { name: "百度网盘", category: "网盘云存储", keywords: ["百度网盘", "百度云盘"] },
  { name: "夸克网盘", category: "网盘云存储", keywords: ["夸克网盘", "夸克会员"] },
  { name: "阿里云盘", category: "网盘云存储", keywords: ["阿里云盘", "阿里云盘会员", "teambition"] },
  { name: "迅雷会员", category: "网盘云存储", keywords: ["迅雷会员", "迅雷超级会员", "迅雷svip"] },
  { name: "115网盘", category: "网盘云存储", keywords: ["115网盘", "115科技", "115会员"] },
  { name: "天翼云盘", category: "网盘云存储", keywords: ["天翼云盘"] },
  { name: "WPS会员", category: "效率工具", keywords: ["wps会员", "wps超级会员", "wps稻壳"] },
  { name: "坚果云", category: "网盘云存储", keywords: ["坚果云"] },
  { name: "iCloud", category: "网盘云存储", keywords: ["icloud"] },
  { name: "Google One", category: "网盘云存储", keywords: ["google one"] },
  { name: "Dropbox", category: "网盘云存储", keywords: ["dropbox"] },
  { name: "OneDrive", category: "网盘云存储", keywords: ["onedrive"] },
  { name: "微信读书", category: "阅读知识", keywords: ["微信读书"] },
  { name: "QQ阅读", category: "阅读知识", keywords: ["qq阅读", "阅文集团"] },
  { name: "起点读书", category: "阅读知识", keywords: ["起点读书", "起点中文网"] },
  { name: "掌阅", category: "阅读知识", keywords: ["掌阅", "ireader"] },
  { name: "知乎盐选", category: "阅读知识", keywords: ["知乎盐选", "知乎会员"] },
  { name: "得到", category: "阅读知识", keywords: ["得到app", "得到知识"] },
  { name: "樊登读书", category: "阅读知识", keywords: ["樊登读书", "樊登讲书"] },
  { name: "知识星球", category: "阅读知识", keywords: ["知识星球"] },
  { name: "百度文库", category: "阅读知识", keywords: ["百度文库"] },
  { name: "快看漫画", category: "阅读知识", keywords: ["快看漫画"] },
  { name: "腾讯动漫", category: "阅读知识", keywords: ["腾讯动漫"] },
  { name: "英语流利说", category: "阅读知识", keywords: ["流利说"] },
  { name: "欧路词典", category: "效率工具", keywords: ["欧路词典", "eudic"] },
  { name: "多邻国", category: "阅读知识", keywords: ["duolingo", "多邻国"] },
  { name: "京东PLUS会员", category: "电商生活", keywords: ["京东plus", "京东plus会员"] },
  { name: "淘宝88VIP", category: "电商生活", keywords: ["88vip", "88会员", "淘宝88"] },
  { name: "拼多多省钱月卡", category: "电商生活", keywords: ["省钱月卡", "拼多多月卡"] },
  { name: "美团会员", category: "电商生活", keywords: ["美团会员", "美团外卖会员"] },
  { name: "饿了么超级吃货卡", category: "电商生活", keywords: ["超级吃货卡", "饿了么会员"] },
  { name: "盒马X会员", category: "电商生活", keywords: ["盒马x会员", "盒马会员"] },
  { name: "山姆会员店", category: "电商生活", keywords: ["山姆会员", "sam's", "山姆超市会籍"] },
  { name: "云闪付会员", category: "电商生活", keywords: ["云闪付会员"] },
  { name: "顺丰会员", category: "电商生活", keywords: ["顺丰会员", "顺丰月卡"] },
  { name: "滴滴出行会员", category: "电商生活", keywords: ["滴滴会员", "滴滴出行会员"] },
  { name: "哈啰骑行月卡", category: "电商生活", keywords: ["哈啰单车", "哈啰骑行"] },
  { name: "青桔单车月卡", category: "电商生活", keywords: ["青桔单车"] },
  { name: "携程超级会员", category: "电商生活", keywords: ["携程会员"] },
  { name: "高德打车会员", category: "电商生活", keywords: ["高德会员"] },
  { name: "Keep会员", category: "电商生活", keywords: ["keep会员", "keep 会员"] },
  { name: "腾讯乘车码", category: "电商生活", keywords: ["乘车码月卡", "乘车码会员"] },
  { name: "迅游加速器", category: "游戏娱乐", keywords: ["迅游加速"] },
  { name: "UU加速器", category: "游戏娱乐", keywords: ["uu加速器", "网易uu"] },
  { name: "腾讯游戏加速", category: "游戏娱乐", keywords: ["腾讯游戏加速"] },
  { name: "任天堂Switch会员", category: "游戏娱乐", keywords: ["nintendo switch online", "switch online"] },
  { name: "PlayStation Plus", category: "游戏娱乐", keywords: ["playstation plus", "ps plus", "psn会员"] },
  { name: "Xbox Game Pass", category: "游戏娱乐", keywords: ["xbox game pass", "game pass"] },
  { name: "Steam", category: "游戏娱乐", keywords: ["steam钱包", "steam 会员"] },
  { name: "Netflix", category: "海外订阅", keywords: ["netflix", "奈飞"] },
  { name: "Disney+", category: "海外订阅", keywords: ["disney+", "disney plus"] },
  { name: "HBO Max", category: "海外订阅", keywords: ["hbo"] },
  { name: "Amazon Prime", category: "海外订阅", keywords: ["amazon prime", "prime video"] },
  { name: "ChatGPT Plus", category: "海外订阅", keywords: ["chatgpt", "openai", "open ai"] },
  { name: "Claude Pro", category: "海外订阅", keywords: ["anthropic", "claude pro"] },
  { name: "Midjourney", category: "海外订阅", keywords: ["midjourney"] },
  { name: "Grammarly", category: "海外订阅", keywords: ["grammarly"] },
  { name: "GitHub Copilot", category: "海外订阅", keywords: ["github copilot", "copilot pro"] },
  { name: "JetBrains", category: "海外订阅", keywords: ["jetbrains"] },
  { name: "Adobe Creative Cloud", category: "海外订阅", keywords: ["adobe", "creative cloud"] },
  { name: "Notion", category: "海外订阅", keywords: ["notion ai", "notion 会员"] },
  { name: "Figma", category: "海外订阅", keywords: ["figma"] },
  { name: "Slack", category: "海外订阅", keywords: ["slack"] },
  { name: "Zoom", category: "海外订阅", keywords: ["zoom meeting", "zoom 会员"] },
  { name: "Canva", category: "海外订阅", keywords: ["canva pro", "canva 会员"] },
  { name: "Microsoft 365", category: "效率工具", keywords: ["microsoft 365", "office 365", "microsoft office"] },
  { name: "Telegram Premium", category: "海外订阅", keywords: ["telegram premium"] },
  { name: "YouTube", category: "海外订阅", keywords: ["youtube"], require_any: ["premium", "会员", "订阅"] },
  { name: "周期性会员(未匹配库)", category: "其他", generic: true, keywords: ["自动续费", "自动扣费", "连续包月", "连续包年", "连续包季", "自动续订", "订阅服务", "会员续费", "vip自动"] },
];

const CATEGORIES = ["影音会员", "音乐音频", "网盘云存储", "阅读知识", "效率工具", "游戏娱乐", "电商生活", "海外订阅", "其他"];

/* ---------- 周期窗口与提示(镜像 detector.py) ---------- */
const PERIOD_WINDOWS: [string, number, number][] = [
  ["yearly", 320, 400],
  ["quarterly", 85, 110],
  ["monthly", 24, 36],
];
const HINT_PATTERNS: [RegExp, string][] = [
  [/包年|年费|年付|按年|\/年|每年/, "yearly"],
  [/包季|季付|每季|\/季|按季/, "quarterly"],
  [/包月|月付|按月|每月|连续包月|\/月/, "monthly"],
];

function matchRule(text: string): Rule | null {
  const t = text.toLowerCase();
  let named: Rule | null = null;
  let namedLen = 0;
  let generic: Rule | null = null;
  let genericLen = 0;
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (t.includes(kw) && (!rule.require_any || rule.require_any.some((r) => t.includes(r)))) {
        if (rule.generic) {
          if (kw.length > genericLen) {
            generic = rule;
            genericLen = kw.length;
          }
        } else if (kw.length > namedLen) {
          named = rule;
          namedLen = kw.length;
        }
        break;
      }
    }
  }
  return named || generic;
}

function toDt(s: string): Date | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}:\d{2}:\d{2})?/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function periodFromGaps(gaps: number[], hint: string | null): [string, number | null] {
  const med = gaps.length ? round1(median(gaps)) : null;
  if (med != null) {
    for (const [p, lo, hi] of PERIOD_WINDOWS) if (lo <= med && med <= hi) return [p, med];
  }
  return [hint ?? "unknown", med];
}

function periodHint(texts: string[]): string | null {
  let best: { pos: number; p: string } | null = null;
  for (const txt of texts) {
    for (const [re, p] of HINT_PATTERNS) {
      const m = txt.match(re);
      if (m && (best == null || m.index! < best.pos)) best = { pos: m.index!, p };
    }
  }
  return best?.p ?? null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 裁剪理由(v2.0)——**只从账单本身能证明的事实推断**,不臆造使用情况。
 * 账单里没有"是否使用"的证据,所以永不输出 UNUSED;那类判断留给用户。
 *   HIGH COST  年化 ≥ ¥600(一年一顿好饭的钱,值得复核)
 *   LOW SIGNAL 只出现 1–2 次,周期未确认(可能是试用/一次性)
 *   RECURRING  周期稳定的常规订阅
 */
function reasonFor(
  amt: number,
  annual: number | null,
  count: number,
  confidence: string,
  period: string,
): { reason: string; usage: string } {
  if (annual != null && annual >= 600) {
    return { reason: "HIGH COST", usage: `年化 ¥${annual.toFixed(0)} · 单价 ¥${amt} × ${period === "monthly" ? "12 个月" : "周期"}` };
  }
  if (count <= 2 || confidence === "low" || period === "unknown") {
    return { reason: "LOW SIGNAL", usage: `仅 ${count} 笔记录 · 周期未确认,请人工复核` };
  }
  return { reason: "RECURRING", usage: `已连续扣费 ${count} 次 · 周期稳定` };
}

/** 本地识别入口:输入解析后的账单行 → DetectResult(契约与后端一致;platform 为扩展字段,供「去取消」指引) */
export function detectLocal(rows: BillRow[], platform: "alipay" | "wechat" = "alipay"): DetectResult & { platform?: string } {
  const out = rows.filter((r) => r.direction === "out" && r.amount > 0);
  const dates = rows.map((r) => toDt(r.time)).filter(Boolean) as Date[];

  /* ---- 分组:商户归一化 + 金额 ---- */
  const acc = new Map<string, { merchant: string; amount: number; texts: string[]; times: string[]; rule: Rule | null; ruleHits: number }>();
  for (const r of out) {
    const text = `${r.counterparty} ${r.item} ${r.category}`.trim();
    const key = `${(r.counterparty || "").replace(/[\s　]/g, "").toLowerCase()}|${round2(r.amount)}`;
    const a = acc.get(key) ?? { merchant: r.counterparty, amount: r.amount, texts: [], times: [], rule: null, ruleHits: 0 };
    a.texts.push(text);
    a.times.push(r.time);
    const rule = matchRule(text);
    if (rule && a.rule == null) a.rule = rule;
    if (rule) a.ruleHits += 1;
    acc.set(key, a);
  }

  /* ---- 逐组判定 ---- */
  const subscriptions: Subscription[] = [];
  const flags: string[] = [];
  let seq = 0;
  for (const [, a] of acc) {
    const rule = a.rule;
    const count = a.times.length;
    const dtList = a.times.map(toDt).filter(Boolean) as Date[];
    const gaps: number[] = [];
    for (let i = 1; i < dtList.length; i++) {
      gaps.push(Math.round((dtList[i].getTime() - dtList[i - 1].getTime()) / 86400000));
    }
    const hint = periodHint(a.texts);
    const [period, med] = periodFromGaps(gaps, hint);
    const consistent = med != null && PERIOD_WINDOWS.some(([, lo, hi]) => lo <= med && med <= hi);

    let keep = false;
    if (rule && !rule.generic) keep = true;
    else if (rule?.generic && count >= 2) keep = true;
    else if (count >= 3 && consistent) keep = true;
    else if (count === 2 && (consistent || hint)) keep = true;
    if (!keep) continue;

    seq += 1;
    const named = rule && !rule.generic;
    /* 置信度(镜像后端):具名规则命中(任意次)= high;规则/规律中档 = medium;其余 low */
    let confidence: Subscription["confidence"] = "low";
    if (named) confidence = "high";
    else if ((rule && count >= 2) || (count >= 3 && consistent)) confidence = "medium";

    const amt = a.amount; // 分组键中的金额(round2,不受文本噪声影响)
    let annualAmount: number | null =
      period === "monthly" ? round2(amt * 12) :
      period === "quarterly" ? round2(amt * 4) :
      period === "yearly" ? round2(amt) :
      count >= 2 && dtList.length >= 2 ? (() => {
        const span = Math.max((dtList[dtList.length - 1].getTime() - dtList[0].getTime()) / 86400000, 1);
        return round2(amt * count * 365 / span);
      })() : null;
    void a.ruleHits;

    subscriptions.push({
      id: seq,
      name: named ? rule!.name : (a.merchant || "未知商户").slice(0, 24),
      merchant: a.merchant,
      source: named ? "keyword" : "periodic",
      period: period as Subscription["period"],
      amount: amt,
      annual_amount: annualAmount,
      occurrences: count,
      first_at: dtList[0] ? dtList[0].toISOString().slice(0, 10) : "",
      last_at: dtList[dtList.length - 1] ? dtList[dtList.length - 1].toISOString().slice(0, 10) : "",
      median_gap_days: med,
      confidence,
      category: named ? rule!.category : "其他",
      sample_text: a.texts[0].slice(0, 80),
      ...reasonFor(amt, annualAmount, count, confidence, period),
    });
    flags.push(`${(a.merchant || "").replace(/[\s　]/g, "").toLowerCase()}|${round2(amt)}`);
  }

  /* ---- 汇总 / 月度 / 品类 ---- */
  const total = round2(rows.reduce((n, r) => n + (r.direction === "out" ? r.amount : 0), 0));
  const annualTotal = round2(subscriptions.reduce((n, s) => n + (s.annual_amount ?? 0), 0));
  const byMonth = new Map<string, { out: number; sub: number }>();
  const flaggedSet = new Set(flags);
  for (const r of rows) {
    if (r.direction !== "out") continue;
    const m = (toDt(r.time)?.toISOString().slice(0, 7) ?? "unknown");
    const e = byMonth.get(m) ?? { out: 0, sub: 0 };
    e.out = round2(e.out + r.amount);
    const key = `${(r.counterparty || "").replace(/[\s　]/g, "").toLowerCase()}|${round2(r.amount)}`;
    if (flaggedSet.has(key)) e.sub = round2(e.sub + r.amount);
    byMonth.set(m, e);
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, e]) => ({ month, out: e.out, sub: e.sub }));
  const catMap = new Map<string, { annual: number; count: number }>();
  for (const s of subscriptions) {
    const c = catMap.get(s.category) ?? { annual: 0, count: 0 };
    c.annual = round2(c.annual + (s.annual_amount ?? 0));
    c.count += 1;
    catMap.set(s.category, c);
  }
  const categories = CATEGORIES.filter((c) => catMap.has(c)).map((c) => ({ category: c, ...catMap.get(c)! }));

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    platform,
    summary: {
      tx_count: out.length,
      out_total: total,
      in_total: round2(rows.reduce((n, r) => n + (r.direction === "in" ? r.amount : 0), 0)),
      date_start: dates.length ? dates.reduce((a, b) => (a < b ? a : b)).toISOString().slice(0, 10) : "",
      date_end: dates.length ? dates.reduce((a, b) => (a > b ? a : b)).toISOString().slice(0, 10) : "",
      sub_count: subscriptions.length,
      annual_total: annualTotal,
    },
    subscriptions,
    months,
    categories,
  };
}

function getAmount(text: string): string | null {
  const m = text.match(/(\d+(?:\.\d{1,2})?)/);
  return m ? m[1] : null;
}
void getAmount;
