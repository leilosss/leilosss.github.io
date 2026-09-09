// =============================================================
// 首页叙事组件(v2.0 · Storytelling,非 Feature Cards)
// 故事线:小数字 → 累加 → 年度总额 → Trim 找出噪音 → CUT/KEEP → 你能省多少
// 全部滚动触发(IntersectionObserver),动效克制、有目的。
// =============================================================
"use client";

import * as React from "react";

import { useInViewOnce } from "@/components/trim/reveal";
import { SMALL_PRICES, demoInitialCut, sampleReport } from "@/lib/sample-report";

const SAMPLE = sampleReport();

/* ---------- 计数(0 → target,easeOutCubic;reduce 直达) ---------- */
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

const yuan = (n: number) => `¥${n.toLocaleString("zh-CN")}`;

/* =============================================================
   ① 小数字:单看都不贵
   ============================================================= */
export function StorySmall() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.3, "0px 0px -14% 0px");
  return (
    <div ref={ref}>
      <p className="mtag text-[10px] text-sub">01 — 每一笔都很小</p>
      <h2 className="sect mt-4 text-ink">你的订阅,单看都不贵。</h2>
      <ul className="mt-9 flex flex-wrap items-baseline gap-x-10 gap-y-6 sm:gap-x-16">
        {SMALL_PRICES.map((p, i) => (
          <li
            key={p}
            className={`figure figure-lg text-ink transition-all duration-500 ${on ? "opacity-100 translate-y-0" : "translate-y-3 opacity-0"}`}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            {yuan(p)}
            <span className="mtag ml-1.5 align-baseline text-[10px] text-sub">/月</span>
          </li>
        ))}
      </ul>
      <p className="prose-body mt-8 max-w-[46ch]">
        一杯咖啡的钱,谁会为它专门去退订?——问题从来不在单价。
      </p>
    </div>
  );
}

/* =============================================================
   ② 累加:一年就是这个数(计数到 ¥3,936)
   ============================================================= */
export function StoryAddUp() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.35, "0px 0px -16% 0px");
  const n = useCount(SAMPLE.summary.annual_total, on);
  return (
    <div ref={ref}>
      <p className="mtag text-[10px] text-sub">02 — 但它们会累加</p>
      <h2 className="sect mt-4 text-ink">加起来,是一整年。</h2>
      <p className="figure figure-xl mt-10 text-ink">
        {yuan(n)}
        <span className="mtag ml-2 align-top text-[11px] text-sub sm:ml-3">/ 年</span>
      </p>
      <p className="prose-body mt-7 max-w-[46ch]">
        8 个订阅 · 月付合计 ¥328 —— 大多数人从没把它们加在一起算过。
      </p>
    </div>
  );
}

/* =============================================================
   ③ Trim 找出噪音:逐条 CUT / KEEP 判定(滚动逐行触发)
   ============================================================= */
export function StoryTriage() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.24, "0px 0px -12% 0px");
  const subs = SAMPLE.subscriptions;
  const initial = React.useMemo(() => demoInitialCut(subs), [subs]);
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(subs.length);
      return;
    }
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= subs.length) window.clearInterval(t);
    }, 190);
    return () => window.clearInterval(t);
  }, [on, subs.length]);

  return (
    <div ref={ref}>
      <p className="mtag text-[10px] text-sub">03 — Trim 找出噪音</p>
      <h2 className="sect mt-4 text-ink">哪些该留,哪些该裁。</h2>
      <ul className="mt-9 border-t border-ink/15">
        {subs.map((s, i) => {
          const isCut = initial[String(s.id)] === "cut";
          const visible = i < shown;
          return (
            <li
              key={s.id}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink/10 py-3.5 transition-all duration-400 sm:gap-x-8 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: visible ? "0ms" : "0ms" }}
            >
              <span className="min-w-0">
                <span className={`block truncate text-[15px] font-semibold ${isCut && visible ? "cut-strike is-cut text-sub" : "text-ink"}`}>
                  {s.name}
                </span>
                {isCut && (
                  <span className="mtag mt-1 block text-[8.5px] text-rust/80">{s.reason}</span>
                )}
              </span>
              <span className={`num text-[14px] ${isCut && visible ? "text-sub" : "text-ink"}`}>
                ¥{s.amount}<span className="text-sub/70">/月</span>
              </span>
              <span
                className={`mtag w-[42px] text-right text-[9.5px] transition-colors duration-300 ${
                  !visible ? "text-transparent" : isCut ? "text-rust" : "text-ink/45"
                }`}
              >
                {isCut ? "CUT" : "KEEP"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="prose-sm mt-5">
        判定依据来自账单本身:高单价、重复功能、周期规律 —— 你随时可以改。
      </p>
    </div>
  );
}

/* =============================================================
   ④ 结果:你一年能省多少(计数到 ¥1,836)
   ============================================================= */
export function StorySavings() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.35, "0px 0px -16% 0px");
  const subs = SAMPLE.subscriptions;
  const initial = React.useMemo(() => demoInitialCut(subs), [subs]);
  const cutList = subs.filter((s) => initial[String(s.id)] === "cut");
  const saving = cutList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const n = useCount(saving, on);
  return (
    <div ref={ref}>
      <p className="mtag text-[10px] text-rust">04 — 你能省下</p>
      <p className="figure figure-xl mt-5 text-rust">
        {yuan(n)}
        <span className="mtag ml-2 align-top text-[11px] text-rust/70 sm:ml-3">/ 年</span>
      </p>
      <p className="mtag mt-4 text-[11px] text-ink">
        {cutList.length} 个订阅 · 月省 ¥{Math.round(saving / 12)}
      </p>
      <h2 className="sect mt-10 max-w-[15ch] text-ink">
        裁掉不需要的。<br />留下真正在用的。
      </h2>
    </div>
  );
}
