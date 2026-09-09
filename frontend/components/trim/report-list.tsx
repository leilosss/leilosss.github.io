// =============================================================
// TrimReportList:报告订阅账本(纸面工作台)
// 判定语法 = 语义:行被 CUT → 名字单线划痕(sageDeep)+ 整行浸 sage-tint;
// CUT/KEEP 成对即时切换,无 IO 时序(Operate:交互即时)
// 列序(全断点一致):服务 / 价格 / 周期 / 下次扣费 / 操作
// =============================================================
"use client";

import type { Subscription } from "@/lib/types";
import { fmtCNY } from "@/lib/utils";

/** 下次扣费日:上次扣费 + 中位间隔 */
export function nextBillDate(lastAt: string, gapDays: number | null): string {
  if (!gapDays || !lastAt) return "—";
  const d = new Date(lastAt + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + gapDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const PERIOD_SHORT: Record<string, string> = {
  monthly: "月度",
  quarterly: "季度",
  yearly: "年度",
  unknown: "待确认",
};

interface Props {
  subs: Subscription[];
  /** 汇总口径:筛选时传全量订阅,底部计数/年省不随筛选变化 */
  totalSubs?: Subscription[];
  /** 含默认建议的完整决定表 */
  decisions: Record<string, "cut" | "keep">;
  onDecide: (subId: number, d: "cut" | "keep") => void;
}

export function TrimReportList({ subs, decisions, onDecide, totalSubs }: Props) {
  const rows = subs.map((s) => ({ sub: s, dec: decisions[String(s.id)] ?? "keep" }));
  const all = totalSubs ?? subs;
  const cut = all.filter((s) => (decisions[String(s.id)] ?? "keep") === "cut");
  const keep = all.filter((s) => (decisions[String(s.id)] ?? "keep") === "keep");
  const savedAnnual = cut.reduce((sum, s) => sum + (s.annual_amount ?? 0), 0);

  return (
    <div>
      {/* 表头 */}
      <div className="tag grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-ink/20 pb-2 text-[9px] text-sub sm:grid-cols-[1.5fr_0.55fr_0.42fr_0.8fr_auto]">
        <span>服务</span>
        <span className="text-right">价格</span>
        <span className="hidden sm:inline">周期</span>
        <span className="hidden sm:inline">下次扣费</span>
        <span className="text-right">操作</span>
      </div>

      <ul>
        {rows.map(({ sub, dec }) => {
          const isCut = dec === "cut";
          return (
            <li
              key={sub.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink/10 py-[11px] transition-colors duration-300 sm:grid-cols-[1.5fr_0.55fr_0.42fr_0.8fr_auto]"
              style={{ background: isCut ? "var(--sage-tint)" : "transparent" }}
            >
              {/* 服务名(被裁 → sageDeep 单线划痕) */}
              <span className="min-w-0">
                <span
                  className={`block truncate text-[15px] font-medium leading-snug transition-colors duration-300 ${
                    isCut ? "cut-strike is-cut text-sub" : "text-ink"
                  }`}
                >
                  {sub.name}
                </span>
                <span className="tag mt-[3px] block text-[9px] text-sub">{sub.category}</span>
              </span>

              {/* 价格(单次扣费额) */}
              <span
                className={`num text-right text-[13px] transition-colors duration-300 ${
                  isCut ? "text-sub" : "text-ink"
                }`}
              >
                {fmtCNY(sub.amount)}
              </span>

              {/* 周期 / 下次扣费(桌面列;移动端隐藏,不占格) */}
              <span className="hidden text-[12px] text-sub sm:inline">{PERIOD_SHORT[sub.period] ?? "—"}</span>
              <span className="hidden text-[12px] text-sub sm:inline">
                {nextBillDate(sub.last_at, sub.median_gap_days).replace(/-/g, ".")}
              </span>

              {/* 操作(CUT/KEEP 成对,即时切换) */}
              <span className="tag flex items-center gap-2.5 text-[9px]">
                <button
                  onClick={() => onDecide(sub.id, "cut")}
                  aria-pressed={isCut}
                  className={
                    isCut
                      ? "text-rust underline decoration-1 underline-offset-[3px]"
                      : "text-sub transition-colors hover:text-ink"
                  }
                >
                  CUT
                </button>
                <button
                  onClick={() => onDecide(sub.id, "keep")}
                  aria-pressed={!isCut}
                  className={
                    !isCut
                      ? "text-ink underline decoration-1 underline-offset-[3px]"
                      : "text-sub transition-colors hover:text-ink"
                  }
                >
                  KEEP
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {/* 汇总(口径 = 全量,不随筛选) */}
      <div className="tag flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1 pt-3.5 text-[10px]">
        <span className="text-sub">
          {cut.length} CUT · {keep.length} KEEP
        </span>
        <span className="font-semibold text-rust">年省 {fmtCNY(savedAnnual)}</span>
      </div>
    </div>
  );
}
