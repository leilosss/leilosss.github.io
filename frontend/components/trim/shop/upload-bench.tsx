// =============================================================
// UploadBench —— 粘贴工作台(v12 · 3 步路径之"粘贴即识别")
// 核心隐喻:把账单"复制 → 粘贴"到裁剪工作台。粘贴为主路径:
//   idle:无边框无按钮,中央等宽小字「复制账单,粘贴到此处」+ 四角十字;
//   parsing:纸张浮现,文本逐行显影,红线从上往下扫描(无百分比);
//   done:抖动定格 → 0.6s 纸滑出 → 自动进报告(附手动「[ 进入裁剪 → ]」);
//   error:纸被批回(倾斜 + 红 X)+「无法识别,请检查账单文本」。
// 兜底(不主动引导):文件拖放仍可用(底部极淡小字);两条路都 100% 本地:
//   粘贴文本 → parsePastedText → detectLocal(浏览器内);
//   文件 → parseFileLocally → detectLocal —— 后端零调用(隐私硬约束)。
// 功能保留:重复粘贴覆盖、键盘入口、错误原因、规格三格、自动跳转、
// 「⚠ 所有识别仅在本地完成,账单数据不会上传」。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

import { parseFileLocally } from "@/lib/analyze";
import { detectLocal } from "@/lib/local-detect";
import { parsePastedText } from "@/lib/paste-parse";
import { reportsStore } from "@/lib/store";

type Phase = "idle" | "parsing" | "done" | "error";

/** 首次使用示例:Trim 会把账单识别成什么(与 demo 报告同源口径) */
const SAMPLE_ROWS = [
  { name: "Netflix", price: 49, cut: false },
  { name: "Spotify", price: 15, cut: false },
  { name: "Adobe Creative Cloud", price: 68, cut: true },
  { name: "iCloud 存储", price: 6, cut: false },
] as const;

export function UploadBench() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0); // 模拟识别进度(与扫描线同轨)
  const [pasteLines, setPasteLines] = React.useState<string[]>([]); // 粘贴原文(逐行显影用)
  const [found, setFound] = React.useState(0);
  const [cuttable, setCuttable] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [clipFailed, setClipFailed] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const paperRef = React.useRef<HTMLDivElement | null>(null);
  const scanRef = React.useRef<HTMLDivElement | null>(null);
  const linesRef = React.useRef<HTMLUListElement | null>(null);
  const stampRef = React.useRef<HTMLDivElement | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const reduce = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  /* ---------- GSAP 阶段动画(纸面浮现 / 扫描 / 定格滑出 / 批回) ---------- */
  const appearPaper = React.useCallback(() => {
    if (!paperRef.current) return;
    if (reduce) {
      gsap.set(paperRef.current, { opacity: 1, scale: 1 });
      return;
    }
    gsap.fromTo(paperRef.current, { opacity: 0, scale: 0.96, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power2.out" });
  }, [reduce]);

  const runScan = React.useCallback(() => {
    const scan = scanRef.current;
    const rows = linesRef.current?.children;
    if (!scan || !rows) return;
    gsap.killTweensOf(scan);
    gsap.killTweensOf(rows);
    gsap.set(scan, { yPercent: 0 });
    gsap.set(rows, { opacity: 0, y: 6 });
    if (reduce) {
      gsap.set(scan, { yPercent: 1000 });
      gsap.set(rows, { opacity: 1, y: 0 });
      return;
    }
    const tl = gsap.timeline();
    tl.to(scan, { yPercent: 1000, duration: 2.6, ease: "none" }, 0)
      .to(rows, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out", stagger: 0.16 }, 0.3)
      .to(paperRef.current, { rotation: 0.45, duration: 0.05, yoyo: true, repeat: 7, ease: "sine.inOut" }, 2.5);
  }, [reduce]);

  const slideOut = React.useCallback(() => {
    if (!paperRef.current) return;
    if (reduce) {
      gsap.set(paperRef.current, { xPercent: 120 });
      return;
    }
    gsap.to(paperRef.current, { xPercent: 120, rotate: 2, duration: 0.7, delay: 0.55, ease: "power3.in" });
  }, [reduce]);

  const rejectPaper = React.useCallback(() => {
    if (!paperRef.current || !stampRef.current) return;
    if (reduce) {
      gsap.set(paperRef.current, { rotation: -3.5, y: 16 });
      gsap.set(stampRef.current, { opacity: 1 });
      return;
    }
    gsap.to(paperRef.current, { rotation: -3.5, y: 16, duration: 0.55, ease: "back.in(2.2)" });
    gsap.fromTo(stampRef.current, { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.26, delay: 0.24, ease: "power3.out" });
  }, [reduce]);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  React.useEffect(() => stopTimer, []);

  /* ---------- 识别主流程(粘贴与文件共用) ---------- */
  const recognize = React.useCallback(
    async (build: () => Promise<{ rows: import("@/lib/types").BillRow[]; platform: "alipay" | "wechat" }>, lines: string[] | null) => {
      if (phase === "parsing") return;
      setPhase("parsing");
      setProgress(0);
      setErrorMsg("");
      setPasteLines(lines ?? []);
      stopTimer();
      appearPaper();
      timerRef.current = window.setInterval(() => {
        setProgress((p) => Math.min(p + 1.4, 82));
      }, 90);
      runScan();
      try {
        const { rows, platform } = await build();
        const report = detectLocal(rows, platform); // 全本地识别(隐私硬约束)
        const id = reportsStore.save(report);
        stopTimer();
        setProgress(100);
        setFound(report.summary.sub_count);
        setCuttable(report.subscriptions.length);
        setPhase("done");
        slideOutRef.current = id;
        window.setTimeout(() => router.push(`/report?d=${id}`), 1500);
      } catch (e) {
        stopTimer();
        setErrorMsg(e instanceof Error ? e.message : "无法识别,请检查账单文本");
        setPhase("error");
        rejectPaper();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, reduce, appearPaper, runScan, rejectPaper],
  );

  /* 手动「进入裁剪」需要报告 id */
  const slideOutRef = React.useRef<string | null>(null);
  const reportId = slideOutRef.current;

  const handlePaste = React.useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 8);
      await recognize(
        async () => {
          const res = parsePastedText(t); // 本地解析(抛错 → 失败态)
          return res;
        },
        lines,
      );
    },
    [recognize],
  );

  const handleFile = React.useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      await recognize(
        async () => parseFileLocally(file), // 本地解析(文件不出浏览器)
        [],
      );
    },
    [recognize],
  );

  /* window 级贴粘与拖放 */
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      handlePaste(e.clipboardData?.getData("text/plain") ?? "");
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      handleFile(e.dataTransfer?.files?.[0]);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePaste, handleFile]);

  const openFilePicker = () => {
    if (phase === "parsing") return;
    setPhase("idle");
    setErrorMsg("");
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  /* 移动端/权限兜底:点击读剪贴板 */
  const readClipboard = async () => {
    if (phase === "parsing") return;
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) handlePaste(t);
      else setClipFailed(true);
    } catch {
      setClipFailed(true);
    }
  };

  /* ---------- 渲染 ---------- */
  return (
    <div className="bench relative flex min-h-[calc(100svh-73px)] flex-col overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        disabled={phase === "parsing"}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* 四角极淡十字对齐标记 */}
      {(["left-4 top-4", "right-4 top-4", "bottom-4 left-4", "bottom-4 right-4"] as const).map((pos) => (
        <span key={pos} aria-hidden className={`absolute ${pos} z-[1] ${phase === "error" ? "text-rust/60" : "text-ink/20"}`}>
          <PlusMark />
        </span>
      ))}

      {/* ---------- 中央:待粘贴(双入口 + 示例)或 纸面(解析/完成/失败) ---------- */}
      <div className="mx-auto my-auto w-full max-w-[720px] px-5 py-10 sm:px-6">
        {phase === "idle" && (
          <div>
            {/* 标题 + 说明 */}
            <p className="mtag text-[10px] text-rust">STEP 2 / 3 · 粘贴账单</p>
            <h1 className="mt-4 text-[clamp(28px,6.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
              把账单粘贴到这里
            </h1>
            <p className="prose-body mt-4 max-w-[42ch]">
              在微信或支付宝的账单页全选复制,回到这里按 Ctrl + V。识别在本机完成。
            </p>

            {/* 粘贴感应纸面(明确的落点,不再是空白页) */}
            <div className="relative mt-8 border border-dashed border-ink/35 bg-paper/60 px-5 py-9 text-center sm:px-8 sm:py-12">
              <p className="mtag text-[11px] text-ink">按 Ctrl + V 粘贴账单文本</p>
              <p className="prose-sm mt-2 text-[13.5px]">或长按粘贴(手机) · 也可直接拖入账单文件</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
                <button onClick={readClipboard} className="stamp-cta">
                  <span className="stamp-cta-inner !py-[9px] !text-[13.5px]">PASTE BILL</span>
                </button>
                <Link
                  href="/report?d=demo"
                  className="mtag border border-ink/35 px-4 py-3 text-[11px] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                >
                  TRY DEMO — 用示例数据体验
                </Link>
              </div>
              {clipFailed && (
                <p className="prose-sm mt-4 text-[13px] text-rust">
                  浏览器未授权读取剪贴板 —— 请直接按 Ctrl + V,或长按粘贴。
                </p>
              )}
            </div>

            {/* 示例:Trim 会识别成什么(消除首次使用的未知) */}
            <div className="mt-9">
              <p className="rule-label mtag text-[9.5px] text-sub">
                <span>TRIM 会这样识别</span>
                <span className="text-ink/40">示例</span>
              </p>
              <ul className="mt-1">
                {SAMPLE_ROWS.map((r) => (
                  <li key={r.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink/10 py-2.5">
                    <span className="truncate text-[15px] font-semibold text-ink">{r.name}</span>
                    <span className="num text-[14px] text-ink">
                      ¥{r.price}
                      <span className="text-sub/70">/月</span>
                    </span>
                    <span className={`mtag w-[40px] text-right text-[9px] ${r.cut ? "text-rust" : "text-ink/45"}`}>
                      {r.cut ? "CUT" : "KEEP"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="prose-sm mt-3 text-[13px]">
                示例数据,非真实账单。判定可随时改 —— 你说了算。
              </p>
            </div>

            {/* 隐私三条 */}
            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/15 pt-5">
              {["无需注册", "不连银行卡", "本地分析", "数据留在这台设备"].map((p) => (
                <li key={p} className="mtag flex items-center gap-1.5 text-[9.5px] text-sub">
                  <svg width="10" height="8" viewBox="0 0 13 11" aria-hidden fill="none" className="text-rust">
                    <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase !== "idle" && (
          <div ref={paperRef}>
            <div className="relative border border-ink/25 bg-paper">
              {/* 文本显影层(粘贴原文前 8 行;文件路径显示空行占位) */}
              <ul ref={linesRef} className="px-6 py-5 sm:px-8">
                {(pasteLines.length ? pasteLines : Array(5).fill("")).map((l, i) => (
                  <li key={i} aria-hidden className="flex items-center gap-3 border-b border-ink/8 py-[7px] text-[12px] text-ink/70">
                    <span className="mtag w-7 shrink-0 text-[8.5px] text-sub/50">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate">{l || "· · · · · · · · · · · ·"}</span>
                  </li>
                ))}
              </ul>

              {/* 红色裁剪扫描线 */}
              <div ref={scanRef} aria-hidden className="scanline" />

              {/* X 批注层 */}
              <div ref={stampRef} aria-hidden className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center opacity-0">
                <RejectX />
              </div>
            </div>

            {/* 纸下状态字幕 */}
            <div className="mt-5 flex min-h-[70px] flex-col items-center gap-2 text-center">
              {phase === "parsing" && (
                <p className="mtag mtag-lg num text-[11px] text-rust">
                  正在识别 … 第 {Math.round(progress)} 项 / 共 — 项
                </p>
              )}
              {phase === "done" && reportId && (
                <>
                  <p className="mtag text-[11px] text-ink">
                    识别完成 · 发现 {found} 个订阅,{cuttable} 个可裁剪
                  </p>
                  <Link
                    href={`/report?d=${reportId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mtag mtag-lg text-[12px] text-rust underline decoration-rust/40 decoration-1 underline-offset-4 transition-colors hover:bg-rust hover:text-paper hover:decoration-transparent"
                  >
                    [ 进入裁剪 → ]
                  </Link>
                </>
              )}
              {phase === "error" && (
                <>
                  <p className="mtag text-[11px] text-rust">无法识别,请检查账单文本</p>
                  <p className="max-w-[46ch] text-[12px] leading-relaxed text-sub">{errorMsg}</p>
                  <p className="mtag flex gap-8 text-[11px]">
                    <button
                      onClick={() => {
                        setPhase("idle");
                        setErrorMsg("");
                      }}
                      className="text-ink underline decoration-ink/40 decoration-1 underline-offset-4 transition-colors hover:text-rust hover:decoration-rust"
                    >
                      重新粘贴
                    </button>
                    <Link
                      href="/guide"
                      className="text-ink underline decoration-ink/40 decoration-1 underline-offset-4 transition-colors hover:text-rust hover:decoration-rust"
                    >
                      查看支持格式
                    </Link>
                  </p>
                </>
              )}
            </div>

            {/* 规格三格 */}
            <div className="mt-6 flex items-center justify-center gap-x-10">
              {[
                { label: "方式", v: "粘贴 · 拖放" },
                { label: "解析", v: "仅本地" },
                { label: "暂存", v: "本地 7 天" },
              ].map((c, i) => (
                <React.Fragment key={c.label}>
                  {i > 0 && <span aria-hidden className="h-3 w-px bg-ink/25" />}
                  <span className="mtag flex items-baseline gap-2 text-[10px]">
                    <span className="text-sub/70">{c.label}</span>
                    <span className="text-ink">{c.v}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部红线声明 */}
      <p className="mtag mb-8 mt-auto text-center text-[9.5px] text-rust">
        ⚠ 所有识别仅在本地完成,账单数据不会上传
      </p>
    </div>
  );
}

function PlusMark() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden fill="none">
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function RejectX() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden fill="none" className="text-rust">
      <path d="M10 10 L62 62 M62 10 L10 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
    </svg>
  );
}
