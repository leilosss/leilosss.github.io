// =============================================================
// PriceAlert —— 价格变动提醒卡(Pro 的核心界面)
//
// 它要说清四件事,一件都不能含糊:
//   ① 变的什么:哪个订阅、哪个套餐/地区/币种(身份行 = 匹配依据,看得见)
//   ② 变了多少:原价划掉 → 现价、涨跌幅、一年多花/少花
//   ③ 什么性质:涨价 / 降价 / 套餐变化 / 优惠结束 / 无法验证
//   ④ 依据什么:**来源行**永远写实话 —— 本机监控的来源是"你的账单",
//      不写 "Verified from official source"(那需要定时核对官方价目,当前没做到)
//
// 纯展示组件(无 hooks),服务端页面与客户端页面都能用。
// =============================================================
import { yuan } from "@/lib/report-math";
import { PERIOD_CN, type Advice, type PriceSignal, type SignalKind } from "@/lib/price-watch";

/** 信号 → 呈现词。红只给"变贵了";降价是好事但不涂成绿的(全站无彩色成功语义)。 */
const SKIN: Record<SignalKind, { en: string; cn: string; tone: "rust" | "ink" | "sub"; glyph: string }> = {
  increase: { en: "PRICE INCREASED", cn: "涨价", tone: "rust", glyph: "↑" },
  decrease: { en: "PRICE DECREASED", cn: "降价", tone: "ink", glyph: "↓" },
  "plan-change": { en: "PLAN CHANGED", cn: "套餐变化", tone: "ink", glyph: "⇄" },
  "promo-end": { en: "PROMO ENDED", cn: "优惠结束", tone: "rust", glyph: "↑" },
  unverified: { en: "PRICE UNVERIFIED", cn: "无法验证", tone: "sub", glyph: "?" },
  tracking: { en: "TRACKING", cn: "记录中", tone: "sub", glyph: "·" },
};

const ADVICE_SKIN: Record<Advice, string> = {
  cut: "bg-rust text-paper",
  review: "border border-rust/60 text-rust",
  keep: "border border-ink/30 text-ink",
};

const ADVICE_CN: Record<Advice, string> = { cut: "建议裁掉", review: "建议复核", keep: "建议保留" };

export function PriceAlert({ signal, demo = false }: { signal: PriceSignal; demo?: boolean }) {
  const { item, kind, from, to, pct, annualImpact, advice, note } = signal;
  const s = SKIN[kind];
  const up = (annualImpact ?? 0) > 0;
  const changed = kind === "increase" || kind === "decrease" || kind === "promo-end" || kind === "plan-change";

  return (
    <article className="border border-ink bg-paper">
      {/* 头:服务名 + 建议档 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-ink/15 px-4 py-3 sm:px-5">
        <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
          {item.name}
          {demo && <span className="mtag ml-2.5 align-middle text-[8px] text-sub/70">示例</span>}
        </h3>
        <div className="flex items-center gap-2">
          <span className="mtag text-[8.5px] text-sub/70">{s.en}</span>
          {advice && (
            <span className={`mtag px-1.5 py-[3px] text-[8px] leading-none ${ADVICE_SKIN[advice]}`}>
              {advice.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* 身份行:匹配依据摆在明面上(套餐 / 周期 / 币种 / 地区) */}
      <p className="mtag border-b border-ink/10 px-4 py-2 text-[8.5px] text-sub sm:px-5">
        {item.region || "地区未标注"} · {item.currency}
        {to?.period && <span> · {PERIOD_CN[to.period] ?? to.period}</span>}
        <span className="text-ink/25"> · 服务名+地区+币种一致才比对</span>
      </p>

      <div className="px-4 py-4 sm:px-5">
        {changed && from && to ? (
          <>
            {/* 价格变化 */}
            <p className="num flex flex-wrap items-baseline gap-x-2.5 text-[19px] font-bold tracking-[-0.02em] text-ink">
              <span className="text-sub/70 line-through decoration-ink/25 decoration-1">{yuan(from.amount)}</span>
              <span aria-hidden className="text-sub/50">→</span>
              <span className={up ? "text-rust" : "text-ink"}>{yuan(to.amount)}</span>
              <span className="text-[13px] font-normal text-sub">/ {to.period === "yearly" ? "年" : to.period === "quarterly" ? "季" : "月"}</span>
              {pct != null && (
                <span className={`mtag text-[10px] ${up ? "text-rust" : "text-ink"}`}>
                  {s.glyph} {pct > 0 ? "+" : ""}
                  {pct}%
                </span>
              )}
            </p>

            {/* 一年多花多少 —— 单价的差别换算成年,才有决策意义 */}
            {annualImpact != null && annualImpact !== 0 && (
              <p className="mt-2.5 text-[15px] font-semibold text-ink">
                {up ? "一年多花" : "一年少花"}{" "}
                <span className={`num ${up ? "text-rust" : "text-ink"}`}>{yuan(Math.abs(annualImpact))}</span>
                <span className="prose-sm ml-2 text-[12.5px] font-normal">
                  年化 {yuan(signal.annualFrom ?? 0)} → {yuan(signal.annualTo ?? 0)}
                </span>
              </p>
            )}

            <p className="mtag mt-2.5 text-[9px] text-sub">
              <span className={s.tone === "rust" ? "text-rust" : "text-sub"}>{s.cn}</span>
              {advice && <span className="text-ink/45"> · {ADVICE_CN[advice]}</span>}
            </p>
          </>
        ) : (
          <p className="text-[15px] leading-relaxed text-sub">
            {kind === "unverified" ? "这条订阅的价格无法确认,Trim 不给任何推断。" : "已记录这条订阅的单价。再导入一次账单,就能看出它有没有变。"}
          </p>
        )}

        {/* 依据行:来源永远写实话 */}
        <p className="mtag mt-3 border-t border-ink/10 pt-2.5 text-[8.5px] text-sub/80">
          来源:你的账单记录 · 最近比对 <span className="num">{to?.at ?? from?.at ?? "—"}</span>
        </p>
        {note && <p className="prose-sm mt-1.5 text-[12px] text-sub/85">{note}</p>}
      </div>
    </article>
  );
}
