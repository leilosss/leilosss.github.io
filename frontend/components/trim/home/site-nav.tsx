// =============================================================
// SiteNav —— 首页固定报头(v2.7)
// 左:TRIM.(方形红句点)  中:章节锚点  右:常驻主 CTA(开始分析账单)
//
// 报头也承担转化:无论滚到哪一节,主 CTA 都在同一个位置,不用回到首屏找按钮。
// 窄屏只留编号(编号本身就是章节身份),整条可横向滑动 —— 不与页面抢宽度;
// 右对齐只在确认放得下的 lg 以上启用(窄屏右对齐 + 溢出会让初始滚动位落在末端)。
// IntersectionObserver 只做"当前章节"反馈,不做进场动画。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";

export const SECTIONS = [
  { id: "s01", no: "01", label: "问题" },
  { id: "s02", no: "02", label: "演示" },
  { id: "s03", no: "03", label: "分析" },
  { id: "s04", no: "04", label: "节省" },
  { id: "s05", no: "05", label: "隐私" },
  { id: "s06", no: "06", label: "支持" },
] as const;

export function SiteNav() {
  const [active, setActive] = React.useState<string>("");

  React.useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    // 判定带:顶部 72px(报头高度)到视口 45% 之间,谁先进入谁当选
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-x-3 px-4 py-3 sm:gap-x-4 sm:px-8 lg:px-10">
        {/* 词标 */}
        <a
          href="#top"
          aria-label="回到顶部"
          className="flex shrink-0 items-baseline leading-none tracking-[-0.05em] text-ink transition-colors hover:text-rust"
        >
          <span className="text-[26px] font-extrabold sm:text-[28px]">TRIM</span>
          <span aria-hidden className="ml-[0.06em] inline-block h-[0.16em] w-[0.16em] bg-rust" />
        </a>

        {/* 章节锚点:窄屏只留编号并横向滑动,桌面单行铺开 */}
        <nav aria-label="页面章节" className="no-scrollbar -mx-1 min-w-0 flex-1 overflow-x-auto px-1">
          <ul className="mtag flex items-center justify-start gap-x-3.5 text-[9.5px] text-sub sm:gap-x-6 lg:justify-end lg:gap-x-8">
            {SECTIONS.map((s) => {
              const on = active === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    aria-current={on ? "true" : undefined}
                    className={`flex items-baseline gap-1.5 whitespace-nowrap transition-colors hover:text-rust ${
                      on ? "text-ink" : ""
                    }`}
                  >
                    <span className={on ? "text-rust" : "text-sub/60"}>{s.no}</span>
                    <span
                      className={`hidden sm:inline ${
                        on ? "underline decoration-rust decoration-1 underline-offset-[6px]" : ""
                      }`}
                    >
                      {s.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 常驻主 CTA */}
        <Link
          href="/upload"
          className="mtag shrink-0 bg-ink px-3 py-2.5 text-[9.5px] text-paper transition-colors hover:bg-rust sm:px-4"
        >
          <span className="sm:hidden">开始分析</span>
          <span className="hidden sm:inline">开始分析账单</span>
        </Link>
      </div>
    </header>
  );
}
