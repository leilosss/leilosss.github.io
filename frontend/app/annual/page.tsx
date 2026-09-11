// =============================================================
// ANNUAL /annual —— 年度订阅体检(v2.0 · 留存机制)
// 解决"用一次就走"的问题:一年后再来一次,对比去年这份账单。
// 当前形态 = 体检报告的样张 + 本机历史(vault 内报告)对比入口。
// 所有数据来自本机加密暂存,不联网、不上传。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";

import { WatchBoard } from "@/components/trim/pro/watch-board";
import { sumAnnual, yuan } from "@/lib/report-math";
import { ensureReady, reportsStore } from "@/lib/store";
import { sampleReport } from "@/lib/sample-report";
import type { PriceSignal } from "@/lib/price-watch";
import type { DetectResult } from "@/lib/types";
import { watchReady, watchStore } from "@/lib/watch-store";

export default function AnnualPage() {
  const [latest, setLatest] = React.useState<DetectResult | null>(null);
  const [latestId, setLatestId] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [signals, setSignals] = React.useState<PriceSignal[]>([]);

  React.useEffect(() => {
    (async () => {
      await ensureReady();
      const lid = reportsStore.latestId();
      setLatestId(lid);
      setLatest(lid ? reportsStore.get(lid) : null);
      // 真实的价格监控记录(本机加密,400 天):与示例数据严格分开
      await watchReady();
      setSignals(watchStore.signals());
      setLoaded(true);
    })();
  }, []);

  const demo = sampleReport();
  const shown = latest ?? demo;
  const isReal = Boolean(latest);
  const cutable = shown.subscriptions.filter((s) => s.reason && s.reason !== "ACTIVE" && s.reason !== "RECURRING");
  const potential = sumAnnual(cutable);
  /* 示例报告里带的涨价样例(iCloud ¥5 → ¥6)—— 只在没有真实记录时充当天花板演示 */
  const demoPriceUps = shown.subscriptions.filter((s) => s.prev_amount != null && s.prev_amount < s.amount);
  const watchUps = signals.filter((s) => s.kind === "increase" || s.kind === "promo-end");
  const hasWatch = signals.length > 0;
  const increaseCount = isReal ? watchUps.length : demoPriceUps.length;

  return (
    <div className="bench mx-auto w-full max-w-[880px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="mtag text-[10px] text-rust">ANNUAL TRIM · 年度体检</p>
      <h1 className="mt-4 text-[clamp(32px,7vw,56px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink">
        一年过去了,<br className="sm:hidden" />你的订阅变多了吗?
      </h1>
      <p className="prose-body mt-5 max-w-[46ch]">
        订阅会自己长出来:试用转正、平台涨价、朋友推荐的新服务。每年花 5 分钟,重新粘一次账单。
      </p>

      {/* 状态说明 */}
      <p className="mtag mt-8 border-t border-ink/15 pt-4 text-[9.5px] text-sub">
        {!loaded ? "读取本机记录…" : isReal ? `本机最近一份报告 · ${(shown.generated_at ?? "").slice(0, 10)}` : "本机暂无报告 —— 下面是示例体检"}
      </p>

      {/* ---------- 体检五项 ---------- */}
      <dl className="mt-5 border-t border-ink/15">
        {[
          { k: "TOTAL SPEND", label: "年度订阅总支出", v: yuan(sumAnnual(shown.subscriptions)), tone: "ink" },
          { k: "SUBSCRIPTIONS", label: "识别到的订阅", v: `${shown.summary.sub_count} 个`, tone: "ink" },
          { k: "PRICE INCREASES", label: "检测到的涨价", v: increaseCount ? `${increaseCount} 项` : "无", tone: increaseCount ? "rust" : "ink" },
          { k: "POTENTIAL SAVINGS", label: "还能省下", v: `${yuan(potential)} / 年`, tone: "rust" },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink/12 py-5">
            <dt>
              <span className="mtag block text-[9.5px] text-sub">{r.k}</span>
              <span className="prose-body text-[15px]">{r.label}</span>
            </dt>
            <dd className={`figure figure-md ${r.tone === "rust" ? "text-rust" : "text-ink"}`}>{r.v}</dd>
          </div>
        ))}
      </dl>

      {/* ---------- 价格监控(PRICE WATCH) ---------- */}
      <section className="mt-14">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>PRICE WATCH · 价格监控</span>
          <span className="text-ink/40">{hasWatch ? `${signals.length} 项记录` : "尚无记录"}</span>
        </p>

        {/* ① 有真实记录:直接上真实卡片(涨价排前面) */}
        {hasWatch && (
          <div className="mt-5">
            <WatchBoard heading={false} />
          </div>
        )}

        {/* ② 没有真实记录,看的是示例报告:用示例说清它会给出什么,标明「示例」 */}
        {!hasWatch && !isReal && demoPriceUps.length > 0 && (
          <>
            <ul className="mt-2">
              {demoPriceUps.map((s) => {
                const diff = (s.amount - (s.prev_amount ?? s.amount)) * 12;
                return (
                  <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-ink/12 py-4">
                    <div>
                      <p className="text-[16px] font-bold tracking-[-0.015em] text-ink">
                        {s.name}
                        <span className="mtag ml-2.5 align-middle text-[8px] text-sub/70">示例</span>
                      </p>
                      <p className="mtag mt-1 text-[9px] text-rust">PRICE INCREASE</p>
                    </div>
                    <div className="text-right">
                      <p className="num text-[15px] text-ink">
                        <span className="text-sub line-through">¥{s.prev_amount}</span>
                        <span aria-hidden className="mx-2 text-sub/60">→</span>
                        <span className="font-bold text-rust">¥{s.amount}</span>
                      </p>
                      <p className="prose-sm mt-0.5 text-[13px]">每年多付 {yuan(diff)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="prose-sm mt-4 text-[13px]">
              这是示例报告里的样例。你自己的价格记录要等你导入账单之后才会开始积累。
            </p>
          </>
        )}

        {/* ③ 有真实报告但还没有价格记录(旧版本留下的报告):如实说明怎么开始 */}
        {!hasWatch && isReal && (
          <p className="prose-body mt-5 text-[15px]">
            还没有价格记录 —— 价格监控按「记一次、比一次」工作:导入账单时记下单价,再导入一次才能比出涨跌。
            下次体检时它就有东西可比了。
          </p>
        )}

        <p className="prose-sm mt-5 text-[13.5px]">
          价格记录按「服务名 + 地区 + 币种」配对,加密存在这台设备上(保存 400 天,可清除)。
          Trim 不联网核对任何平台的价目:它说的是「你实际被扣了多少」,不是「官方现在标价多少」。
        </p>
      </section>

      {/* ---------- 行动 ---------- */}
      <section className="mt-16 border-t border-ink/15 pt-10">
        <h2 className="sect text-ink">再体检一次。</h2>
        <p className="prose-body mt-4 max-w-[42ch]">
          粘贴最近 3 个月的账单,和上次的结果对比 —— 看看哪些又悄悄长回来了。
        </p>
        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <Link href="/upload" className="stamp-cta self-start">
            <span className="stamp-cta-inner">重新体检</span>
          </Link>
          {latestId && (
            <Link href={`/report?d=${latestId}`} className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust hover:decoration-rust">
              打开最近报告 →
            </Link>
          )}
          <Link href="/pricing" className="mtag self-start text-[10px] text-sub underline decoration-ink/25 decoration-1 underline-offset-4 transition-colors hover:text-rust">
            自动提醒(PRO)
          </Link>
        </div>
      </section>
    </div>
  );
}
