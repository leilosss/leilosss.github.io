// =============================================================
// Marquee —— 无尽纸带(v10)
// 编辑室口吻的横贯纸带:tag 大写词句无缝横滚(rsquad loopScroll 的节奏语言)。
// 一份内容在 JSX 复制两份,track 无限左移 50% 回环(CSS 动画,零 JS 运行时;
// 重复内容 aria-hidden);prefers-reduced-motion 时静止在首词。
// =============================================================
import * as React from "react";

export function Marquee({
  items,
  speed = "46s",
  className = "",
  itemClassName = "",
  separator = <PlusCross />,
}: {
  /** 纸带词句(纯文案,编辑室口吻) */
  items: string[];
  /** CSS 时长,如 "46s" */
  speed?: string;
  className?: string;
  itemClassName?: string;
  separator?: React.ReactNode;
}) {
  return (
    <div aria-hidden className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        className="marquee-track flex w-max"
        style={{ "--marquee-speed": speed } as React.CSSProperties}
      >
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.map((it, i) => (
              <span key={i} className="flex shrink-0 items-center">
                <span className={`tag ${itemClassName}`}>{it}</span>
                <span className="mx-6 flex items-center text-rust/70">{separator}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 45° 加号分隔(套准十字语族,与页面记号一致) */
export function PlusCross() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden fill="none">
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
