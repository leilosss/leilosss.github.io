// =============================================================
// INDEX 首页区块(vestris 编辑室)
// 实演窗 / 隐私表 / 判定语法;全站一次签名时刻 = 逐字显影
// =============================================================
"use client";

import * as React from "react";

import { Reveal, useInViewOnce } from "@/components/trim/reveal";
import { demoInitialCut, sampleReport } from "@/lib/sample-report";

const SAMPLE = sampleReport();

const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/* =============================================================
   01 演示台账(时序版,v12):滚动进判定带后逐条划线(非加载即完成)
   默认 3 CUT · 5 KEEP;划线与整行浸色随 reveal 计数逐条触发
   ============================================================= */
export function LedgerDemo() {
  const subs = SAMPLE.subscriptions;
  const [dec, setDec] = React.useState<Record<string, "cut" | "keep">>(() =>
    demoInitialCut(subs),
  );
  /* v12 时序:进判定带后,默认 CUT 行每隔 220ms 逐条划出 */
  const { ref: boxRef, on: inView } = useInViewOnce<HTMLDivElement>(0.3, "0px 0px -18% 0px");
  const [revealed, setRevealed] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    const cutIds = subs.filter((s) => dec[String(s.id)] === "cut").length;
    if (cutIds === 0) {
      setRevealed(0);
      return;
    }
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= cutIds) window.clearInterval(t);
    }, 220);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const cutTotal = subs.filter((s) => dec[String(s.id)] === "cut").length;
  const cutN = Math.min(cutTotal, revealed); // 随逐条划线递增(时序可视化)
  const cutSum = subs.filter((s) => dec[String(s.id)] === "cut").reduce((n, s) => n + s.amount, 0);
  const keepSum = subs.reduce((n, s) => n + s.amount, 0) - cutSum;
  const keepN = subs.length - cutN;
  const cutOrders = new Map<number, number>(); // subId → 划线序号
  let o = 0;
  subs.forEach((s) => {
    if (dec[String(s.id)] === "cut") cutOrders.set(Number(s.id), o++);
  });

  return (
    <div ref={boxRef} className="w-full border border-ink bg-paper">
      {/* 窗顶栏 */}
      <div className="flex items-center justify-between gap-3 border-b border-ink/15 px-4 py-2.5">
        <span className="tag text-[10px] text-ink">订阅账本</span>
        <span className="border border-ink/25 px-1.5 py-[3px] text-[9px] text-sub tag">Demo · 示例数据</span>
      </div>

      {/* 裁决行(默认 CUT 行随 reveal 逐条划出) */}
      <ul className="px-4">
        {subs.map((s) => {
          const isCut = dec[String(s.id)] === "cut";
          const order = cutOrders.get(Number(s.id)) ?? 99;
          const shown = !isCut || order < revealed;
          return (
            <li
              key={s.id}
              className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-ink/10 py-[9px] transition-colors duration-300"
              style={undefined}
            >
              <span
                className={`cut-strike truncate text-[13.5px] font-medium ${
                  isCut && shown ? "is-cut text-sub" : "text-ink"
                }`}
              >
                {s.name}
              </span>
              <span className={`num text-xs ${isCut && shown ? "text-sub" : "text-ink"}`}>
                ¥{money(s.amount)}<span className="text-sub/70">/月</span>
              </span>
              <span className="tag flex items-center gap-2.5 text-[9px]">
                <button
                  onClick={() => setDec((p) => ({ ...p, [String(s.id)]: "cut" }))}
                  aria-pressed={isCut}
                  className={isCut ? "text-rust underline decoration-1 underline-offset-[3px]" : "text-sub transition-colors hover:text-ink"}
                >
                  CUT
                </button>
                <button
                  onClick={() => setDec((p) => ({ ...p, [String(s.id)]: "keep" }))}
                  aria-pressed={!isCut}
                  className={!isCut ? "text-ink underline decoration-1 underline-offset-[3px]" : "text-sub transition-colors hover:text-ink"}
                >
                  KEEP
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {/* 汇总(实时) */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
        <span className="tag text-[9px] text-sub">
          {cutN} CUT · {keepN} KEEP
        </span>
        <p className="num text-xs" aria-live="polite">
          <span className="text-sub">月支出 </span>
          <span className={`cut-strike text-sub ${cutN > 0 ? "is-cut" : ""}`}>¥{money(keepSum + cutSum)}</span>
          <span aria-hidden className="mx-1.5 text-sub/60">→</span>
          <span className="font-semibold text-ink">¥{money(keepSum)}</span>
          <span className="ml-3 font-semibold text-rust">年省 ¥{money(cutSum * 12)}</span>
        </p>
      </div>

      <p className="border-t border-ink/15 px-4 py-2 text-right text-[10px] leading-relaxed text-sub">
        演示账本,与示例报告同源;真实粘贴见 <a className="linku" href="/upload">/upload</a>
      </p>
    </div>
  );
}

/* =============================================================
   钩线叙事行(v12):「每月 ¥328 在悄悄续费」穿过判定线 →
   红线划掉 + 数字跳到 ¥186(裁掉的部分,就是省下的)
   ============================================================= */
export function CutStrikeDemo() {
  const { ref, on } = useInViewOnce<HTMLDivElement>(0.5, "0px 0px -24% 0px");
  const [crossed, setCrossed] = React.useState(false);
  React.useEffect(() => {
    if (!on) return;
    const t = window.setTimeout(() => setCrossed(true), 780);
    return () => window.clearTimeout(t);
  }, [on]);
  return (
    <div ref={ref} className="mt-8 border-t border-ink/15 pt-6">
      <p className="text-[15px] leading-relaxed text-ink/85">
        <span className="font-semibold text-ink">每月 </span>
        <span className={`num cut-strike font-semibold ${on || crossed ? "is-cut" : ""}`}>
          ¥328
        </span>
        <span className="text-ink/70"> 在悄悄续费 —— </span>
        <span className={`num font-semibold transition-colors duration-500 ${crossed ? "text-rust" : "text-sub"}`}>
          {crossed ? "¥186" : "¥328"}
        </span>
        <span className="text-ink/70"> 留下,一年省 </span>
        <span className={`num font-semibold ${crossed ? "text-rust" : "text-sub"}`}>
          ¥1,704
        </span>
        <span className="text-ink/70">。</span>
      </p>
    </div>
  );
}

/* =============================================================
   02 隐私表:行 = 标签 + 大字声明 + 说明;只陈述产品事实
   ============================================================= */
const PRIVACY_ROWS = [
  {
    label: "Uploaded",
    value: "0 个文件上传",
    note: "账单文件只在本机浏览器内存里解析,不存在上传入口。",
  },
  {
    label: "Processed",
    value: "100% 本地解析",
    note: "支付宝 CSV、微信 xlsx / CSV 原生格式,不用转表。",
  },
  {
    label: "Stored",
    value: "仅存当前会话",
    note: "报告最多留 3 份,关闭页签即消失;也可随时一键销毁。",
  },
  {
    label: "Accounted",
    value: "0 个账号",
    note: "无注册、无追踪、无画像;没有任何服务端存储。",
  },
];

export function PrivacyTable() {
  return (
    <ul className="border-t border-ink/15">
      {PRIVACY_ROWS.map((r, i) => (
        <Reveal key={r.label} as="li" className={i > 0 ? "border-t border-ink/15" : ""}>
          <div className="grid items-baseline gap-x-8 gap-y-1 py-5 sm:grid-cols-[10rem_1fr_auto]">
            <span className="tag text-[10px] text-sub">{r.label}</span>
            <span className="text-[19px] font-medium tracking-[-0.01em] text-ink">{r.value}</span>
            <span className="text-[13px] leading-relaxed text-sub sm:max-w-[34ch] sm:text-right">
              {r.note}
            </span>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

/* =============================================================
   03 判定语法:左 = 步骤(顺序信息),右 = 记号图例
   ============================================================= */
const STEPS = [
  { no: "01", title: "放进账单", desc: "拖入支付宝或微信的导出文件" },
  { no: "02", title: "识别周期", desc: "关键词 + 扣费节奏双核对,不漏一个周期" },
  { no: "03", title: "标出可疑", desc: "高置信直接标 CUT;存疑的留给你" },
  { no: "04", title: "划下决定", desc: "单划裁掉,整行浸色;反悔随时可改" },
];

export function GrammarSplit() {
  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
      {/* 步骤 */}
      <ol>
        {STEPS.map((st, i) => (
          <Reveal as="li" key={st.no} className={i > 0 ? "border-t border-ink/15" : ""}>
            <div className="flex items-baseline gap-6 py-[18px]">
              <span className="tag w-7 shrink-0 text-[11px] text-rust">{st.no}</span>
              <div>
                <p className="text-[16px] font-medium text-ink">{st.title}</p>
                <p className="mt-0.5 text-[13px] text-sub">{st.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>

      {/* 记号图例 */}
      <Reveal>
        <div className="border border-ink/20 p-6 sm:p-8">
          <p className="tag text-[10px] text-sub">判定记号 · Marks</p>
          <ul className="mt-4">
            <li className="flex items-start gap-5 border-b border-ink/10 py-4">
              <span aria-hidden className="relative mt-2 inline-block h-[3px] w-12 shrink-0">
                <i className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-rust" />
              </span>
              <div>
                <p className="text-[14px] font-medium text-ink">划痕</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-sub">
                  已决定裁掉。整行同时浸入极淡绿,决定留在纸面上。
                </p>
              </div>
            </li>
            <li className="flex items-start gap-5 py-4">
              <svg aria-hidden className="mt-2 w-12 shrink-0" height="20" viewBox="0 0 48 20" fill="none">
                <line x1="2" y1="4" x2="46" y2="16" stroke="var(--rust)" strokeWidth="1.5" />
                <line x1="2" y1="16" x2="46" y2="4" stroke="var(--rust)" strokeWidth="1.5" />
              </svg>
              <div>
                <p className="text-[14px] font-medium text-ink">交叉双线</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-sub">
                  疑似重复扣费——两条几乎同轨的扣费周期被叉出,复核后再定。
                </p>
              </div>
            </li>
          </ul>
          <p className="mt-4 border-t border-ink/10 pt-4 text-[12px] leading-relaxed text-sub">
            没有记号的行 = 保留。年省数字只来自被裁订阅的年度额,不做估算。
          </p>
        </div>
      </Reveal>
    </div>
  );
}
