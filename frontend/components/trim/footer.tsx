// =============================================================
// Footer:全站细脚注(v2.0)
// 品牌口号 + 隐私事实 + 全站导航(含商业化与工具页)。
// 只陈述能证明的事:本地分析 / 无账号 / 不连银行卡 / 本机 7 天暂存。
// =============================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "START", href: "/upload" },
  { label: "DEMO", href: "/report?d=demo" },
  { label: "HOW", href: "/guide" },
  { label: "DEALS", href: "/deals" },
  { label: "PRICING", href: "/pricing" },
  { label: "ANNUAL", href: "/annual" },
];

/** 自带完整报尾的页面不叠加全站页脚(否则页面上会出现两条 © 2026 TRIM) */
const SELF_FOOTERED = ["/deals", "/"];

export function Footer() {
  const pathname = usePathname();
  if (SELF_FOOTERED.includes(pathname)) return null;

  return (
    <footer className="relative z-[1] border-t border-ink/15">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-9 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-[19px] font-extrabold leading-none tracking-[-0.03em]">Trim</span>
              <span className="mtag text-[9px] text-rust">BILLS, TRIMMED.</span>
            </p>
            <p className="prose-sm mt-2 text-[13.5px]">
              找出不必要的订阅,算清一年真正花了多少。
            </p>
          </div>
          <nav aria-label="页脚导航" className="mtag flex flex-wrap items-center gap-x-5 gap-y-2 text-[9.5px] text-sub">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className="transition-colors hover:text-rust">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-ink/12 pt-5">
          <ul className="mtag flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] text-sub/85">
            {["无需注册", "不连银行卡", "本地分析", "本机暂存 7 天"].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mtag text-[9px] text-ink/35">© 2026 TRIM</p>
        </div>
      </div>
    </footer>
  );
}
