// =============================================================
// ReportBench —— 报告分拣台(v11 车间版 · 对标 12 Brews 物理拖拽分拣)
// 核心隐喻:工作台上的纸条分拣裁剪 —— 无表格,条目 = 错落平铺的纸条,
// 三种操作并存:横快划 = 裁 / 拖进两侧托 = 分拣(Draggable+Inertia 吸附)/
// 点末端剪刀 = 切换。CUT 纸条 = 浅红底 #F5E6E4 + 红划痕,归入左托堆叠;
// 堆叠高度实时可视(每张 13px 纸棱),两侧标注年省/保留金额(口径 = 全量)。
// 功能保留:筛选/排序/搜索、decisions 持久化、导出(盖章)、销毁(盖章 + 页内
// 红框确认)、打印、demo 标注、统计与裁剪前后对比(以堆叠呈现)。
// 移动端(<1024):纸条纵列流式,点击标记切换(禁拖拽,滚动可用)。
// =============================================================
"use client";

import * as React from "react";
import { gsap } from "gsap";

import type { Subscription } from "@/lib/types";
import { fmtCNY } from "@/lib/utils";

/* ---------- 轻量纸条拖拽(原生 pointer 事件 + gsap 动画) ---------- */

interface PointerDragHandlers {
  onPress?: () => void;
  /** dx = 当前横向总位移(用于划线预览) */
  onPreview?: (dx: number) => void;
  /** 释放:dx 位移 / dt 毫秒 / zoneX 相对台面左缘 / zoneW 台面宽 */
  onRelease: (info: { dx: number; dy: number; dt: number; zoneX: number; zoneW: number }) => void;
}

/** 绑定一张纸条的拖拽 + 快划(pointer 事件按需挂 window);返回解绑函数。剪刀按钮区域不启动拖动。 */
function attachPointerDrag(el: HTMLElement, h: PointerDragHandlers): () => void {
  const bench = el.closest("[data-bench]") as HTMLElement | null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return; // 剪刀 = 点击切换,不拖动
    const startX = e.clientX;
    const startY = e.clientY;
    const t0 = performance.now();
    // 当前布局位(gsap 记录的 x/y/rotation)
    const bx = gsap.getProperty(el, "x") as number;
    const by = gsap.getProperty(el, "y") as number;
    const br = gsap.getProperty(el, "rotation") as number;
    let moved = false;
    let prevX = startX;
    let prevT = t0;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        try {
          el.setPointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
        h.onPress?.();
      }
      gsap.set(el, { x: bx + dx, y: by + dy, rotation: br });
      h.onPreview?.(dx);
      prevX = ev.clientX;
      prevT = performance.now();
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!moved) return; // 视为点击
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dt = performance.now() - t0;
      // 末速(px/ms)→ 惯性续行(≤110px;不再堆物理运算,足够"纸片滑一下")
      const span = Math.max(8, performance.now() - prevT);
      const vx = (ev.clientX - prevX) / span;
      const slide = Math.max(-110, Math.min(110, vx * 120));
      const zone = bench?.getBoundingClientRect();
      h.onRelease({
        dx: dx + slide * 0.35,
        dy,
        dt: Math.min(dt, 900), // 惯性不计入划动时长
        zoneX: ev.clientX - (zone?.left ?? 0) + slide * 0.35,
        zoneW: zone?.width ?? 1200,
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  el.addEventListener("pointerdown", onDown);
  return () => el.removeEventListener("pointerdown", onDown);
}

/* ---------- 位置系统:平铺散放 / 托盘堆叠(纯函数,初次布局与吸附共用) ---------- */

/** 平铺散放点(2 列网格 + 每张抖动;纸条 260px,中央区宽 = 56% 台面,2 列不互叠) */
function scatter(i: number, n: number): { x: number; y: number; r: number } {
  const cols = 2;
  const rows = Math.max(1, Math.ceil(n / cols));
  const rowPitch = Math.min(26, 60 / rows); // 纸条多时行距渐密
  const col = i % cols;
  const row = Math.floor(i / cols);
  const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  const jx = (s - Math.floor(s)) * 6 - 3; // ±3% 抖动
  const jy = ((s * 1.3) - Math.floor(s * 1.3)) * 6 - 3;
  const r = ((s * 2.1) - Math.floor(s * 2.1)) * 9 - 4.5; // ±4.5°
  return {
    x: 26 + col * 26 + jx,
    y: 8 + row * rowPitch + jy,
    r,
  };
}

/** 托盘堆叠:自底向上每张 13px 纸棱 */
const STACK_STEP = 13;

type BenchProps = {
  subs: Subscription[]; // 当前展示(已筛选)
  all: Subscription[]; // 全量(口径)
  decisions: Record<string, "cut" | "keep">;
  onDecide: (id: number, d: "cut" | "keep") => void;
  header: React.ReactNode;
  meta: React.ReactNode;
  footer: React.ReactNode;
  onExport: () => void;
  onReceipt: () => void;
  onCancel: (sub: { name: string }) => void;
  onDestroy: () => void;
  isDesktop: boolean;
};

function SlipInner({ sub, cut, onToggle, onCancel }: { sub: Subscription; cut: boolean; onToggle: () => void; onCancel: (sub: { name: string }) => void }) {
  return (
    <div
      className={`relative flex cursor-grab items-center gap-3 border bg-paper px-4 py-3 transition-colors duration-300 active:cursor-grabbing ${
        cut ? "border-rust/45 bg-[#F5E6E4]" : "border-ink/30"
      }`}
      style={{
        boxShadow: "0 1px 0 rgba(26,26,26,.14)",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23p)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    >
      {/* 底层纸(厚度:衬在下面的另一张纸,错位 3px —— 纸棱而非阴影) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 border transition-colors duration-300 ${
          cut ? "border-rust/20" : "border-ink/10"
        }`}
        style={{ transform: "translate(3px,4px)" }}
      />
      {/* 手写红划(CUT 态:弯曲线,像红笔划过 —— spec: 浅红底 + 红斜线) */}
      {cut && (
        <svg
          aria-hidden
          className="pointer-events-none absolute left-2 right-2 top-1/2 z-[4] h-[10px] w-[calc(100%-16px)] -translate-y-1/2 text-rust"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M1,6 Q22,2.5 45,5.5 T99,4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.92" />
        </svg>
      )}
      {/* 划动预览红线(GSAP 控制 scaleX/opacity;决定后由上手写划接管) */}
      <i
        data-cutline
        aria-hidden
        className="pointer-events-none absolute left-1 right-1 top-1/2 z-[5] h-px origin-left bg-rust"
        style={{ transform: "scaleX(0)", opacity: 0 }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[14.5px] font-bold leading-snug tracking-[-0.01em] ${
            cut ? "text-sub" : "text-ink"
          }`}
        >
          {sub.name}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[10.5px] text-sub">
          <span className="mtag">{sub.category}</span>
          <span aria-hidden className="h-2.5 w-px bg-ink/20" />
          <span>{sub.period === "monthly" ? "月付" : sub.period === "yearly" ? "年付" : sub.period === "quarterly" ? "季付" : "周期待确认"}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`num text-[13.5px] font-semibold ${cut ? "text-sub" : "text-ink"}`}>
          {fmtCNY(sub.amount)}
        </p>
        {sub.annual_amount != null && (
          <p className="num mt-0.5 text-[10px] text-sub/80">年化 {fmtCNY(sub.annual_amount)}</p>
        )}
      </div>
      {/* 末端操作:剪刀(切换)+ 去取消(复制平台指引) */}
      <div className="flex shrink-0 flex-col items-stretch gap-1.5">
        <button
          aria-label={`将 ${sub.name} 标为 ${cut ? "保留" : "裁剪"}`}
          aria-pressed={cut}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center justify-center border border-rust/60 p-2 transition-colors hover:bg-rust hover:text-paper"
        >
          <ScissorMark />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel(sub);
          }}
          className="mtag border border-rust/40 px-1 py-[3px] text-[8.5px] text-rust transition-colors hover:bg-rust hover:text-paper"
        >
          去取消
        </button>
      </div>
    </div>
  );
}

function ScissorMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 13 13" aria-hidden fill="none" className="text-rust">
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d="M1 1.5 L8 8" />
        <path d="M1 11.5 L8 5" />
        <circle cx="10.2" cy="2.6" r="1.1" />
        <circle cx="10.2" cy="10.4" r="1.1" />
      </g>
    </svg>
  );
}

export function ReportBench({ subs, all, decisions, onDecide, header, meta, footer, onExport, onReceipt, onCancel, onDestroy, isDesktop }: BenchProps) {
  const benchRef = React.useRef<HTMLDivElement | null>(null);
  const slotRef = React.useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [inTray, setInTray] = React.useState<Set<string>>(() => new Set()); // 用户手动收进托盘的纸条(v12:初裁全 CUT 时纸条留在台面,拖入托盘才收纳堆叠)
  const [stamped, setStamped] = React.useState<null | "export" | "receipt" | "destroy">(null);
  const stampTimer = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (stampTimer.current !== null) window.clearTimeout(stampTimer.current);
  }, []);

  /* ---------- 统计(口径 = 全量,不随筛选) ---------- */
  const cutList = all.filter((s) => decisions[String(s.id)] === "cut");
  const keepList = all.filter((s) => decisions[String(s.id)] !== "cut");
  const cutAnnual = cutList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const keepAnnual = keepList.reduce((n, s) => n + (s.annual_amount ?? 0), 0);

  /* ---------- 归属位置(纯计算;px 依台面实际尺寸;以纸条中心为坐标) ---------- */
  const target = React.useCallback(
    (sub: Subscription): { x: number; y: number; r: number } => {
      const B = benchRef.current;
      if (!B) return { x: 0, y: 0, r: 0 };
      const w = B.clientWidth;
      const h = B.clientHeight;
      const HALF = 130; // 纸条半宽(260/2)
      const isCut = decisions[String(sub.id)] === "cut";
      if (isCut && inTray.has(String(sub.id))) {
        const idx = cutList.indexOf(sub); // 后裁的压在上一张
        // 堆叠随机化:每张微角度 ±1.6°、微偏移 —— 真抓实摞的纸(而非整齐扑克)
        const rJ = Math.sin(idx * 7.13) * 1.6;
        const xJ = Math.sin(idx * 3.71) * 9;
        return { x: w * 0.125 - HALF + xJ, y: h * 0.42 + idx * STACK_STEP + (idx % 2) * 3, r: -0.4 + rJ };
      }
      const p = scatter(all.indexOf(sub), all.length);
      return { x: w * (p.x / 100) - HALF, y: h * (p.y / 100), r: p.r };
    },
    [all, cutList, decisions, inTray],
  );

  /* ---------- 布局/吸附:decisions 变化 → 纸条飞到归属位 ---------- */
  React.useEffect(() => {
    if (!isDesktop) return;
    const raf = requestAnimationFrame(() => {
      all.forEach((sub) => {
        const anchor = slotRef.current?.querySelector<HTMLElement>(`[data-slip="anchor-${sub.id}"]`);
        const inner = anchor?.querySelector<HTMLElement>("[data-slip-inner]");
        if (!anchor || !inner) return;
        if (inner.dataset.grabbed) return; // 拖拽中不打断
        const p = target(sub);
        // z 序:堆叠在上层的后裁纸条压前面
        const isCut = decisions[String(sub.id)] === "cut";
        const idx = isCut ? cutList.indexOf(sub) : 0;
        gsap.to(inner, {
          x: p.x,
          y: p.y,
          rotation: p.r,
          zIndex: isCut ? 10 + idx : 10,
          duration: 0.6,
          ease: "back.out(1.55)",
        });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isDesktop, all, decisions, cutList, target]);

  /* ---------- 桌面:横快划 / 拖拽分拣(自研 PointerDrag + GSAP 动画) ----------
     注:GSAP Draggable 与本项目的 gsap.to 布局位冲突(自缓存 x/y 与动画 transform
     互相覆盖,拖拽死锁)—— 改用原生 pointer 事件 + gsap.set/to,行为完全可控。 */
  React.useEffect(() => {
    if (!isDesktop || !slotRef.current) return;
    const cleanups: (() => void)[] = [];
    slotRef.current.querySelectorAll<HTMLElement>("[data-slip-inner]").forEach((inner) => {
      const sub = all.find((s) => String(s.id) === (inner.dataset.slipId ?? ""));
      if (!sub) return;
      cleanups.push(
        attachPointerDrag(inner, {
          onPress() {
            inner.dataset.grabbed = "1";
            gsap.to(inner, { scale: 1.02, duration: 0.18 });
            gsap.to(inner, { zIndex: 60, duration: 0.18 });
          },
          onPreview(dx) {
            const cutline = inner.querySelector<HTMLElement>("[data-cutline]");
            if (cutline) {
              gsap.set(cutline, {
                scaleX: Math.min(1, Math.abs(dx) / 90),
                opacity: Math.min(1, Math.abs(dx) / 130),
              });
            }
          },
          onRelease({ dx, dt, zoneX, zoneW }) {
            delete inner.dataset.grabbed;
            gsap.to(inner, { scale: 1, duration: 0.25 });
            const cutline = inner.querySelector<HTMLElement>("[data-cutline]");
            if (cutline) gsap.set(cutline, { scaleX: 0, opacity: 0 });

            /* ① 横快划(≥70px 且 <350ms)= 直接裁定 */
            if (Math.abs(dx) > 70 && dt < 350) {
              onDecide(sub.id, dx < 0 ? "cut" : "keep");
              return;
            }
            /* ② 拖进托盘(左 22% / 右 78%)= 吸附归类 + 收纳堆叠(收拢/取出) */
            if (zoneX < zoneW * 0.22 || zoneX > zoneW * 0.78) {
              const d = zoneX < zoneW * 0.22 ? "cut" : "keep";
              onDecide(sub.id, d);
              setInTray((prev) => {
                const next = new Set(prev);
                if (d === "cut") next.add(String(sub.id));
                else next.delete(String(sub.id));
                return next;
              });
              return;
            }
            /* ③ 松手在台面:回原位 */
            const p = target(sub);
            gsap.to(inner, { x: p.x, y: p.y, rotation: p.r, duration: 0.55, ease: "back.out(1.7)" });
          },
        }),
      );
    });
    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, all, target, onDecide]);

  /* ---------- 印章(盖章动效 → 执行) ---------- */
  const doStamp = (which: "export" | "receipt" | "destroy") => {
    if (stamped) return;
    setStamped(which);
    stampTimer.current = window.setTimeout(() => {
      setStamped(null);
      if (which === "export") onExport();
      else if (which === "receipt") onReceipt();
      else setConfirmOpen(true);
    }, 620);
  };

  return (
    <div className="bench">
      {header}
      {meta}

      {/* ---------- 分拣台面 ---------- */}
      <div
        ref={benchRef}
        data-bench
        className="relative mt-8 h-[66vh] min-h-[520px] w-full overflow-hidden border-t border-b border-ink/15"
      >
        {/* 台面:计量刻度(横向格线)+ 木纹纤维(有向噪点,极淡)—— 工作台式面 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(26,26,26,.5) 0 1px, transparent 1px 48px), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.004 0.16' numOctaves='2' seed='11'/%3E%3CfeColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.1 0.6 0.6 0.6 0 0'/%3E%3C/filter%3E%3Crect width='420' height='420' filter='url(%23w)'/%3E%3C/svg%3E\")",
              backgroundSize: "auto, 420px 420px",
            }}
          />
        </div>

        {/* 左托 CUT */}
        <div aria-hidden className="absolute bottom-4 left-4 top-4 w-[22%] border border-dashed border-ink/30">
          <p className="mtag absolute -top-[7px] left-3 bg-paper px-1.5 text-[9px] text-rust">CUT 托</p>
          <p className="absolute bottom-3 left-3 right-3">
            <span className="mtag block text-[9px] text-sub/80">已裁 {cutList.length} 项</span>
            <span className="num block text-[16px] font-bold leading-tight text-rust">年省 {fmtCNY(cutAnnual)}</span>
          </p>
        </div>

        {/* 右托 KEEP */}
        <div aria-hidden className="absolute bottom-4 right-4 top-4 w-[22%] border border-dashed border-ink/30">
          <p className="mtag absolute -top-[7px] right-3 bg-paper px-1.5 text-[9px] text-ink/60">KEEP 托</p>
          <p className="absolute bottom-3 left-3 right-3 text-right">
            <span className="mtag block text-[9px] text-sub/80">保留 {keepList.length} 项</span>
            <span className="num block text-[16px] font-bold leading-tight text-ink">年留 {fmtCNY(keepAnnual)}</span>
          </p>
        </div>

        {/* 纸条层:桌面 = 物理平铺/拖拽;移动 = 纵列流式(点击剪刀切换) */}
        {isDesktop ? (
          <div ref={slotRef} className="absolute inset-0 z-[2]">
            {subs.map((sub) => {
              const cut = decisions[String(sub.id)] === "cut";
              return (
                <div key={sub.id} data-slip={`anchor-${sub.id}`} className="absolute left-0 top-0">
                  <div data-slip-inner data-slip-id={String(sub.id)} className="w-[260px]">
                    <SlipInner sub={sub} cut={cut} onToggle={() => onDecide(sub.id, cut ? "keep" : "cut")} onCancel={onCancel} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative z-[2] mx-auto max-w-[560px] space-y-4 pb-28 pt-6">
            {subs.map((sub) => {
              const cut = decisions[String(sub.id)] === "cut";
              return (
                <div key={sub.id} className="w-full">
                  <SlipInner sub={sub} cut={cut} onToggle={() => onDecide(sub.id, cut ? "keep" : "cut")} onCancel={onCancel} />
                </div>
              );
            })}
          </div>
        )}

        {/* 台面操作提示(仅桌面) */}
        {isDesktop && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap">
            <span className="mtag text-[9.5px] text-sub/70">横快划 = 裁 · 拖进托盘 = 收纳分拣 · 点剪刀 = 切换</span>
          </p>
        )}
      </div>

      {/* ---------- 下部:页脚操作(左)与印章(右) ---------- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
        <div className="no-print flex flex-wrap items-center gap-x-7 gap-y-4">{footer}</div>
        <div className="no-print flex items-center gap-6">
          <StampButton label="COPY LIST" sub="复制取消清单" active={stamped === "export"} onClick={() => doStamp("export")} />
          <StampButton label="RECEIPT" sub="生成裁剪小票" active={stamped === "receipt"} onClick={() => doStamp("receipt")} />
          <StampButton label="DESTROY" sub="销毁数据" active={stamped === "destroy"} onClick={() => doStamp("destroy")} />
        </div>
      </div>

      {/* ---------- 销毁二次确认(页内红框条,非弹窗) ---------- */}
      {confirmOpen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border border-rust/70 bg-[#F5E6E4] px-5 py-4">
          <p className="mtag text-[10.5px] text-rust">
            确认销毁?本会话全部报告与裁剪决定将立即清除,不可恢复。
          </p>
          <p className="mtag flex gap-7 text-[11px]">
            <button
              onClick={() => {
                setConfirmOpen(false);
                onDestroy();
              }}
              className="bg-rust px-3.5 py-2 text-paper transition-colors hover:bg-ink"
            >
              确认销毁
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="border border-rust/50 px-3.5 py-2 text-rust transition-colors hover:bg-rust hover:text-paper"
            >
              取消
            </button>
          </p>
        </div>
      )}

      <p className="mtag mb-8 mt-8 text-center text-[9.5px] text-rust/80">本地暂存 7 天,可手动销毁</p>
    </div>
  );
}

/** 章形按钮:方章 + 盖章动效(GSAP)+ 按下瞬间的印泥残影 */
function StampButton({ label, sub, active, onClick }: { label: string; sub: string; active: boolean; onClick: () => void }) {
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const inkRef = React.useRef<HTMLSpanElement | null>(null);
  const [ink, setInk] = React.useState(false);

  React.useEffect(() => {
    if (active && ref.current) {
      gsap.fromTo(
        ref.current,
        { y: -8, scale: 1.12 },
        { y: 0, scale: 1, duration: 0.5, ease: "bounce.out" },
      );
    }
  }, [active]);

  React.useEffect(() => {
    if (!ink || !inkRef.current) return;
    gsap.fromTo(
      inkRef.current,
      { scale: 1.14, opacity: 0.85 },
      { scale: 1.04, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => setInk(false) },
    );
  }, [ink]);

  return (
    <button
      ref={ref}
      onClick={() => {
        setInk(true);
        onClick();
      }}
      aria-label={`${sub}(盖章确认)`}
      className={`relative border px-3.5 py-3 text-rust transition-colors hover:bg-rust hover:text-paper ${active ? "border-rust bg-rust/10" : "border-rust/70"}`}
    >
      {/* 印泥残影(按下瞬间的红框印) */}
      {ink && (
        <span
          ref={inkRef}
          aria-hidden
          className="pointer-events-none absolute -inset-1.5 border-2 border-rust/80"
          style={{ transform: "scale(1.14)" }}
        />
      )}
      <span className="mtag block text-[10.5px] leading-relaxed">
        {label}
        <span className="block text-[9px] opacity-75">{sub}</span>
      </span>
    </button>
  );
}
