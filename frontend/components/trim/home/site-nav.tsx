// =============================================================
// SiteNav —— 首页固定报头(v2.6)
// 左:TRIM.(方形红句点)  右:章节锚点 01-06
// 底部 1px 黑实线;窄屏锚点横向滑动(不与页面抢宽度),滚动时高亮当前章节。
// IntersectionObserver 只做"当前章节"反馈,不做进场动画。
// =============================================================
"use client";

import * as React from "react";

export const SECTIONS = [
  { id: "s01", no: "01", label: "单笔感知" },
  { id: "s02", no: "02", label: "年度累加" },
  { id: "s03", no: "03", label: "裁剪识别" },
  { id: "s04", no: "04", label: "节省金额" },
  { id: "s05", no: "05", label: "价格情报" },
  { id: "s06", no: "06", label: "隐私说明" },
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
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-x-4 px-4 py-3 sm:px-8 lg:px-10">
        {/* 词标 */}
        <a
          href="#top"
          aria-label="回到顶部"
          className="flex shrink-0 items-baseline leading-none tracking-[-0.05em] text-ink transition-colors hover:text-rust"
        >
          <span className="text-[26px] font-extrabold sm:text-[28px]">TRIM</span>
          <span aria-hidden className="ml-[0.06em] inline-block h-[0.16em] w-[0.16em] bg-rust" />
        </a>

        {/* 章节锚点:窄屏横向滑动,桌面单行铺开 */}
        <nav
          aria-label="页面章节"
          className="no-scrollbar -mx-1 min-w-0 flex-1 overflow-x-auto px-1"
        >
          {/* 窄屏左对齐(从 01 开始,右缘截断即"还有更多"的暗示);
              只有确认放得下的 lg 以上才按需求右对齐 */}
          <ul className="mtag flex items-center justify-start gap-x-4 text-[9.5px] text-sub sm:gap-x-6 lg:justify-end lg:gap-x-8">
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
                    <span className={on ? "underline decoration-rust decoration-1 underline-offset-[6px]" : ""}>
                      {s.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
