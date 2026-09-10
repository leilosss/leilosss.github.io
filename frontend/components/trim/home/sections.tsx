// =============================================================
// 首页章节(v2.6 长页)
// 报纸排版逻辑:左侧章节编号 + 右侧粗体标题,超大数字与极小注释成对比。
// 数据全部来自 lib/sample-report + lib/report-math —— 与报告页同源,
// 首页说的数字就是报告页会算出来的数字,不另写一套。
// =============================================================
"use client";

import * as React from "react";

import { useInViewOnce } from "@/components/trim/reveal";
import { spendSplit, sumAnnual, yuan } from "@/lib/report-math";
import { SMALL_PRICES, demoInitialCut, sampleReport } from "@/lib/sample-report";
import type { Subscription } from "@/lib/types";

const SAMPLE = sampleReport();
const SAMPLE_SPEND = sumAnnual(SAMPLE.subscriptions);
const SAMPLE_CUT = spendSplit(SAMPLE.subscriptions, demoInitialCut(SAMPLE.subscriptions));

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
        {sub && <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* =============================================================
   01 · 每一笔都很小
   ============================================================= */
export function ClaimSmall() {
  return (
    <div>
      <SectionHead no="01" title="每一笔都很小" sub="你的订阅,单看都不贵。" />
      <ul className="mt-10 grid grid-cols-2 gap-px border border-ink bg-ink md:grid-cols-4">
        {SMALL_PRICES.map((p) => (
          <li key={p} className="bg-paper px-5 py-7 sm:px-6">
            <p className="figure figure-md num text-ink">
              {yuan(p)}
              <span className="mtag ml-1.5 align-top text-[9px] text-sub">/ 月</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-sub">
        一杯咖啡的钱,谁会为它专门去退订?问题从来不在单价。
      </p>
    </div>
  );
}

/* =============================================================
   02 · 但它们会累加
   ============================================================= */
export function ClaimAccumulate() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.35, "0px 0px -16% 0px");
  const n = useCount(SAMPLE_SPEND, on);
  return (
    <div ref={ref}>
      <SectionHead no="02" title="但它们会累加" />
      <p className="figure figure-xl num mt-10 text-center text-rust">
        {yuan(n)}
        <span className="mtag ml-2 align-top text-[11px] text-rust/70 sm:ml-3">/ YEAR</span>
      </p>
      <p className="mt-6 text-center text-[15px] leading-relaxed text-sub">
        {SAMPLE.subscriptions.length} 个订阅 · 月付合计 ¥{Math.round(SAMPLE_SPEND / 12).toLocaleString("zh-CN")}
        ,大多数人从没把它们加在一起算过。
      </p>
    </div>
  );
}

/* =============================================================
   03 · Trim 找出噪音(CUT / KEEP 判定)
   ============================================================= */
const REASON_CN: Record<string, string> = {
  "HIGH COST": "单价高",
  UNUSED: "几乎不用",
  DUPLICATE: "功能重叠",
  "LOW SIGNAL": "周期未确认",
  RECURRING: "周期稳定",
  ACTIVE: "在用",
};

function TriageRow({ sub, cut }: { sub: Subscription; cut: boolean }) {
  const reason = cut ? (sub.reason ?? "建议裁掉") : REASON_CN[sub.reason ?? ""] ?? "在用";
  return (
    <li className="flex items-baseline gap-x-4 border-b border-ink/15 py-3.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15.5px] font-semibold ${cut ? "text-sub" : "text-ink"}`}>{sub.name}</span>
        <span className={`mtag mt-1 block text-[8.5px] ${cut ? "text-rust" : "text-ink/40"}`}>{reason}</span>
      </span>
      <span className={`num shrink-0 text-[14px] font-semibold ${cut ? "text-sub" : "text-ink"}`}>
        {yuan(sub.amount)}
        <span className="text-[11px] font-normal text-sub/70">/月</span>
      </span>
      <span
        className={`mtag shrink-0 px-2 py-1 text-[8.5px] ${
          cut ? "bg-rust text-paper" : "border border-ink text-ink"
        }`}
      >
        {cut ? "CUT" : "KEEP"}
      </span>
    </li>
  );
}

export function ClaimTriage() {
  const cut = SAMPLE_CUT.cutList;
  const keep = SAMPLE_CUT.keepList;
  return (
    <div>
      <SectionHead no="03" title="Trim 找出噪音" sub="哪些该留,哪些该裁。" />

      <div className="mt-10 grid border border-ink md:grid-cols-2">
        {/* 左:建议裁掉 */}
        <div className="border-b border-ink md:border-b-0 md:border-r">
          <p className="mtag bg-rust px-5 py-3 text-[9.5px] text-paper">
            建议裁掉 <span className="text-paper/70">CUT · {cut.length} 项</span>
          </p>
          <ul className="px-5">
            {cut.map((s) => (
              <TriageRow key={s.id} sub={s} cut />
            ))}
          </ul>
        </div>
        {/* 右:建议保留 */}
        <div>
          <p className="mtag bg-ink px-5 py-3 text-[9.5px] text-paper">
            建议保留 <span className="text-paper/70">KEEP · {keep.length} 项</span>
          </p>
          <ul className="px-5">
            {keep.map((s) => (
              <TriageRow key={s.id} sub={s} cut={false} />
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 max-w-[56ch] text-[14.5px] leading-relaxed text-sub">
        判定依据来自账单本身:高单价、重复功能、周期规律,你随时可以改。
      </p>
    </div>
  );
}

/* =============================================================
   04 · 你能省下
   ============================================================= */
export function ClaimSavings() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.35, "0px 0px -16% 0px");
  const n = useCount(SAMPLE_CUT.cut, on);
  return (
    <div ref={ref}>
      <SectionHead no="04" title="YOU CAN CUT · 你能省下" />
      <p className="figure figure-xl num mt-10 text-center text-rust">
        {yuan(n)}
        <span className="mtag ml-2 align-top text-[11px] text-rust/70 sm:ml-3">/ YEAR</span>
      </p>
      <p className="mt-6 text-center text-[15px] leading-relaxed text-sub">
        裁掉 {SAMPLE_CUT.cutList.length} 个订阅 · 折合每月 ¥{Math.round(SAMPLE_CUT.cut / 12).toLocaleString("zh-CN")}
      </p>
      <p className="mt-10 text-center text-[clamp(20px,2.6vw,30px)] font-extrabold leading-[1.25] tracking-[-0.03em] text-ink">
        裁掉不需要的。留下真正在用的。
      </p>
    </div>
  );
}

/* =============================================================
   06 · 隐私:你的账单去了哪里
   ============================================================= */
// 事实口径与实现一致(sec-store:本机加密暂存 7 天),不写"仅存当前会话"
const PRIVACY = [
  { en: "Uploaded", k: "0 个文件上传", d: "账单只在本机读取,服务端拿不到原始文件。" },
  { en: "Processed", k: "100% 本地解析", d: "识别在浏览器里跑完,断网也能用。" },
  { en: "Stored", k: "本机暂存 7 天", d: "加密存在这台设备上,可随时一键销毁。" },
  { en: "Accounted", k: "0 个账号", d: "不注册、不连银行卡、不碰支付接口。" },
];

export function ClaimPrivacy() {
  return (
    <div>
      <SectionHead no="06" title="你的账单去了哪里" sub="哪儿也没去。" />
      <dl className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        {PRIVACY.map((c) => (
          <div key={c.en} className="bg-paper px-5 py-7">
            <dt>
              <span className="mtag block text-[9px] text-rust">{c.en}</span>
              <span className="mt-3 block text-[17px] font-bold tracking-[-0.02em] text-ink">{c.k}</span>
            </dt>
            <dd className="mt-2.5 text-[13px] leading-relaxed text-sub">{c.d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
