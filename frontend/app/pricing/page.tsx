// =============================================================
// PRICING /pricing —— 商业化(v2.0)
// 结构:先用后买 —— 免费层完整可用,Pro 解决"一次性使用"问题,
//       Concierge 解决"我懒得自己取消",替代品推荐明确披露商业关系。
// 铁律:定价与收费规则必须在 UI 上说清楚,不做暗示性收费、不夸大能力。
// 视觉:价目表 = 收据/账单排版(1px 线 + 等宽标签 + 超粗数字),无卡片圆角阴影。
// =============================================================
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "定价 — Trim",
  description: "Trim 免费分析你的订阅账单。Pro ¥6.9/月提供价格监测、重复扣费检测与年度体检;取消代办按次收费,规则全部公开。",
};

const TIERS = [
  {
    key: "FREE",
    name: "Free",
    price: "¥0",
    unit: "永久免费",
    lead: "先看到价值,再谈钱。",
    features: [
      "粘贴账单,本地识别订阅",
      "年度订阅总支出计算",
      "CUT / KEEP 逐条裁决",
      "可省金额与取消清单",
      "裁剪小票导出",
      "本机加密暂存 7 天",
    ],
    cta: { label: "START TRIMMING", href: "/upload" },
    primary: true,
  },
  {
    key: "PRO",
    name: "Trim Pro",
    price: "¥6.9",
    unit: "/ 月 · 或 ¥49 / 年",
    lead: "订阅会变,体检不能只做一次。",
    features: [
      "Free 全部功能",
      "价格上涨检测(如 ¥49 → ¥59)",
      "重复扣费与重叠订阅检测",
      "历史报告对比(多次分析)",
      "年度订阅体检报告",
      "高级导出(CSV / 清单 / 小票)",
      "各平台取消路径速查",
    ],
    cta: { label: "了解 PRO", href: "#pro-note" },
    primary: false,
  },
  {
    key: "CONCIERGE",
    name: "Concierge",
    price: "¥9.9",
    unit: "/ 每个订阅",
    lead: "不想自己一个个去关?",
    features: [
      "人工协助整理取消路径",
      "针对难取消的服务给出具体话术",
      "跟进确认是否成功停止扣费",
      "按订阅数量计费,取消前明确报价",
    ],
    cta: { label: "了解代办", href: "#concierge" },
    primary: false,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="bench mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="mtag text-[10px] text-rust">PRICING · 定价</p>
      <h1 className="mt-4 text-[clamp(32px,7vw,58px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink">
        先省下钱,<br className="sm:hidden" />再考虑付钱。
      </h1>
      <p className="prose-body mt-5 max-w-[46ch]">
        分析账单、找出可裁订阅、算出年度节省 —— 这些永远免费,且不需要注册。
      </p>

      {/* ---------- 价目表 ---------- */}
      <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 lg:grid-cols-3">
        {TIERS.map((t) => (
          <section key={t.key} className={`flex flex-col bg-paper px-5 py-8 sm:px-7 ${t.primary ? "relative" : ""}`}>
            {t.primary && (
              <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-rust" />
            )}
            <p className={`mtag text-[10px] ${t.primary ? "text-rust" : "text-sub"}`}>{t.key}</p>
            <h2 className="mt-3 text-[22px] font-extrabold tracking-[-0.025em] text-ink">{t.name}</h2>
            <p className="prose-sm mt-1.5 text-[14px]">{t.lead}</p>

            <p className="mt-7 flex items-baseline gap-2">
              <span className="figure figure-lg text-ink">{t.price}</span>
              <span className="mtag text-[9.5px] text-sub">{t.unit}</span>
            </p>

            <ul className="mt-7 flex-1 border-t border-ink/12">
              {t.features.map((f) => (
                <li key={f} className="flex items-baseline gap-3 border-b border-ink/10 py-2.5">
                  <svg width="11" height="9" viewBox="0 0 13 11" aria-hidden fill="none" className={`shrink-0 translate-y-[1px] ${t.primary ? "text-rust" : "text-ink/45"}`}>
                    <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="prose-body text-[14.5px]">{f}</span>
                </li>
              ))}
            </ul>

            <p className="mt-7">
              {t.primary ? (
                <Link href={t.cta.href} className="stamp-cta inline-block">
                  <span className="stamp-cta-inner !py-[10px] !text-[13.5px]">{t.cta.label}</span>
                </Link>
              ) : (
                <Link
                  href={t.cta.href}
                  className="mtag border border-ink/35 px-4 py-3 text-[10px] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                >
                  {t.cta.label}
                </Link>
              )}
            </p>
          </section>
        ))}
      </div>

      {/* ---------- Pro 说明 ---------- */}
      <section id="pro-note" className="mt-20 scroll-mt-20">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>WHY PRO · 为什么需要 Pro</span>
          <span className="text-ink/40">¥6.9 / 月</span>
        </p>
        <div className="mt-7 grid gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">订阅是会变的</h3>
            <p className="prose-body mt-3">
              今天裁完不代表明年干净:平台会涨价,新服务会悄悄加进来,试用期会自动转正。
              Pro 的价值不是更多按钮,而是<strong className="font-semibold">让这件事每年只花你 5 分钟</strong>。
            </p>
          </div>
          <ul className="border-t border-ink/12">
            {[
              { k: "PRICE WATCH", v: "记住每个订阅的单价,涨价时告诉你多花了多少" },
              { k: "DUPLICATE", v: "找出功能重叠的订阅(两个网盘、三个视频会员)" },
              { k: "ANNUAL TRIM", v: "每年一份体检:新增、已取消、涨价、还能省多少" },
            ].map((r) => (
              <li key={r.k} className="border-b border-ink/10 py-3.5">
                <p className="mtag text-[9.5px] text-rust">{r.k}</p>
                <p className="prose-body mt-1 text-[14.5px]">{r.v}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="prose-sm mt-6 text-[13.5px]">
          Pro 目前在内测,尚未开放支付。开放前不会向任何人收费,也不会自动扣款。
        </p>
      </section>

      {/* ---------- Concierge 披露 ---------- */}
      <section id="concierge" className="mt-20 scroll-mt-20">
        <div className="border border-rust bg-rust/[0.04] px-5 py-7 sm:px-8 sm:py-9">
          <p className="mtag text-[10px] text-rust">CONCIERGE · 取消代办(付费)</p>
          <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.025em] text-ink">
            不想自己一个个去关?
          </h3>
          <p className="prose-body mt-4 max-w-[52ch]">
            有些订阅藏得很深(App 内跳转、境外扣款、客服才能停)。Concierge 由人工协助你完成取消,
            按订阅数量计费:<span className="num font-semibold text-rust">¥9.9 / 个</span>,下单前会先告诉你总价。
          </p>
          <div className="mt-6 border-t border-rust/25 pt-5">
            <p className="mtag text-[9.5px] text-rust">收费与边界(请先读)</p>
            <ul className="mt-3 space-y-2">
              {[
                "按订阅数量收费,不按节省金额抽成;确认前不会产生任何费用。",
                "Trim 不会索取你的账号密码,也不会代你登录 —— 协助 = 提供路径、话术与跟进确认。",
                "若某个订阅最终无法通过协助取消,该笔费用全额退还。",
                "涉及境外服务或需要本人身份验证的场景,必须由你本人操作。",
              ].map((t) => (
                <li key={t} className="flex items-baseline gap-3">
                  <span aria-hidden className="mtag shrink-0 text-[9px] text-rust">·</span>
                  <span className="prose-body text-[14.5px]">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="prose-sm mt-6 text-[13.5px]">
            Concierge 目前在小范围试运行,尚未开放下单。
          </p>
        </div>
      </section>

      {/* ---------- 替代品推荐(Affiliate 披露) ---------- */}
      <section className="mt-20">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>ALTERNATIVES · 更便宜的替代</span>
          <span className="text-ink/40">披露</span>
        </p>
        <p className="prose-body mt-5 max-w-[52ch]">
          准备取消某个订阅时,Trim 可能会展示更便宜的替代方案,并标出每月/每年能省多少。
        </p>
        <div className="mt-6 border border-ink/20">
          <div className="mtag grid grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr] gap-x-3 border-b border-ink/15 px-4 py-2.5 text-[8.5px] text-sub">
            <span>CURRENT</span>
            <span>ALTERNATIVE</span>
            <span className="text-right">月省</span>
            <span className="text-right">年省</span>
          </div>
          <div className="grid grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr] items-baseline gap-x-3 px-4 py-3.5">
            <span className="text-[14.5px] font-semibold text-ink">示例订阅 ¥68</span>
            <span className="text-[14.5px] text-sub">同类方案 ¥28</span>
            <span className="num text-right text-[14px] text-rust">¥40</span>
            <span className="num text-right text-[14px] font-semibold text-rust">¥480</span>
          </div>
        </div>
        <p className="prose-sm mt-4 text-[13.5px]">
          <strong className="font-semibold text-ink">商业关系披露:</strong>
          未来若某条推荐带来佣金,会在该条目上明确标注「推广」,并且不影响排序与判定 ——
          Trim 不会因为佣金建议你裁掉本该保留的订阅。当前未接入任何佣金合作。
        </p>
      </section>

      {/* ---------- 收束 ---------- */}
      <section className="mt-20 border-t border-ink/15 pt-10">
        <h2 className="sect text-ink">先算算你能省多少。</h2>
        <p className="prose-body mt-4 max-w-[42ch]">不需要注册,不连银行卡,30 秒出结果。</p>
        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <Link href="/upload" className="stamp-cta self-start">
            <span className="stamp-cta-inner">START TRIMMING</span>
          </Link>
          <Link href="/report?d=demo" className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust hover:decoration-rust">
            先看示例报告 →
          </Link>
        </div>
      </section>
    </div>
  );
}
