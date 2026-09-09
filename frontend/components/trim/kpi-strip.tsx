// =============================================================
// KpiStrip —— 证据统计带(v12 版 · 4 格)
// 「0 上传 / 100% 本地 / 2+ 平台 / 0 注册」滚动进判定带触发 0→N 计数,
// 计数完成后浮现红笔对勾(线条勾,非 emoji;无模板化对勾彩);
// 数据只陈述产品事实;≥1366 与全站对开同构(左 34vw folio 边注)。
// prefers-reduced-motion:直接显示终值。
// =============================================================
"use client";

import * as React from "react";

import { useInViewOnce } from "@/components/trim/reveal";

const KPI = [
  { label: "Files uploaded", note: "无需上传文件", value: 0, suffix: "", tick: true },
  { label: "Parsed locally", note: "数据仅设备内处理", value: 100, suffix: "%", tick: true },
  { label: "Platforms", note: "支持主流订阅", value: 2, suffix: "+", tick: true },
  { label: "Sign-ups", note: "开箱即用", value: 0, suffix: "", tick: true },
];

/** 单向计数:ease-out 0→to,约 0.9s;未触发恒 0;reduce 直达终值 */
function useCountUp(to: number, on: boolean, dur = 900) {
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
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, to, dur]);
  return n;
}

/** 红笔对勾(计数完成的标记;先划线后勾,像复核完账) */
function TickMark() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" aria-hidden fill="none" className="text-rust">
      <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiStrip() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.3, "0px 0px -12% 0px");

  return (
    <div
      ref={ref}
      className="w-full min-[1366px]:grid min-[1366px]:grid-cols-[minmax(0,34vw)_minmax(0,1fr)]"
    >
      {/* 左出血 folio(≥1366):版次边注,与对开全站同构 */}
      <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:items-end min-[1366px]:justify-center min-[1366px]:pb-10">
        <span className="folio-v tag text-[10px] text-sub/70">
          № 012 · Copy → paste → trim · zero evidence
        </span>
      </div>

      {/* 右页:四格统计 */}
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 divide-x divide-ink/15 px-4 sm:px-8 min-[1366px]:m-0 min-[1366px]:max-w-none min-[1366px]:grid-cols-4 min-[1366px]:px-10 lg:px-10">
        {KPI.map((k) => (
          <CountCell key={k.label} {...k} on={on} />
        ))}
      </div>
    </div>
  );
}

function CountCell({
  label,
  note,
  value,
  suffix,
  tick,
  on,
}: (typeof KPI)[number] & { on: boolean }) {
  const n = useCountUp(value, on);
  const done = on && (value === 0 ? true : n >= value);
  return (
    <div className="px-4 py-9 first:pl-0 sm:px-7 sm:py-11 lg:px-9">
      <p className="num text-[clamp(38px,4.2vw,64px)] font-extrabold leading-none tracking-[-0.02em] text-ink">
        {n}
        {suffix && <span className="serif-i ml-0.5 text-[0.62em] text-rust">{suffix}</span>}
        {tick && (
          <span
            className={`ml-3 inline-block align-baseline transition-opacity duration-500 ${
              done ? "opacity-100" : "opacity-0"
            }`}
          >
            <TickMark />
          </span>
        )}
      </p>
      <p className="mtag mt-4 text-[9.5px] text-sub">{label}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-sub/90">{note}</p>
    </div>
  );
}
