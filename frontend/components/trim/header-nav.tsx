// =============================================================
// HeaderNav:全站统一顶部(vestris 编辑室版)
// 细横排:词标 Trim → 大写导航 → 右侧(示例报告 / 开始裁剪)
// 顶缘:2px 鼠尾草滚动进度(固定,浏览器表面)
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ensureReady, reportsStore } from "@/lib/store";

const LINKS = [
  { label: "HOW", href: "/guide" },
  { label: "REPORT", href: null }, // 运行时解析为最近报告
  { label: "PRICING", href: "/pricing" },
];

export function HeaderNav() {
  const pathname = usePathname();
  const [latest, setLatest] = React.useState<string | null>(null);
  const progressRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    // v12:加密 vault 解锁后再读最近报告(localStorage 7 天)
    ensureReady().then(() => setLatest(reportsStore.latestId()));
  }, []);

  /* 顶缘 2px 滚动进度 */
  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) progressRef.current.style.width = `${(p * 100).toFixed(2)}%`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const reportHref = latest ? `/report?d=${latest}` : "/report?d=demo";

  return (
    <>
      <div className="progress-rail" aria-hidden><i ref={progressRef} /></div>

      <header className="relative z-30 bg-paper">
        <a
          href="#main"
          className="tag absolute left-0 top-0 z-50 -translate-y-full bg-ink px-4 py-2 text-paper focus:translate-y-0"
        >
          跳到内容
        </a>

        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-x-4 px-5 py-3.5 sm:gap-x-8 sm:px-8 sm:py-4 lg:px-10">
          {/* 词标(Trim 主体 + 红裁切标记;标语在 ≥640 才出现,移动端不挤压) */}
          <Link
            href="/"
            className="group flex shrink-0 items-baseline gap-1.5 leading-none text-ink transition-colors hover:text-rust"
            aria-label="Trim 首页"
          >
            <span className="text-[23px] font-extrabold tracking-[-0.04em] sm:text-[25px]">Trim</span>
            <CutGlyph />
            <span className="mtag hidden text-[9px] text-rust sm:inline">bills, trimmed.</span>
          </Link>

          {/* 导航(3 项,移动端也放得下) */}
          <nav aria-label="主导航" className="mtag flex items-center gap-x-4 text-[9.5px] text-sub sm:gap-x-7">
            {LINKS.map((l) => {
              const href = l.href ?? reportHref;
              const active = l.href ? pathname === l.href : pathname.startsWith("/report");
              return (
                <Link
                  key={l.label}
                  href={href}
                  className={`shrink-0 transition-colors hover:text-rust ${
                    active ? "text-ink underline decoration-rust decoration-1 underline-offset-[6px]" : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* 主 CTA(全站常驻,移动端也在) */}
          <Link
            href="/upload"
            className="mtag shrink-0 border-2 border-rust px-3 py-2 text-[9.5px] text-rust transition-colors hover:bg-rust hover:text-paper sm:px-4 sm:py-2.5 sm:text-[10px]"
          >
            IMPORT
          </Link>
        </div>
      </header>
    </>
  );
}

/** Logo 末端红色裁切标记(小剪刀语义:两笔斜切 + 剪口) */
function CutGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="none" className="text-rust">
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M1 2 L7.5 8" />
        <path d="M1 10 L7.5 4" />
        <path d="M5.5 1.5 L9.5 5.5" strokeDasharray="1.5 1.5" opacity="0.6" />
        <circle cx="9.8" cy="2.4" r="1" />
        <circle cx="9.8" cy="9.6" r="1" />
      </g>
    </svg>
  );
}
