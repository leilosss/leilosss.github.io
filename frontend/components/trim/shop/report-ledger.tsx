// =============================================================
// ReportLedger —— 订阅账单清单(v2.0 · 报告页主体)
// 产品决策:v11 的「物理散落拖拽台」牺牲了可读性(移动端拥挤、纸条互相
// 遮挡、扫读困难)。2.0 铁律 = VALUE FIRST / DO NOT SACRIFICE USABILITY,
// 因此改为**高级账单清单**:CUT 区与 KEEP 区分栏,一眼扫读;
// 品牌物理交互全部保留并强化:
//   · 横向划动 = 裁(移动端最自然的手势,12 Brews 精神)
//   · 点击 CUT/KEEP 文字标记 = 切换(无标准按钮组件)
//   · 裁定瞬间:红裁剪线划过 → 纸条左移微倾 → CUT 印章落下 →
//     金额划掉归零 → 浮出「SAVED ¥N / YEAR」
// 每条给出裁剪理由(HIGH COST / DUPLICATE / UNUSED / RECURRING)与 CANCEL 入口。
// =============================================================
"use client";

import * as React from "react";

import type { Subscription } from "@/lib/types";

const yuan = (n: number) => `¥${Math.round(n).toLocaleString("zh-CN")}`;

const PERIOD_CN: Record<string, string> = {
  monthly: "月付",
  quarterly: "季付",
  yearly: "年付",
  unknown: "周期待确认",
};

/** 理由标签的中文注解(只解释账单能证明的事) */
const REASON_NOTE: Record<string, string> = {
  "HIGH COST": "年化金额高,值得复核",
  DUPLICATE: "与其他订阅功能重叠",
  UNUSED: "长期未使用",
  "LOW SIGNAL": "记录少,周期未确认",
  RECURRING: "周期稳定的常规订阅",
  ACTIVE: "在用",
};

/* ---------- 单行:一条订阅 ---------- */
function LedgerRow({
  sub,
  cut,
  onToggle,
  onCancel,
}: {
  sub: Subscription;
  cut: boolean;
  onToggle: () => void;
  onCancel: (sub: Subscription) => void;
}) {
  const rowRef = React.useRef<HTMLLIElement | null>(null);
  const annual = sub.annual_amount ?? 0;
  const priceUp = sub.prev_amount != null && sub.prev_amount < sub.amount;

  /* 横向划动裁剪(触摸与鼠标通用;≥64px 且 <400ms = 裁/留) */
  React.useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    let x0 = 0;
    let t0 = 0;
    let active = false;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button,a")) return;
      x0 = e.clientX;
      t0 = performance.now();
      active = true;
    };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - x0;
      const dt = performance.now() - t0;
      el.style.transform = "";
      if (Math.abs(dx) > 64 && dt < 500) {
        // 左划 = 裁,右划 = 留(与当前态不同才切换)
        if ((dx < 0) !== cut) onToggle();
      }
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 6) el.style.transform = `translateX(${Math.max(-60, Math.min(60, dx * 0.4))}px)`;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [cut, onToggle]);

  return (
    <li
      ref={rowRef}
      className={`relative border-b border-ink/12 transition-[transform,background-color] duration-300 ${cut ? "is-cut bg-rust/[0.045]" : ""}`}
      style={{ touchAction: "pan-y" }}
    >
      {/* 红裁剪线(CUT 态自左划过整行) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 right-0 top-1/2 z-[2] h-px origin-left bg-rust transition-transform duration-[420ms] ease-out ${
          cut ? "scale-x-100" : "scale-x-0"
        }`}
      />

      <div className="flex items-start gap-3 px-4 py-4 sm:gap-5 sm:px-5">
        {/* 主信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className={`text-[16px] font-bold tracking-[-0.015em] ${cut ? "text-sub" : "text-ink"}`}>
              {sub.name}
            </span>
            {cut && <span className="cut-stamp">CUT</span>}
            {priceUp && (
              <span className="mtag border border-rust/50 px-1.5 py-[2px] text-[8px] text-rust">
                涨价 ¥{sub.prev_amount} → ¥{sub.amount}
              </span>
            )}
          </div>

          {/* 理由 + 使用情况(报告的说服力所在) */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`mtag text-[8.5px] ${cut ? "text-rust" : "text-ink/45"}`}>
              {sub.reason ?? (cut ? "CUT" : "KEEP")}
            </span>
            <span className="text-[13.5px] leading-relaxed text-sub">
              {sub.usage ?? REASON_NOTE[sub.reason ?? ""] ?? PERIOD_CN[sub.period]}
            </span>
          </p>

          {/* 裁定后的收益提示 */}
          <div className="saved-note">
            <p className="mtag pt-2 text-[9.5px] text-rust">
              SAVED {yuan(annual)} / 年
            </p>
          </div>
        </div>

        {/* 金额 */}
        <div className="amt-swap shrink-0 text-right">
          <p className={`num text-[16px] font-bold ${cut ? "amt-old text-sub line-through decoration-rust decoration-1" : "text-ink"}`}>
            {yuan(sub.amount)}
            <span className="text-[11px] font-normal text-sub/70">/{PERIOD_CN[sub.period]?.[0] ?? "期"}</span>
          </p>
          {cut ? (
            <p className="num amt-new text-[12px] font-semibold text-rust">→ ¥0</p>
          ) : (
            <p className="num text-[11.5px] text-sub/80">年 {yuan(annual)}</p>
          )}
        </div>

        {/* 操作:CUT / KEEP 文字标记(非标准按钮)+ CANCEL */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="mtag flex items-center gap-2.5 text-[9.5px]">
            <button
              onClick={onToggle}
              aria-pressed={cut}
              className={cut ? "text-rust underline decoration-rust decoration-1 underline-offset-[3px]" : "text-sub transition-colors hover:text-rust"}
            >
              CUT
            </button>
            <span aria-hidden className="text-ink/20">/</span>
            <button
              onClick={onToggle}
              aria-pressed={!cut}
              className={!cut ? "text-ink underline decoration-ink/45 decoration-1 underline-offset-[3px]" : "text-sub transition-colors hover:text-ink"}
            >
              KEEP
            </button>
          </div>
          {cut && (
            <button
              onClick={() => onCancel(sub)}
              className="mtag border border-rust/45 px-2 py-1 text-[8.5px] text-rust transition-colors hover:bg-rust hover:text-paper"
            >
              CANCEL 去取消
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------- 清单主体:CUT 区 + KEEP 区 ---------- */
export function ReportLedger({
  subs,
  decisions,
  onDecide,
  onCancel,
}: {
  subs: Subscription[];
  decisions: Record<string, "cut" | "keep">;
  onDecide: (id: number, d: "cut" | "keep") => void;
  onCancel: (sub: Subscription) => void;
}) {
  const cutList = subs.filter((s) => decisions[String(s.id)] === "cut");
  const keepList = subs.filter((s) => decisions[String(s.id)] !== "cut");
  const cutAnnual = cutList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const keepAnnual = keepList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);

  const section = (
    title: string,
    en: string,
    list: Subscription[],
    total: number,
    tone: "rust" | "ink",
    empty: string,
  ) => (
    <section className="mt-9 first:mt-0">
      <div className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 pb-2.5 pt-3 ${tone === "rust" ? "border-rust" : "border-ink"}`}>
        <h2 className="mtag flex items-baseline gap-2.5 text-[11px]">
          <span className={tone === "rust" ? "text-rust" : "text-ink"}>{en}</span>
          <span className="normal-case tracking-normal text-sub">{title} · {list.length} 项</span>
        </h2>
        <p className={`num text-[15px] font-bold ${tone === "rust" ? "text-rust" : "text-ink"}`}>
          {yuan(total)}
          <span className="mtag ml-1.5 text-[9px] text-sub">/ 年</span>
        </p>
      </div>
      {list.length === 0 ? (
        <p className="prose-sm border-b border-ink/12 py-6 text-[14px]">{empty}</p>
      ) : (
        <ul className="border-t border-ink/12">
          {list.map((s) => (
            <LedgerRow
              key={s.id}
              sub={s}
              cut={decisions[String(s.id)] === "cut"}
              onToggle={() => onDecide(s.id, decisions[String(s.id)] === "cut" ? "keep" : "cut")}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="px-5 sm:px-8">
      {section("裁掉", "CUT", cutList, cutAnnual, "rust", "还没有标记任何订阅 —— 点右侧 CUT,或把行向左划。")}
      {section("保留", "KEEP", keepList, keepAnnual, "ink", "全部订阅都已标为裁掉。")}
      <p className="prose-sm mt-5 text-[13px]">
        左划 = 裁 · 右划 = 留 · 也可直接点 CUT / KEEP。判定随时可改。
      </p>
    </div>
  );
}
