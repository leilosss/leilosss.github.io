// =============================================================
// WatchBoard —— 你本机的价格监控记录(真实数据,不是示例)
//
// 数据来自 watch-store(本机加密,保存 400 天):每次导入账单时按
// 「服务 + 地区 + 币种」记账,第二次导入起才可能出现涨跌结论。
// 没有记录 = 不渲染任何东西,不放"暂无数据"的空壳。
//
// variant:
//   "full"    完整卡片列表(Pro 页 / 年度体检页)
//   "compact" 报告页里的一条摘要带(只给结论 + 条数)
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";

import { PriceAlert } from "@/components/trim/pro/price-alert";
import { totalIncrease, type PriceSignal } from "@/lib/price-watch";
import { yuan } from "@/lib/report-math";
import { WATCH_KEEP_DAYS, watchReady, watchStore } from "@/lib/watch-store";

export function WatchBoard({
  variant = "full",
  heading = true,
}: {
  variant?: "full" | "compact";
  heading?: boolean;
}) {
  const [signals, setSignals] = React.useState<PriceSignal[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await watchReady();
      if (alive) setSignals(watchStore.signals());
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!signals || signals.length === 0) return null;

  const changes = signals.filter((s) => s.kind !== "tracking" && s.kind !== "unverified");
  const ups = totalIncrease(signals);

  /* ---------- 紧凑版:报告页顶部的一条结论带 ---------- */
  if (variant === "compact") {
    if (changes.length === 0) return null;
    return (
      <div className="mx-5 mt-6 border border-ink/25 bg-paperDeep/50 px-5 py-4 sm:mx-8">
        <p className="mtag flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[9px] text-sub">
          <span className="text-rust">PRICE WATCH · 本机价格监控</span>
          <span>{changes.length} 项价格变动</span>
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          你在意的订阅里,有 <span className="num font-semibold text-rust">{changes.length}</span> 项的单价和上次记录不一样
          {ups > 0 && (
            <>
              ,涨价合计让你一年多花 <span className="num font-semibold text-rust">{yuan(ups)}</span>
            </>
          )}
          。<Link href="/annual" className="linku font-semibold">看明细 →</Link>
        </p>
      </div>
    );
  }

  /* ---------- 完整版 ---------- */
  return (
    <section>
      {heading && (
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>YOUR PRICE WATCH · 你本机的价格记录</span>
          <span className="text-ink/40">
            {signals.length} 项 · 保存 {WATCH_KEEP_DAYS} 天
          </span>
        </p>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {signals.map((s) => (
          <PriceAlert key={s.item.key} signal={s} />
        ))}
      </div>
      {changes.length === 0 && (
        <p className="prose-sm mt-4 text-[13.5px]">
          目前只记录到单价,还没到能比对的时候 —— 再导入一次账单,涨跌就会浮出来。
        </p>
      )}
      <p className="prose-sm mt-4 text-[13px]">
        记录只存在这台设备上(加密,{WATCH_KEEP_DAYS} 天),来源是你自己导入的账单 ——
        Trim 不联网核对任何平台的价目。
      </p>
    </section>
  );
}
