// =============================================================
// CutLine:纸缘判定线(v9 艺术化,遗产机制重新上墨)
// 固定 34vw 竖线贯穿全页(首页对开版式的中缝)。
// v9:实线 → 印刷裁切语法 ——
//   1. 打孔虚线底(.cutline-base):未裁的纸缘;
//   2. 实切痕(.cutline-cut):sageDeep 实线随阅读深度从顶向下"裁开"
//      (scrollY / (scrollHeight - innerHeight),同 header 进度轨算法);
//   3. 两端 45° 菱形刻度(旧红色 ✛ → 鼠尾草深,套准十字语义)。
// prefers-reduced-motion:不加滚动效果,虚线纯装饰。
// =============================================================
import * as React from "react";
import { Plus } from "lucide-react";

export function CutLine() {
  const cutRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // reduce:静态打孔线即可,不挂监听不写 scaleY(保持 0)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (cutRef.current) cutRef.current.style.transform = `scaleY(${p})`;
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
  }, []);

  return (
    <div
      aria-hidden
      className="cutline pointer-events-none fixed inset-y-0 left-[34vw] z-[2] hidden min-[1366px]:block"
    >
      <div className="cutline-base" />
      {/* v10:实切痕 = 毛边手工裁线 —— sageDeep 实线叠 feTurbulence 位移,
          纸纤维般的微毛边(裁纸刀口的真实边缘);scaleY 滚动驱动不变 */}
      <div ref={cutRef} className="cutline-cut">
        <svg className="h-full w-[3px] overflow-visible" viewBox="0 0 3 1000" preserveAspectRatio="none" fill="none">
          <defs>
            <filter id="roughcut" x="-200%" y="-2%" width="500%" height="104%">
              <feTurbulence type="turbulence" baseFrequency="0.08 0.0012" numOctaves="1" seed="7" result="rough" />
              <feDisplacementMap in="SourceGraphic" in2="rough" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <line
            x1="1.5" y1="0" x2="1.5" y2="1000"
            stroke="var(--rust)" strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            filter="url(#roughcut)"
          />
        </svg>
      </div>
      <Plus
        size={11}
        strokeWidth={1.75}
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rotate-45 text-rust"
      />
      <Plus
        size={11}
        strokeWidth={1.75}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 text-rust"
      />
    </div>
  );
}
