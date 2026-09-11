// =============================================================
// 首页章节(v2.7 长页)
// 报纸排版逻辑:左侧章节编号 + 右侧粗体标题,超大数字与极小注释成对比。
//
// 数据纪律(v2.3 起不变):所有数字来自 lib/sample-report + lib/report-math,
// 档位判定来自 lib/triage —— 与报告页算的是同一套,首页不另写一份。
// 全站不写"账单证明不了的事":识别引擎只输出高单价 / 周期未确认 / 周期稳定,
// 示例里的「长期闲置 / 重复功能」全程标注为示例,不冒充产品能力。
// =============================================================
"use client";

import * as React from "react";

import { TierTag } from "@/components/trim/home/product-panel";
import { useInViewOnce } from "@/components/trim/reveal";
import { monthlyOf, periodShort, spendSplit, subAnnual, sumAnnual, yuan } from "@/lib/report-math";
import { SMALL_PRICES, demoInitialCut, sampleReport } from "@/lib/sample-report";
import { REASON_CN, TIER_META, TIERS, tierNote, triageSplit, type Tier } from "@/lib/triage";
import type { Subscription } from "@/lib/types";

const SAMPLE = sampleReport();
const SAMPLE_SPEND = sumAnnual(SAMPLE.subscriptions);
const SAMPLE_CUT = spendSplit(SAMPLE.subscriptions, demoInitialCut(SAMPLE.subscriptions));
const SAMPLE_TIERS = triageSplit(SAMPLE.subscriptions);

/** ③ 报告面板里露出的三行(2 个可裁 + 1 个待复核),档位跟着真实判定走 */
const DEMO_REPORT_ROWS: { s: Subscription; tier: Tier }[] = [
  ...SAMPLE_TIERS.cut.slice(0, 2).map((s) => ({ s, tier: "cut" as Tier })),
  ...SAMPLE_TIERS.review.slice(0, 1).map((s) => ({ s, tier: "review" as Tier })),
];

/* ---------- 计数(0 → 目标,easeOutCubic;reduce 直达终值) ---------- */
function useCount(to: number, on: boolean, dur = 1100) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, to, dur]);
  return n;
}

/* ---------- 章节头:左编号 · 右标题 ---------- */
export function SectionHead({
  no,
  title,
  sub,
  tag,
}: {
  no: string;
  title: string;
  sub?: string;
  tag?: string;
}) {
  return (
    <div className="grid gap-x-8 gap-y-3 md:grid-cols-[104px_minmax(0,1fr)] lg:gap-x-12">
      <p className="mtag num pt-1.5 text-[11px] text-rust lg:pt-3">{no}</p>
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-[clamp(30px,4.6vw,56px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink">
            {title}
          </h2>
          {tag && <span className="mtag border border-rust px-2.5 py-1.5 text-[9.5px] text-rust">{tag}</span>}
        </div>
        {sub && <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* =============================================================
   01 · 问题:每一笔都不贵
   论点:单价从来不是问题,累加才是。
   ============================================================= */
export function ClaimProblem() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.3, "0px 0px -16% 0px");
  const n = useCount(SAMPLE_SPEND, on);
  return (
    <div ref={ref}>
      <SectionHead
        no="01"
        title="每一笔都不贵"
        sub="问题从来不在单价,而在它们从不一起出现。"
      />

      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-14">
        {/* 左:四个很便宜的单价 */}
        <div>
          <ul className="grid grid-cols-2 gap-px border border-ink bg-ink">
            {SMALL_PRICES.map((p) => (
              <li key={p} className="bg-paper px-5 py-6 sm:px-6">
                <p className="figure figure-md num text-ink">
                  {yuan(p)}
                  <span className="mtag ml-1.5 align-top text-[9px] text-sub">/ 月</span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-sub">
            一杯咖啡的钱,谁会为它专门去退订?
          </p>
        </div>

        {/* 右:同一个东西加在一起 */}
        <div className="flex flex-col justify-center border-t-2 border-ink pt-7 md:border-l-2 md:border-t-0 md:pl-12 md:pt-0">
          <p className="mtag text-[9.5px] text-sub">
            SUM · {SAMPLE.subscriptions.length} 项相加
          </p>
          <p className="figure figure-lg num mt-3 text-rust">
            {yuan(n)}
            <span className="mtag ml-2 align-top text-[11px] font-normal text-rust/70">/ YEAR</span>
          </p>
          <p className="prose-sm mt-3 text-[14px]">
            折合每月 {yuan(monthlyOf(SAMPLE_SPEND))}。大多数人从没把它们加在一起算过。
          </p>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   02 · 产品演示:三步(账单 → 识别 → 报告)
   不解释产品,直接放产品在每一步实际处理的东西。
   面板里的行是示例账单(全程标注),但版式与真实界面一致。
   ============================================================= */
const DEMO_LINES = [
  { d: "08-01", m: "Apple", t: "自动续费", a: 6, sub: true, cycle: "月付" },
  { d: "08-03", m: "滴滴出行", t: "快车", a: 32.5, sub: false, cycle: "" },
  { d: "08-05", m: "Netflix", t: "会员 自动续费", a: 49, sub: true, cycle: "月付" },
  { d: "08-08", m: "全家便利店", t: "扫码付款", a: 18, sub: false, cycle: "" },
  { d: "08-15", m: "Adobe", t: "创意应用 自动续费", a: 68, sub: true, cycle: "月付" },
];

function DemoPanelHead({ no, title, desc }: { no: string; title: string; desc: string }) {
  return (
    <div className="border-b border-ink/15 px-4 py-3.5 sm:px-5">
      <p className="mtag text-[9px] text-rust">
        {no} · {title}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-sub">{desc}</p>
    </div>
  );
}

export function ClaimDemo() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.2, "0px 0px -12% 0px");
  return (
    <div ref={ref} className={on ? "is-triggered" : undefined}>
      <SectionHead
        no="02"
        title="三步,变成一份可执行的清单"
        sub="不用整理数据,不用选平台,不用注册。以下为示例账单的演示。"
      />

      <div className="mt-10 grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-3">
        {/* ① 账单 */}
        <div className="bg-paper">
          <DemoPanelHead no="①" title="账单" desc="复制账单文本,或把 CSV / XLSX / 长截图丢进来。" />
          <ul className="px-4 py-3 sm:px-5">
            {DEMO_LINES.map((l, i) => (
              <li
                key={l.d + l.m}
                className="demo-row num flex items-baseline gap-x-2.5 border-b border-ink/10 py-2 text-[11.5px] text-sub/85 last:border-b-0"
                style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
              >
                <span className="shrink-0 text-sub/60">{l.d}</span>
                <span className="min-w-0 flex-1 truncate font-sans text-[12.5px]">{l.m}</span>
                <span className="shrink-0">-{l.a.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ② 识别 */}
        <div className="relative overflow-hidden bg-paper">
          <span aria-hidden className="demo-scan" />
          <DemoPanelHead no="②" title="本机识别" desc="按商户与扣费间隔匹配,非周期消费直接排除。" />
          <ul className="px-4 py-3 sm:px-5">
            {DEMO_LINES.map((l, i) => (
              <li
                key={l.d + l.m}
                className="demo-row flex items-baseline gap-x-2.5 border-b border-ink/10 py-2 last:border-b-0"
                style={{ "--d": `${240 + i * 110}ms` } as React.CSSProperties}
              >
                <span className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${l.sub ? "text-ink" : "text-sub/45"}`}>
                  {l.m}
                </span>
                {l.sub ? (
                  <span className="mtag shrink-0 text-[8px] text-rust">订阅 · {l.cycle}</span>
                ) : (
                  <span className="mtag shrink-0 text-[8px] text-ink/25">非周期</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* ③ 报告 */}
        <div className="bg-paper">
          <DemoPanelHead no="③" title="报告" desc="逐条给判定依据,可改、可导出取消清单。" />
          <div className="px-4 py-4 sm:px-5">
            <p className="figure figure-md num text-ink">
              {yuan(SAMPLE_SPEND)}
              <span className="mtag ml-2 align-top text-[9.5px] font-normal text-sub">/ YEAR</span>
            </p>
            <p className="prose-sm mt-1 text-[12.5px]">{SAMPLE.subscriptions.length} 个订阅被识别</p>

            <ul className="mt-4 border-t border-ink/12">
              {DEMO_REPORT_ROWS.map(({ s, tier }) => (
                <li key={s.id} className="flex items-center gap-x-2.5 border-b border-ink/10 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{s.name}</span>
                  <span className="num shrink-0 text-[11.5px] text-sub">{yuan(s.amount)}/月</span>
                  <TierTag tier={tier} />
                </li>
              ))}
            </ul>

            <p className="mtag mt-4 text-[9px] text-rust">
              可裁 {yuan(SAMPLE_CUT.cut)} / YEAR · {SAMPLE_CUT.cutList.length} 项
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 max-w-[64ch] text-[14px] leading-relaxed text-sub">
        ① 到 ③ 全部发生在你的浏览器里。网络断开也照样能用,识别脚本与 OCR 模型都随页面一起加载。
      </p>
    </div>
  );
}

/* =============================================================
   03 · 订阅分析:CUT / REVIEW / KEEP 三档
   REVIEW 这一档是刻意留的:引擎自己会说「请人工复核」,
   证据不足的项既不该被划掉,也不该被无脑保留。
   ============================================================= */
const TIER_SKIN: Record<Tier, { head: string; label: string; note: string }> = {
  cut: { head: "border-rust bg-rust text-paper", label: "text-paper", note: "text-paper/70" },
  review: { head: "border-rust bg-paper text-rust", label: "text-rust", note: "text-rust/70" },
  keep: { head: "border-ink bg-paper text-ink", label: "text-ink", note: "text-ink/45" },
};

function TriageRow({ sub, tier }: { sub: Subscription; tier: Tier }) {
  const cut = tier === "cut";
  return (
    <li className="border-b border-ink/12 px-4 py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-x-3">
        <span className="min-w-0">
          <span className={`cut-strike inline-block max-w-full truncate align-bottom text-[14.5px] font-semibold ${cut ? "is-cut text-sub" : "text-ink"}`}>
            {sub.name}
          </span>
        </span>
        <span className={`num shrink-0 text-[13px] font-semibold ${cut ? "text-sub" : "text-ink"}`}>
          {yuan(sub.amount)}
          <span className="text-[10.5px] font-normal text-sub/70">/{periodShort(sub.period)}</span>
        </span>
      </div>
      <p className="mtag mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[8.5px]">
        <span className={cut ? "text-rust" : "text-ink/45"}>{tierNote(sub)}</span>
        <span className="num text-sub/70">年 {yuan(subAnnual(sub))}</span>
      </p>
    </li>
  );
}

export function ClaimTriage() {
  return (
    <div>
      <SectionHead
        no="03"
        title="每一项都被判过一次"
        sub="不是简单地叫你「删」:证据充分的划掉,证据不足的交回给你。"
      />

      <div className="mt-10 grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-3">
        {TIERS.map((tier) => {
          const list = SAMPLE_TIERS[tier];
          const skin = TIER_SKIN[tier];
          const sum = sumAnnual(list);
          return (
            <div key={tier} className="flex flex-col bg-paper">
              <div className={`border-b-2 px-4 py-3 ${skin.head}`}>
                <p className="mtag text-[9.5px]">
                  {TIER_META[tier].en}
                  <span className={`ml-2 ${skin.note}`}>
                    {TIER_META[tier].cn} · {list.length} 项
                  </span>
                </p>
              </div>
              <ul className="flex-1">
                {list.map((s) => (
                  <TriageRow key={s.id} sub={s} tier={tier} />
                ))}
              </ul>
              <div className="flex items-baseline justify-between gap-x-3 border-t border-ink/20 px-4 py-3">
                <p className="mtag text-[8.5px] text-sub">合计 / 年</p>
                <p className={`num text-[13.5px] font-bold ${tier === "cut" ? "text-rust" : "text-ink"}`}>
                  {list.length ? yuan(sum) : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 判定依据:写清哪些是产品能力,哪些是示例标注 —— 不夸大 */}
      <div className="mt-6 max-w-[76ch] border-l-2 border-ink/20 pl-5">
        <p className="mtag text-[9px] text-sub">判定依据</p>
        <p className="prose-sm mt-2 text-[14px]">
          免费版只根据账单本身能证明的事初裁:年化 ≥ ¥600 归「高单价」,只出现 1 到 2 次、无法确认周期的归
          「周期未确认」,其余按「周期稳定」保留。
        </p>
        <p className="prose-sm mt-2 text-[14px]">
          上面的示例里出现了「长期闲置」「重复功能」这类判断,那是示例账单的标注 —— 真实的账单证明不了你有没有在用,
          Trim 不会替你下这种结论,这部分留给你自己。判定在报告页随时可改。
        </p>
      </div>
    </div>
  );
}

/* =============================================================
   04 · 节省金额:钱从哪几项里省出来
   ============================================================= */
export function ClaimSavings() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.3, "0px 0px -16% 0px");
  const n = useCount(SAMPLE_CUT.cut, on);

  // 按理由分桶(数据驱动,不手写金额):高单价 / 闲置 / 重复 …
  const buckets = React.useMemo(() => {
    const map = new Map<string, { sum: number; list: Subscription[] }>();
    for (const s of SAMPLE_CUT.cutList) {
      const key = REASON_CN[s.reason ?? ""] ?? "其他";
      const cur = map.get(key) ?? { sum: 0, list: [] };
      cur.sum += subAnnual(s);
      cur.list.push(s);
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].sum - a[1].sum).map(([k, v]) => ({ reason: k, ...v }));
  }, []);

  const daily = Math.round(SAMPLE_CUT.cut / 365);

  return (
    <div ref={ref}>
      <SectionHead no="04" title="YOU CAN CUT · 你能省下" />

      <p className="figure figure-xl num mt-10 text-center text-rust">
        {yuan(n)}
        <span className="mtag ml-2 align-top text-[11px] font-normal text-rust/70 sm:ml-3">/ YEAR</span>
      </p>
      <p className="mt-6 text-center text-[15px] leading-relaxed text-sub">
        裁掉 {SAMPLE_CUT.cutList.length} 个订阅 · 折合每月 {yuan(monthlyOf(SAMPLE_CUT.cut))} · 每天约 {yuan(daily)}
      </p>

      {/* 省在哪几项上(示例) */}
      <ul className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
        {buckets.map((b) => (
          <li key={b.reason} className="bg-paper px-5 py-6">
            <p className="mtag text-[9px] text-rust">{b.reason}</p>
            <p className="num mt-3 text-[19px] font-bold tracking-[-0.02em] text-ink">
              {yuan(b.sum)}
              <span className="mtag ml-1.5 align-top text-[9px] font-normal text-sub">/ 年</span>
            </p>
            <p className="prose-sm mt-2 text-[12.5px]">
              {b.list.map((s) => s.name).join(" · ")}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-[clamp(20px,2.6vw,30px)] font-extrabold leading-[1.25] tracking-[-0.03em] text-ink">
        裁掉不需要的。留下真正在用的。
      </p>
    </div>
  );
}

/* =============================================================
   05 · 隐私:账单去了哪里(全部可自行验证,不做无法证明的宣称)
   ============================================================= */
const PRIVACY = [
  { en: "NO ACCOUNT", k: "不需要注册", d: "打开就能用,没有账号、没有邮箱、没有验证码。" },
  { en: "NO BANK", k: "不连银行卡", d: "不申请任何银行或支付接口的授权,也不索取账号密码。" },
  { en: "NO UPLOAD", k: "账单不上传", d: "解析在你本机完成;这个静态站点上没有能接收账单的服务端代码。" },
  { en: "LOCAL", k: "断网也能用", d: "识别脚本与 OCR 模型随页面一起加载,不请求任何第三方域名。" },
];

export function ClaimPrivacy() {
  return (
    <div>
      <SectionHead no="05" title="你的账单,哪儿也没去" sub="Your financial data stays private." />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <p className="text-[clamp(20px,2.4vw,28px)] font-extrabold leading-[1.3] tracking-[-0.03em] text-ink">
            不需要先信任我们。
            <br />
            这些你都能自己验证。
          </p>
          <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-sub">
            断网再打开 Trim:分析照样能跑完。账单文本与截图从头到尾没有离开过这台设备。
          </p>
        </div>
        <dl>
          {PRIVACY.map((c) => (
            <div key={c.en} className="grid gap-x-6 gap-y-1.5 border-t border-ink/15 py-4 sm:grid-cols-[128px_minmax(0,1fr)]">
              <dt className="mtag pt-0.5 text-[9px] text-rust">{c.en}</dt>
              <dd>
                <p className="text-[16px] font-bold tracking-[-0.02em] text-ink">{c.k}</p>
                <p className="prose-sm mt-1 text-[13.5px]">{c.d}</p>
              </dd>
            </div>
          ))}
          <div className="border-t border-ink/15 pt-4">
            <p className="prose-sm text-[13px]">
              分析结果加密存在你这台设备上,7 天后自动过期,报告页可一键销毁。
            </p>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* =============================================================
   06 · 支持哪些账单(回答"我的账单能用吗",这是转化前最后一道坎)
   ============================================================= */
const SOURCES = [
  {
    p: "支付宝",
    way: "我的 → 账单 → 选择月份 → 全选复制",
    fmt: "粘贴文本 · CSV · 截图",
  },
  {
    p: "微信",
    way: "我 → 服务 → 钱包 → 账单 → 全选复制",
    fmt: "粘贴文本 · XLSX / CSV · 截图",
  },
  {
    p: "账单截图",
    way: "在账单页截长图,可一次选多张",
    fmt: "PNG / JPG / WEBP(本机 OCR)",
  },
  {
    p: "Word 文档",
    way: "交易明细证明另存为 .docx,直接传",
    fmt: ".docx(旧版 .doc 请先另存)",
  },
];

export function ClaimSupported() {
  return (
    <div>
      <SectionHead
        no="06"
        title="支持哪些账单"
        sub="支付宝与微信的账单都能吃:复制文本、导出文件、转存的 Word、长截图,四种进法。"
      />

      <ul className="mt-10 border-t border-ink">
        {SOURCES.map((s) => (
          <li
            key={s.p}
            className="grid gap-x-8 gap-y-2 border-b border-ink/15 py-5 sm:grid-cols-[160px_minmax(0,1fr)_minmax(0,0.8fr)]"
          >
            <p className="text-[16.5px] font-bold tracking-[-0.02em] text-ink">{s.p}</p>
            <p className="text-[14.5px] leading-relaxed text-sub">{s.way}</p>
            <p className="mtag text-[9px] text-rust sm:text-right">{s.fmt}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-[68ch] text-[14px] leading-relaxed text-sub">
        账单里的收入、转账、退款、单笔消费会被自动排除,只留下周期性扣费。文件与截图都只在本机解析。
      </p>
    </div>
  );
}
