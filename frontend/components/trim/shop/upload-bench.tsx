// =============================================================
// UploadBench —— 导入工作台(v2.1 · 极简三入口,UPLOAD BILL 为主路径)
// 核心隐喻:把账单"上传/拖入 → 自动分析"到裁剪工作台。三个平权入口:
//   UPLOAD BILL(主)—— 点击/拖拽上传 CSV·XLSX·TXT,无需选择平台,自动识别;
//   TRY DEMO —— 直接进入完整示例报告(¥3,936/年,可省 ¥1,836/年);
//   PASTE BILL(备用)—— 读取剪贴板文本,或全局 Ctrl+V 粘贴。
// 状态机不变:
//   idle:上传区 + 两个次级入口;
//   parsing:纸张浮现,文本逐行显影,红线从上往下扫描(无百分比);
//   done:抖动定格 → 0.6s 纸滑出 → 自动进报告(附手动「[ 进入裁剪 → ]」);
//   error:纸被批回(倾斜 + 红 X)+「无法识别,请检查账单文本」。
// 三条路径全部 100% 本地(隐私硬约束,后端零调用):
//   文件(csv/xlsx)→ parseFileLocally;文件(txt/docx)/粘贴文本 → parsePastedText;
//   → detectLocal(浏览器内识别)。不接非官方 API,不模拟登录,不要求账号密码。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

import { parseFileLocally } from "@/lib/analyze";
import { detectPlatform } from "@/lib/bill-common";
import { docxToText } from "@/lib/docx-parse";
import { detectLocal } from "@/lib/local-detect";
import { ocrLinesToBillRows } from "@/lib/ocr-parse";
import { recognizeImage, type OcrProgress } from "@/lib/ocr-local";
import { parsePastedText } from "@/lib/paste-parse";
import { reportsStore } from "@/lib/store";
import { MAX_FILE_SIZE } from "@/lib/validation";

type Phase = "idle" | "parsing" | "done" | "error";

/** 可上传的账单文件(截图走本地 OCR,其余走解析器) */
const FILE_ACCEPT = ".csv,.xlsx,.xls,.txt,.docx,.doc,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

/** 截图路径提示(用户要在账单页自己截长图,这里把路径写全) */
const SHOT_HINTS = [
  { app: "支付宝", path: "我的 → 账单 → 选择月份 → 截长图" },
  { app: "微信", path: "我 → 服务 → 钱包 → 账单 → 截长图" },
] as const;

function isImage(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_RE.test(file.name);
}

export function UploadBench() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0); // 模拟识别进度(与扫描线同轨)
  const [pasteLines, setPasteLines] = React.useState<string[]>([]); // 粘贴原文(逐行显影用)
  const [found, setFound] = React.useState(0);
  const [cuttable, setCuttable] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [clipFailed, setClipFailed] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false); // 全局拖拽悬停(高亮上传区)
  const [ocrNote, setOcrNote] = React.useState(""); // OCR 阶段字幕(模型下载 / 第 n 段)
  const [shotHint, setShotHint] = React.useState(false); // OCR 失败时展开截图指引

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

  /* ---------- 识别主流程(粘贴 / 文件 / 截图 共用) ---------- */
  const recognize = React.useCallback(
    async (
      build: () => Promise<{ rows: import("@/lib/types").BillRow[]; platform: "alipay" | "wechat" }>,
      lines: string[] | null,
      isOcr = false,
    ) => {
      if (phase === "parsing") return;
      setPhase("parsing");
      setProgress(0);
      setErrorMsg("");
      setPasteLines(lines ?? []);
      setOcrNote("");
      setShotHint(false);
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
        setShotHint(isOcr); // 截图路径失败时,额外给出"分段截图/改用粘贴"的出路
        setPhase("error");
        rejectPaper();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, reduce, appearPaper, runScan, rejectPaper],
  );

  /* ---------- 截图:本地 OCR → 交易数组(逐张识别后合并) ---------- */
  const runOcr = React.useCallback(
    async (files: File[]) => {
      await recognize(
        async () => {
          const allRows: import("@/lib/types").BillRow[] = [];
          let platform: "alipay" | "wechat" = "alipay";
          let readLines: string[] = [];
          for (let i = 0; i < files.length; i++) {
            const prefix = files.length > 1 ? `第 ${i + 1} / ${files.length} 张 · ` : "";
            const lines = await recognizeImage(files[i], (p: OcrProgress) => {
              setOcrNote(
                p.phase === "loading"
                  ? `${prefix}正在加载识别模型…(首次约 11MB,仅一次)`
                  : `${prefix}正在识别第 ${p.tile?.index ?? 1} / ${p.tile?.total ?? 1} 段…`,
              );
            });
            setOcrNote(`${prefix}正在读取账目…`);
            const parsed = ocrLinesToBillRows(lines);
            platform = parsed.platform;
            allRows.push(...parsed.rows);
            // 首张的识别文本显示在纸面上(让用户看到"读到了什么")
            if (i === 0) readLines = lines;
          }
          setPasteLines(readLines.slice(0, 8));
          if (!allRows.length) throw new Error("没能从截图里读出账目");
          return { rows: allRows, platform };
        },
        null,
        true,
      );
    },
    [recognize],
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

  /** 多选/拖拽统一入口:全是图片走 OCR,否则按账单文件解析(取第一个非图片文件) */
  const handleFiles = React.useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      if (files.every(isImage)) return runOcr(files);
      const file = files.find((f) => !isImage(f)) ?? files[0];
      await recognize(async () => {
        // .txt 导出本质是自由文本(与粘贴同形),复用粘贴的启发式解析器更稳
        if (/\.txt$/i.test(file.name)) {
          if (file.size > MAX_FILE_SIZE) throw new Error("文件超过 10MB 上限,请导出更小时间范围的账单");
          return parsePastedText(await file.text());
        }
        // .docx 同理:解开 Word 取出表格文本后,仍走粘贴那条解析链(不另起一套识别)
        // 旧版 .doc 也进这里 —— docxToText 会认出 OLE 头并给出"另存为 .docx"的明确出路
        if (/\.docx?$/i.test(file.name)) {
          if (file.size > MAX_FILE_SIZE) throw new Error("文件超过 10MB 上限,请导出更小时间范围的账单");
          const text = docxToText(await file.arrayBuffer());
          const res = parsePastedText(text);
          // 文件名与文档标题里的"微信支付/支付宝"比正文更可信(报告页取消路径要用)
          const hinted = detectPlatform(file.name, text);
          return hinted === "unknown" ? res : { ...res, platform: hinted };
        }
        return parseFileLocally(file); // 本地解析(文件不出浏览器,自动识别平台)
      }, []);
    },
    [recognize, runOcr],
  );

  /* window 级贴粘与拖放(拖入文件全页可放;dragActive 驱动上传区高亮) */
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      handlePaste(e.clipboardData?.getData("text/plain") ?? "");
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) setDragActive(true);
    };
    const onLeave = (e: DragEvent) => {
      // 仅在真正离开窗口(而非进入子元素)时取消高亮
      if (!e.relatedTarget) setDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePaste, handleFiles]);

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
        accept={FILE_ACCEPT}
        multiple
        className="sr-only"
        disabled={phase === "parsing"}
        onChange={(e) => {
          handleFiles(Array.from(e.target.files ?? []));
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
            <p className="mtag text-[10px] text-rust">STEP 2 / 3 · 导入账单</p>
            <h1 className="mt-4 text-[clamp(28px,6.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
              把账单交给 Trim
            </h1>
            <p className="prose-body mt-4 max-w-[42ch]">
              上传账单文件,或直接丢一张账单截图 —— 自动识别订阅,不用选平台,不用整理数据。
            </p>

            {/* 主入口:上传账单文件(点击或拖拽) */}
            <button
              type="button"
              onClick={openFilePicker}
              className={`mt-8 flex w-full flex-col items-center gap-3 border border-dashed px-5 py-10 text-center transition-colors sm:px-8 sm:py-14 ${
                dragActive ? "border-rust bg-rust/[0.05]" : "border-ink/35 bg-paper/60 hover:border-ink/60"
              }`}
            >
              <UploadMark />
              <span className="mtag text-[11px] text-ink">点击选择文件,或拖拽到此处</span>
              <span className="prose-sm text-[13px]">
                CSV · XLSX · TXT · DOCX
                <span className="mx-1.5 text-ink/30">|</span>
                <span className="text-rust">截图 PNG / JPG / WEBP(可多选)</span>
                <span className="mt-1 block text-[12.5px] text-sub/80">单张最大 10MB · 旧版 .doc 请先另存为 .docx</span>
              </span>
              <span aria-hidden className="stamp-cta pointer-events-none mt-3">
                <span className="stamp-cta-inner !px-8 !py-4 !text-[16px]">UPLOAD BILL</span>
              </span>
            </button>

            {/* 截图路径:先在账单页截长图,再回来上传(识别全在本机) */}
            <div className="mt-5 border border-ink/20 bg-paperDeep/60 px-5 py-4">
              <p className="mtag text-[9.5px] text-sub">截图识别 · 先在账单页截一张长图</p>
              <ul className="mt-3 space-y-2">
                {SHOT_HINTS.map((h) => (
                  <li key={h.app} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="mtag shrink-0 text-[9.5px] text-ink">{h.app}</span>
                    <span className="text-[13.5px] leading-relaxed text-sub">{h.path}</span>
                  </li>
                ))}
              </ul>
              <p className="mtag mt-3 border-t border-ink/12 pt-2.5 text-[9px] text-rust">
                ⚠ 截图在本机识别,图片不会上传
              </p>
            </div>

            {/* 次级入口:示例数据 / 粘贴文本(备用) */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report?d=demo"
                className="mtag flex-1 border border-ink/35 px-4 py-3.5 text-center text-[11px] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                TRY DEMO
              </Link>
              <button
                type="button"
                onClick={readClipboard}
                className="mtag flex-1 border border-ink/35 px-4 py-3.5 text-center text-[11px] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                PASTE BILL
              </button>
            </div>
            {clipFailed && (
              <p className="prose-sm mt-3 text-[13px] text-rust">
                浏览器未授权读取剪贴板 —— 请直接按 Ctrl + V,或长按粘贴。
              </p>
            )}

            {/* 微信/支付宝说明(仅导出/截图后上传,不接官方 API、不模拟登录、不要求账号密码) */}
            <p className="prose-sm mt-6 text-[13.5px]">
              从微信或支付宝导出账单文件、或直接在账单页截长图,都能上传识别。Trim 不连接官方接口、不模拟登录,也不会要求账号密码。
            </p>

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
                <p className="mtag mtag-lg text-[11px] text-rust">
                  {ocrNote || (
                    <span className="num">
                      正在识别 … 第 {Math.round(progress)} 项 / 共 — 项
                    </span>
                  )}
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
                  <p className="mtag text-[11px] text-rust">
                    {shotHint ? "这张截图没能读出账目" : "无法识别,请检查账单文本"}
                  </p>
                  <p className="max-w-[46ch] text-[12px] leading-relaxed text-sub">{errorMsg}</p>

                  {/* 截图路径失败时的两条出路(照旧保留粘贴这条路) */}
                  {shotHint && (
                    <ul className="mt-1 max-w-[46ch] space-y-1.5 text-left">
                      {["请尝试分段截图:把长账单截成 2–3 张,一起选中上传", "或改用「复制文本粘贴」:在账单页全选复制后直接 Ctrl+V"].map((t) => (
                        <li key={t} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink">
                          <span aria-hidden className="mtag shrink-0 text-[9px] text-rust">→</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mtag flex flex-wrap justify-center gap-8 text-[11px]">
                    <button
                      onClick={() => {
                        setPhase("idle");
                        setErrorMsg("");
                        setShotHint(false);
                      }}
                      className="text-ink underline decoration-ink/40 decoration-1 underline-offset-4 transition-colors hover:text-rust hover:decoration-rust"
                    >
                      重新尝试
                    </button>
                    <Link
                      href="/guide"
                      className="text-ink underline decoration-ink/40 decoration-1 underline-offset-4 transition-colors hover:text-rust hover:decoration-rust"
                    >
                      {shotHint ? "查看截图指引" : "查看支持格式"}
                    </Link>
                  </p>
                </>
              )}
            </div>

            {/* 规格三格 */}
            <div className="mt-6 flex items-center justify-center gap-x-10">
              {[
                { label: "方式", v: "截图 · 粘贴 · 拖放" },
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

/** 上传主入口图标:箭头入盘(细线,与全站图标同一手绘线条语言) */
function UploadMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden fill="none" className="text-ink/70">
      <path d="M14 18V4M14 4L8 10M14 4l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
