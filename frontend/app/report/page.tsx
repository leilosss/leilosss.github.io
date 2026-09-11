// =============================================================
// REPORT /report/[id] —— 裁剪结果(v2.0 · 产品最重要的页面)
// 结构:价值头条(能省多少)→ 账单清单(CUT / KEEP 分区 + 理由 + CANCEL)
//      → 操作章(COPY LIST / RECEIPT / DESTROY)→ Concierge 与 Pro 出口。
// 数据/裁决/持久化沿用 v12(localStorage 加密 vault 7 天);智能初裁默认全 CUT。
// 隐私:识别全在本机;取消指引 = 复制文字步骤(不代操作、不碰账号)。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { WatchBoard } from "@/components/trim/pro/watch-board";
import { ReportHeadline } from "@/components/trim/shop/report-headline";
import { ReportLedger } from "@/components/trim/shop/report-ledger";
import { downloadReceipt } from "@/lib/receipt";
import { spendSplit, subAnnual, yuan, type Cycle } from "@/lib/report-math";
import { ensureReady, decisionStore, reportsStore } from "@/lib/store";
import { watchStore } from "@/lib/watch-store";
import { demoInitialCut, sampleReport } from "@/lib/sample-report";
import type { DetectResult, Subscription } from "@/lib/types";

function fmtDate(iso?: string): string {
  return (iso ?? "").slice(0, 10).replace(/-/g, ".");
}

/** 平台取消路径(仅文字指引 —— Trim 不代操作、不接触账号) */
const CANCEL_GUIDES = {
  alipay: "支付宝 → 我的 → 设置 → 支付设置 → 免密支付/自动扣款 → 找到该商户 → 关闭服务",
  wechat: "微信 → 我 → 服务 → 钱包 → 支付设置 → 自动续费(免密支付)→ 找到该商户 → 关闭扣费",
} as const;

function ReportImpl() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("d") ?? "demo"; // 静态导出:报报告 id 走 query(v2.0 静态化)
  const isDemo = id === "demo";

  const [ready, setReady] = React.useState(false);
  const [report, setReport] = React.useState<DetectResult | null>(null);
  const [decisions, setDecisions] = React.useState<Record<string, "cut" | "keep">>({});
  const [cycle, setCycle] = React.useState<Cycle>("yearly");
  const [notice, setNotice] = React.useState("");
  const [confirmDestroy, setConfirmDestroy] = React.useState(false);
  const [cancelFor, setCancelFor] = React.useState<Subscription | null>(null);
  const noticeTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!ready) {
      setReady(true);
      return;
    }
    (async () => {
      await ensureReady(); // 解锁本地加密暂存(7 天)
      const rep = isDemo ? sampleReport() : reportsStore.get(id);
      if (!rep) return;
      setReport(rep);
      const persisted = isDemo ? {} : decisionStore.getMap(id);
      const demoInit = isDemo ? demoInitialCut(rep.subscriptions) : {};
      const init: Record<string, "cut" | "keep"> = {};
      for (const s of rep.subscriptions) {
        // 智能初裁:真实报告默认全部 CUT(用户做减法);DEMO 用示例判定
        init[String(s.id)] = persisted[String(s.id)] ?? (isDemo ? demoInit[String(s.id)] : "cut");
      }
      setDecisions(init);
    })();
  }, [ready, id, isDemo]);

  React.useEffect(() => () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
  }, []);

  const flash = React.useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3200);
  }, []);

  const handleDecide = React.useCallback(
    (subId: number, d: "cut" | "keep") => {
      setDecisions((prev) => {
        const next = { ...prev, [String(subId)]: d };
        if (!isDemo) decisionStore.set(id, subId, d);
        return next;
      });
    },
    [id, isDemo],
  );

  /* ---------- 空状态:没有这份报告 ---------- */
  if (!ready || !report) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-24 sm:px-8">
        <p className="mtag text-[10px] text-sub">EMPTY · 没有报告</p>
        <h1 className="mt-4 text-[clamp(28px,6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
          这里还没有账单
        </h1>
        <p className="prose-body mt-5">
          报告可能已销毁,或本机没有这份记录。导入一次账单就能重新生成 —— 或先看示例。
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/upload" className="stamp-cta self-start">
            <span className="stamp-cta-inner">IMPORT BILL</span>
          </Link>
          <Link href="/report?d=demo" className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust">
            看示例报告 →
          </Link>
        </div>
      </div>
    );
  }

  const subs = report.subscriptions;

  /* 防 ¥0 头条:识别到 0 个订阅时不渲染空数字,引导换一份账单或看示例 */
  if (subs.length === 0) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-24 sm:px-8">
        <p className="mtag text-[10px] text-sub">NO MATCH · 没有发现订阅</p>
        <h1 className="mt-4 text-[clamp(28px,6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
          这份账单里没有周期性订阅
        </h1>
        <p className="prose-body mt-5">
          可能是单笔消费居多,或时间范围太短。换一份时间更长的账单试试;或者先看看示例报告长什么样。
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/upload" className="stamp-cta self-start">
            <span className="stamp-cta-inner">IMPORT BILL</span>
          </Link>
          <Link
            href="/report?d=demo"
            className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust"
          >
            看示例报告 →
          </Link>
        </div>
      </div>
    );
  }

  // 同源口径:清单 / 复制文本 / 取消指引 / 小票 全部走 report-math
  const { cutList, cut: cutAnnual } = spendSplit(subs, decisions);
  const platform = report.platform === "wechat" ? "wechat" : "alipay";

  /* ---------- 操作 ---------- */
  const handleCopyList = async () => {
    const lines = [
      `TRIM · 取消清单 · ${fmtDate(report.generated_at)}`,
      `合计可省 ${yuan(cutAnnual)} / YEAR`,
      "",
      ...cutList.map((s) => `[CUT] ${s.name} · ${yuan(s.amount)}/${s.period === "monthly" ? "月" : "期"} · 年省 ${yuan(subAnnual(s))}`),
      "",
      `取消路径:${CANCEL_GUIDES[platform]}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash(`已复制 ${cutList.length} 项取消清单 —— 照着清单逐个关闭即可`);
    } catch {
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trim-cut-list-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      flash("剪贴板不可用,已下载清单文件");
    }
  };

  const handleReceipt = () => {
    downloadReceipt(report, decisions);
    flash("裁剪小票已生成(PNG 图片,本机绘制)");
  };

  const handleDestroy = () => {
    if (!isDemo) {
      reportsStore.clearAll();
      decisionStore.remove(id);
      void watchStore.clear(); // 价格监控记录一并清空(它也是本机数据)
    }
    router.replace("/");
  };

  return (
    <div className="bench pb-16">
      <ReportHeadline
        subs={subs}
        decisions={decisions}
        isDemo={isDemo}
        generatedAt={fmtDate(report.generated_at)}
        cycle={cycle}
        onCycle={setCycle}
      />

      {/* 价格监控:只在**真的**比出变化时出现(有记录但没变化 = 不出现,不占地方) */}
      {!isDemo && <WatchBoard variant="compact" />}

      <div className="mt-10">
        <ReportLedger subs={subs} decisions={decisions} onDecide={handleDecide} onCancel={setCancelFor} />
      </div>

      {/* ---------- 取消指引(点 CANCEL 后展开;不代操作、不碰账号) ---------- */}
      {cancelFor && (
        <div className="mx-5 mt-8 border border-rust bg-rust/[0.04] px-5 py-6 sm:mx-8 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="mtag text-[10px] text-rust">CANCEL · 取消指引</p>
            <button onClick={() => setCancelFor(null)} className="mtag text-[9.5px] text-sub transition-colors hover:text-ink">
              关闭 ✕
            </button>
          </div>
          <h3 className="mt-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">{cancelFor.name}</h3>
          <p className="prose-body mt-3">{CANCEL_GUIDES[platform]}</p>
          <p className="prose-sm mt-3 text-[13.5px]">
            取消后每年少付 <span className="num font-semibold text-rust">{yuan(subAnnual(cancelFor))}</span>。
            Trim 不会代你操作,也不接触你的账号 —— 步骤由你自己完成。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`【${cancelFor.name}】取消步骤\n${CANCEL_GUIDES[platform]}\n—— 由 Trim 本地生成`);
                  flash(`已复制「${cancelFor.name}」的取消步骤`);
                } catch {
                  flash("复制失败 —— 请按上面步骤手动操作");
                }
              }}
              className="mtag border border-rust px-3.5 py-2 text-[10px] text-rust transition-colors hover:bg-rust hover:text-paper"
            >
              复制步骤
            </button>
            <Link href="/pricing#concierge" className="mtag text-[10px] text-sub underline decoration-ink/30 decoration-1 underline-offset-4 transition-colors hover:text-rust">
              不想自己弄?看看代办服务(付费)
            </Link>
          </div>
        </div>
      )}

      {/* ---------- 操作章 ---------- */}
      <div className="mt-10 px-5 sm:px-8">
        <div className="rule-label mtag text-[9.5px] text-sub">
          <span>ACTIONS · 下一步</span>
          {notice && <span className="normal-case tracking-normal text-rust" role="status">{notice}</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          <StampButton label="COPY LIST" sub={`复制 ${cutList.length} 项取消清单`} onClick={handleCopyList} />
          <StampButton label="RECEIPT" sub="生成裁剪小票" onClick={handleReceipt} />
          <StampButton label="DESTROY" sub="销毁本机数据" onClick={() => setConfirmDestroy(true)} />
        </div>

        {confirmDestroy && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border border-rust bg-rust/[0.05] px-5 py-4">
            <p className="prose-sm text-[13.5px] text-rust">
              确认销毁?本机全部报告、裁剪决定与价格监控记录将立即清除,不可恢复(价格历史清掉后,涨跌对比要从头攒起)。
            </p>
            <p className="mtag flex gap-6 text-[10px]">
              <button onClick={handleDestroy} className="bg-rust px-3.5 py-2 text-paper transition-colors hover:bg-ink">
                确认销毁
              </button>
              <button onClick={() => setConfirmDestroy(false)} className="border border-rust/50 px-3.5 py-2 text-rust transition-colors hover:bg-rust hover:text-paper">
                取消
              </button>
            </p>
          </div>
        )}

        {/* 后续价值出口(先看到价值,再谈商业) */}
        <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
          <Link href="/pricing" className="group bg-paper px-5 py-6 transition-colors hover:bg-paperDeep">
            <p className="mtag text-[9.5px] text-rust">TRIM PRO · 价格监控</p>
            <p className="mt-2.5 text-[17px] font-bold tracking-[-0.02em] text-ink">
              下次涨价时,让它先告诉你
            </p>
            <p className="prose-sm mt-1.5 text-[13.5px]">
              已经记下这份账单的单价。再导入一次,涨价、降价、套餐变化会自己浮出来 ——
              内测期间免费。
            </p>
          </Link>
          <Link href="/annual" className="group bg-paper px-5 py-6 transition-colors hover:bg-paperDeep">
            <p className="mtag text-[9.5px] text-sub">ANNUAL TRIM</p>
            <p className="mt-2.5 text-[17px] font-bold tracking-[-0.02em] text-ink">
              一年后再体检一次
            </p>
            <p className="prose-sm mt-1.5 text-[13.5px]">
              年度总支出 · 新增订阅 · 已取消 · 涨价记录
            </p>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-ink/15 pt-5">
          <p className="mtag flex flex-wrap items-center gap-x-5 gap-y-2 text-[9.5px]">
            <button onClick={() => window.print()} className="text-ink underline decoration-ink/35 decoration-1 underline-offset-4 transition-colors hover:text-rust">
              打印报告
            </button>
            <Link href="/upload" className="text-sub transition-colors hover:text-ink">重新导入账单</Link>
            <Link href="/" className="text-sub transition-colors hover:text-ink">返回首页</Link>
          </p>
          <p className="mtag text-[9px] text-sub/80">本机暂存 7 天 · 可随时销毁</p>
        </div>
      </div>
    </div>
  );
}

/** 方章按钮(双线红框 + 按下微旋) */
export default function ReportPage() {
  return (
    <React.Suspense fallback={null}>
      <ReportImpl />
    </React.Suspense>
  );
}

function StampButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={sub}
      className="group border-2 border-rust/70 p-[3px] text-rust transition-colors hover:border-rust active:rotate-[-1.5deg]"
    >
      <span className="flex flex-col items-start border border-rust/40 px-3.5 py-2.5 transition-colors group-hover:bg-rust group-hover:text-paper">
        <span className="mtag text-[10px]">{label}</span>
        <span className="mt-1 text-[11.5px] font-medium normal-case tracking-normal opacity-80">{sub}</span>
      </span>
    </button>
  );
}
