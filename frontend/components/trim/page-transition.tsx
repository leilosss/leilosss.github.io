// =============================================================
// PageTransition:路由切换时牛皮纸整页淡出淡入(轻量过渡,尊重减弱动效)
// =============================================================
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function PageTransition() {
  const pathname = usePathname();
  const [key, setKey] = React.useState(pathname);
  const [show, setShow] = React.useState(false);
  const prev = React.useRef(pathname);

  React.useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    setShow(true);
    setKey(pathname);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setShow(false), reduce ? 0 : 380);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!show) return null;
  return (
    <div key={key} aria-hidden className="page-dip pointer-events-none fixed inset-0 z-[60] bg-paper" />
  );
}
