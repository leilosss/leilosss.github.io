// =============================================================
// IO 时序工具(vestris 编辑室版)
// useInViewOnce:进入判定带 → 一次性触发
// EditorialLine:展示行逐字显影(签名时刻;*…* 段 = Instrument 斜体)
// CutTrigger / Reveal:通用触发与浮现
// 全部尊重 prefers-reduced-motion(CSS 侧兜底)
// =============================================================
"use client";

import * as React from "react";

/** 一次性进入视口检测 */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.2, rootMargin = "0px") {
  const ref = React.useRef<T | null>(null);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return { ref, on };
}

interface TriggerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p" | "h2" | "h3" | "figure";
  /** 判定带默认压在视口中部 */
  rootMargin?: string;
}

/** 通用触发:命中判定带 → 加 .t-on */
export function CutTrigger({ children, className = "", as = "div", rootMargin = "0px 0px -16% 0px" }: TriggerProps) {
  const { ref, on } = useInViewOnce<HTMLElement>(0.2, rootMargin);
  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={`${on ? "t-on " : ""}${className}`}>
      {children}
    </Tag>
  );
}

/** 轻量浮现(段落/行) */
export function Reveal({ children, className = "", as = "div", rootMargin = "0px 0px -8% 0px" }: TriggerProps) {
  const { ref, on } = useInViewOnce<HTMLElement>(0.1, rootMargin);
  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={`reveal ${on ? "is-in " : ""}${className}`}>
      {children}
    </Tag>
  );
}

/**
 * EditorialLine —— 展示行逐字显影。
 * text 中 *…* 包裹的词渲染为 Instrument 斜体;逐字(字符/字母)以 16ms 步进浮起。
 * 自身 IO 触发(is-on),纯 CSS 动画;空格以   保形。
 */
export function EditorialLine({
  text,
  as = "h1",
  className = "",
  rootMargin = "0px 0px -10% 0px",
  id,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  rootMargin?: string;
  id?: string;
}) {
  const { ref, on } = useInViewOnce<HTMLElement>(0.15, rootMargin);
  const Tag = as as React.ElementType;

  // 解析 *斜体段*:返回逐字节点数组(纯文本,SSR 稳定)
  const render = React.useMemo(() => {
    const out: React.ReactNode[] = [];
    const segs = text.split("*");
    let i = 0;
    const push = (chars: string, italic: boolean) => {
      for (const ch of chars) {
        if (ch === "\n") {
          out.push(<br key={`br${i}`} />);
          continue;
        }
        const span = (
          <span key={i} aria-hidden className="ch" style={{ "--i": i } as React.CSSProperties}>
            {ch === " " ? " " : ch}
          </span>
        );
        out.push(italic ? <em key={`e${i}`} className="serif-i">{span}</em> : span);
        i++;
      }
    };
    segs.forEach((seg, idx) => {
      if (seg === "") return;
      push(seg, idx % 2 === 1);
    });
    return out;
  }, [text]);

  return (
    <Tag ref={ref} id={id} aria-label={text.replace(/\*/g, "")} className={`ltrs display ${on ? "is-on " : ""}${className}`}>
      {render}
    </Tag>
  );
}

/**
 * ClipRevealImg —— 品牌样张"剪开"揭示(v10,awwWW clip-path 几何语言 → 纸面版)。
 * 图初始被裁成"交叉剪口"中央菱形,p. 进判定带后展开成整版(裁纸动作的回放);
 * reduce 恒整版(globals.css .tclip 兜底 clip-path: none)。
 * 用法同 <img>:传 className 控制尺寸/混合模式;自身 aria-hidden 装饰用途。
 */
export function ClipRevealImg({
  src,
  className = "",
  rootMargin = "0px 0px -12% 0px",
}: {
  src: string;
  className?: string;
  rootMargin?: string;
}) {
  const { ref, on } = useInViewOnce<HTMLImageElement>(0.2, rootMargin);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      draggable={false}
      className={`tclip select-none ${on ? "is-open " : ""}${className}`}
      aria-hidden
    />
  );
}

/**
 * ParallaxY —— 滚动视差(v10):子元素随滚动轻微上移(纸张被翻阅的深度)。
 * speed = 每滚动 1px 的偏移(如 0.08);只在 no-preference 生效;
 * rAF 节流,与进度轨/裁切线同源算法;reduce 恒原位。
 */
export function ParallaxY({
  children,
  speed = 0.08,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (ref.current) ref.current.style.transform = `translate3d(0, ${(window.scrollY * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={`parallax-y ${className}`}>
      {children}
    </div>
  );
}
