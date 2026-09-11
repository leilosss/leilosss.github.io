// =============================================================
// PRICING /pricing —— Trim Pro(v2.8 重做:从「价格墙」改为"价格监控")
//
// 旧版是三栏价格表(Free / Pro / Concierge),用户看到的是"解锁更多功能"
// 的暗示 —— 说不清 Pro 到底买的是什么。这一版只讲一件事:
//
//   **免费版帮你看清这次花了多少,Pro 帮你盯住它下次会不会变贵。**
//
// 所以页面顺序是「你本机的真实记录 → 它盯出来的东西长什么样 → 它怎么盯的
// (含当前进度)→ 什么时候给建议 → 免费与 Pro 的分工 → 内测说明」。
// 不做倒计时、不做"仅剩 X 个名额"、不把 Concierge 混进主 CTA。
//
// 诚实边界(硬要求,勿改):所有价格信号来自**你自己的账单记录**,
// 页面上不出现 "Verified from official source""实时监控""官方校验" 这类
// 本机做不到的宣称;核价能力明写"内测中"。示例数据一律带「示例」标记。
// =============================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PriceAlert } from "@/components/trim/pro/price-alert";
import { WatchBoard } from "@/components/trim/pro/watch-board";
import { DEMO_WATCH } from "@/lib/price-watch-demo";
import { signalsOf } from "@/lib/price-watch";

export const metadata: Metadata = {
  title: "Trim Pro · 价格监控 — 再也不会被涨价偷袭",
  description:
    "Trim Pro 持续比对订阅单价:涨价、降价、套餐变化、优惠结束各是什么时候发生的,一年多花多少。价格记录只保存在你自己设备上,不联网核对任何平台价目。",
  alternates: { canonical: "/pricing" },
};

/** 演示卡(全部走真实判定逻辑,只是数据是示例) */
const DEMO_SIGNALS = signalsOf(DEMO_WATCH);
/** 四种有结论的信号(涨价在前);「无法验证」单独成一条 —— 它没有数字可给 */
const SIGNAL_CARDS = DEMO_SIGNALS.filter((s) => s.kind !== "unverified");
const UNVERIFIED = DEMO_SIGNALS.find((s) => s.kind === "unverified");

/** 管线四步 + 当前进度(如实标注,不写「即将上线」糊过去) */
const PIPELINE = [
  {
    no: "01",
    k: "记录单价",
    done: "已实现 · 本机",
    d: "每次导入账单,记住每个订阅的单价、周期、币种与来源。加密存在这台设备上,保存 400 天。",
    tone: "ink" as const,
  },
  {
    no: "02",
    k: "比对变化",
    done: "已实现 · 本机",
    d: "同一个服务(地区与币种一致)出现第二次时,自动比出涨价、降价、套餐变化与优惠结束。",
    tone: "ink" as const,
  },
  {
    no: "03",
    k: "核对官方价目",
    done: "内测中 · 需服务端",
    d: "定时检查官方价格页与官方公告,确认「账单上的价」与「官方标的价」一致,并把无法核对的项目标为 Price unverified。这一步需要服务端定时任务,当前尚未开放。",
    tone: "rust" as const,
  },
  {
    no: "04",
    k: "主动提醒",
    done: "内测中",
    d: "发现变化后主动通知你(而不是等你下次打开网站)。在提醒通道接通前,变化会显示在报告页与年度体检页。",
    tone: "rust" as const,
  },
];

/** 建议规则(公开给用户,而不是黑箱) */
const ADVICE_RULES = [
  { tag: "KEEP", tone: "ink" as const, t: "降价的、年化变便宜的 —— 继续留着", d: "月付改年付这类套餐变化,只要年化更省,Trim 也会建议保留。" },
  { tag: "REVIEW", tone: "rust" as const, t: "涨价的、优惠结束的 —— 值得重新看一眼", d: "涨 ¥7/月 和涨 ¥70/月 是两回事。只要还没到「该认真算算」的程度,都只提示复核,不替你决定。" },
  { tag: "CUT", tone: "rust" as const, t: "涨幅 ≥ 25% 且一年多花 ≥ ¥200,或一年多花 ≥ ¥400", d: "只有相对涨幅与绝对金额同时够大,才会给到「重新评估是否值得留」。最终裁不裁仍然是你说了算。" },
];

export default function ProPage() {
  return (
    <div className="bench mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      {/* ══════════ ① 价值主张 ══════════ */}
      <p className="mtag text-[10px] text-rust">TRIM PRO · PRICE WATCH</p>
      <h1 className="mt-4 text-[clamp(30px,6vw,54px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink">
        Never get surprised by<br className="hidden sm:block" /> a subscription price again.
      </h1>
      <p className="mt-5 text-[clamp(19px,2.6vw,26px)] font-extrabold tracking-[-0.03em] text-ink">
        订阅的价,Trim 帮你盯着。
      </p>
      <p className="prose-body mt-4 max-w-[50ch]">
        免费版帮你看清这次花了多少 —— 导入、识别、算出年度总支出与可省金额。
        Pro 接着盯住这些订阅:<span className="font-semibold text-ink">哪个涨价了、涨了多少、一年多花多少钱</span>,
        不用你自己每月去对账单。
      </p>

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
        <Link href="/upload" className="stamp-cta self-start">
          <span className="stamp-cta-inner">开启价格监控</span>
        </Link>
        <Link
          href="#how"
          className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust"
        >
          先看它怎么盯 ↓
        </Link>
      </div>

      <p className="mtag mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-ink/15 pt-4 text-[9.5px] text-sub">
        <span className="border border-rust px-2 py-1 text-rust">内测中</span>
        <span>现在使用不需要付钱</span>
        <span className="text-ink/25">|</span>
        <span>未开放支付,也不会自动扣款</span>
      </p>

      {/* ══════════ ② 你本机的真实记录(有才显示) ══════════ */}
      <div className="mt-16 empty:mt-0">
        <WatchBoard />
      </div>

      {/* ══════════ ③ 它盯出来的东西长什么样(示例) ══════════ */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>WHAT IT CATCHES · 它盯出来的四种变化</span>
          <span className="text-rust">示例数据</span>
        </p>
        <p className="prose-body mt-5 max-w-[54ch]">
          下面是把价格记录比对出来之后,你会看到的样子(数据为示例,不代表任何平台的当前售价)。
        </p>

        {/* 四种"有结论"的信号并排;无法验证单独放,因为它的形态本来就不同(没有数字可给) */}
        <div className="mt-7 grid items-start gap-4 sm:grid-cols-2">
          {SIGNAL_CARDS.map((s) => (
            <PriceAlert key={s.item.key} signal={s} demo />
          ))}
        </div>
        {UNVERIFIED && (
          <div className="mt-4">
            <PriceAlert signal={UNVERIFIED} demo />
          </div>
        )}

        <p className="prose-sm mt-5 text-[13px]">
          最后一张是关键:数据不足以判断时,它写的是{" "}
          <span className="mtag text-[9.5px] text-sub">PRICE UNVERIFIED</span>,而不是猜一个数字。
          这条纪律贯穿整个监控链路。
        </p>
      </section>

      {/* ══════════ ④ 怎么盯的 + 当前进度 ══════════ */}
      <section id="how" className="mt-16 scroll-mt-20 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>HOW IT WORKS · 怎么盯的</span>
          <span className="text-ink/40">四步</span>
        </p>
        <div className="mt-5 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
          {PIPELINE.map((p) => (
            <div key={p.no} className="bg-paper px-5 py-6">
              <p className="mtag flex items-baseline gap-2.5 text-[9px]">
                <span className={p.tone === "rust" ? "text-rust" : "text-sub"}>{p.no}</span>
                <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">{p.k}</span>
              </p>
              <p className={`mtag mt-2.5 text-[8.5px] ${p.tone === "rust" ? "text-rust" : "text-ink/45"}`}>{p.done}</p>
              <p className="prose-sm mt-2.5 text-[13.5px]">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-l-2 border-rust pl-5">
          <p className="mtag text-[9px] text-rust">为什么不做成「实时看价」</p>
          <p className="prose-body mt-2 max-w-[62ch] text-[15px]">
            01 与 02 步用的是你自己导入的账单:它证明得了「你实际被扣了多少」,证明不了「官方现在标价多少」。
            我们还没有定时核对官方价目的能力,所以这里不写「实时看价」「已核验官方价格」这类做不到的话 ——
            两者之间的差距正是第 03 步要做的事,也是 Pro 内测结束前不收费的原因。
          </p>
        </div>
      </section>

      {/* ══════════ ⑤ 匹配规则 + 建议规则 ══════════ */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>MATCHING · 什么算"同一个订阅"</span>
          <span className="text-ink/40">防止误报</span>
        </p>
        <p className="prose-body mt-5 max-w-[58ch]">
          价格比对最容易出的错,是拿两个根本不同的东西比。Trim 的匹配键是
          <span className="font-semibold text-ink"> 服务名 + 地区 + 币种</span> —— 三者一致才比:
        </p>
        <ul className="mt-4 border-t border-ink/12">
          {[
            { k: "地区", v: "同一个服务在不同地区是不同价格,港区与国区不互相比" },
            { k: "币种", v: "外币扣款与人民币扣款不互相比,对不上就标 Price unverified" },
            { k: "套餐 / 周期", v: "不进匹配键 —— 正因为要能认出「月付改年付」这类变化,才单独作为信号判断" },
          ].map((r) => (
            <li key={r.k} className="grid gap-x-6 gap-y-1 border-b border-ink/10 py-3.5 sm:grid-cols-[132px_minmax(0,1fr)]">
              <p className="mtag pt-0.5 text-[9px] text-rust">{r.k}</p>
              <p className="prose-body text-[14.5px]">{r.v}</p>
            </li>
          ))}
        </ul>

        <p className="rule-label mtag mt-10 text-[9.5px] text-sub">
          <span>ADVICE · 建议是怎么给的</span>
          <span className="text-ink/40">规则公开</span>
        </p>
        <ul className="mt-4 border-t border-ink/12">
          {ADVICE_RULES.map((r) => (
            <li key={r.tag} className="grid gap-x-6 gap-y-1.5 border-b border-ink/10 py-4 sm:grid-cols-[96px_minmax(0,1fr)]">
              <p className={`mtag h-fit px-1.5 py-[3px] text-[8.5px] ${r.tone === "rust" ? "border border-rust/60 text-rust" : "border border-ink/30 text-ink"}`}>
                {r.tag}
              </p>
              <div>
                <p className="text-[15px] font-semibold text-ink">{r.t}</p>
                <p className="prose-sm mt-1 text-[13.5px]">{r.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ══════════ ⑥ 免费与 Pro 的分工(不是价格墙) ══════════ */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>FREE vs PRO · 分工</span>
          <span className="text-ink/40">Pro 内测期间均免费</span>
        </p>
        <div className="mt-5 grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-2">
          <div className="bg-paper px-5 py-7 sm:px-7">
            <p className="mtag text-[9.5px] text-sub">FREE · 永久免费</p>
            <h2 className="mt-3 text-[22px] font-extrabold tracking-[-0.025em] text-ink">看清这一次</h2>
            <p className="prose-sm mt-2 text-[14px]">导入一次账单,把这次花的钱看明白。</p>
            <ul className="mt-6 border-t border-ink/12">
              {[
                "导入账单,本地识别订阅",
                "年度订阅总支出",
                "CUT / KEEP 逐条裁决",
                "可省金额与取消清单",
                "裁剪小票 · 本机暂存 7 天",
              ].map((f) => (
                <li key={f} className="border-b border-ink/10 py-2.5 text-[14.5px] leading-relaxed text-ink">
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative bg-paper px-5 py-7 sm:px-7">
            <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-rust" />
            <p className="mtag flex flex-wrap items-baseline gap-x-3 text-[9.5px]">
              <span className="text-rust">TRIM PRO</span>
              <span className="text-sub">¥6.9 / 月 · 或 ¥49 / 年</span>
            </p>
            <h2 className="mt-3 text-[22px] font-extrabold tracking-[-0.025em] text-ink">持续盯着</h2>
            <p className="prose-sm mt-2 text-[14px]">不用你记着对账单,价格变了会浮出来。</p>
            <ul className="mt-6 border-t border-ink/12">
              {[
                "价格监控记录(本机,保存 400 天)",
                "涨价 / 降价 / 套餐变化 / 优惠结束,四种变化自动比对",
                "一年多花多少钱,直接换算给你看",
                "价格变动与 KEEP / REVIEW / CUT 建议",
                "官方价目核对与主动提醒(内测中,开放后一并包含)",
                "年度体检:新增、已取消、涨价一览",
              ].map((f) => (
                <li key={f} className="border-b border-ink/10 py-2.5 text-[14.5px] leading-relaxed text-ink">
                  {f}
                </li>
              ))}
            </ul>
            <p className="prose-sm mt-5 text-[13px]">
              内测期间以上全部免费使用,不收取任何费用。开放支付时会提前在本站公告,
              并保持当前价格至少一个计费周期不变。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ ⑦ Concierge(压缩保留;边界不删) ══════════ */}
      <section id="concierge" className="mt-16 scroll-mt-20 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>CONCIERGE · 取消代办(付费)</span>
          <span className="text-ink/40">小范围试运行</span>
        </p>
        <p className="prose-body mt-5 max-w-[56ch]">
          有些订阅藏得很深(App 内跳转、境外扣款、只能找客服)。Concierge 由人工协助你走完取消,
          按订阅数量计费:<span className="num font-semibold text-rust">¥9.9 / 个</span>,下单前先告诉你总价。
        </p>
        <ul className="mt-5 border-t border-ink/12">
          {[
            "按订阅数量收费,不按节省金额抽成;确认前不会产生任何费用。",
            "Trim 不会索取你的账号密码,也不会代你登录 —— 协助 = 提供路径、话术与跟进确认。",
            "若某个订阅最终无法通过协助取消,该笔费用全额退还。",
            "涉及境外服务或需要本人身份验证的场景,必须由你本人操作。",
          ].map((t) => (
            <li key={t} className="border-b border-ink/10 py-2.5 text-[14.5px] leading-relaxed text-sub">
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ══════════ ⑧ 替代品披露(保留) ══════════ */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>ALTERNATIVES · 更便宜的替代</span>
          <span className="text-ink/40">商业关系披露</span>
        </p>
        <p className="prose-body mt-5 max-w-[56ch]">
          准备取消某个订阅时,Trim 可能会展示更便宜的替代方案。
          <span className="font-semibold text-ink">未来若某条推荐带来佣金,会在该条目上明确标注「推广」</span>,
          并且不影响排序与判定 —— Trim 不会因为佣金建议你裁掉本该保留的订阅。当前未接入任何佣金合作。
        </p>
      </section>

      {/* ══════════ ⑨ 收束 ══════════ */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <h2 className="sect text-ink">先让它记住一个价格。</h2>
        <p className="prose-body mt-4 max-w-[46ch]">
          导入一次账单,价格记录就开始了。下一次导入,它就能告诉你哪些变贵了。
        </p>
        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <Link href="/upload" className="stamp-cta self-start">
            <span className="stamp-cta-inner">开启价格监控</span>
          </Link>
          <Link
            href="/report?d=demo"
            className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust"
          >
            先看示例报告 →
          </Link>
        </div>
        <p className="mtag mt-6 text-[9px] text-sub">
          不需要注册 · 不连银行卡 · 价格记录只存在你自己的设备上
        </p>
      </section>
    </div>
  );
}
