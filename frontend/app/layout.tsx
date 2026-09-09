// =============================================================
// 根布局:Trim(vestris 编辑室)共享壳
// Geist Sans(正文/展示)+ Instrument Serif(斜体强调)本地托管;
// CJK 一律回退系统栈(Geist 无中文字形)——混排语言既有事实
// =============================================================
import type { Metadata } from "next";
import localFont from "next/font/local";

import { HeaderNav } from "@/components/trim/header-nav";
import { Footer } from "@/components/trim/footer";
import { PageTransition } from "@/components/trim/page-transition";

import "./globals.css";

const geist = localFont({
  src: [
    { path: "../fonts/geist-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/geist-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/geist-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/geist-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/geist-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = localFont({
  src: [
    { path: "../fonts/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/geist-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/geist-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrument = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  // 站点地址优先取环境变量(Vercel 自动注入 NEXT_PUBLIC_SITE_URL 或回退部署域名);本地默认 3000
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL &&
      process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000",
  ),
  title: {
    default: "Trim — Find and cancel subscriptions you don't need",
    template: "%s · Trim",
  },
  description:
    "Find unnecessary subscriptions, calculate your yearly savings, and take control of recurring bills with Trim. 上传或粘贴账单,本地识别自动续费,算出一年能省多少。无需注册,不连银行卡。",
  keywords: [
    "订阅管理", "自动续费", "取消订阅", "订阅费用计算", "年度订阅支出",
    "subscription tracker", "subscription calculator", "cancel subscriptions",
    "find forgotten subscriptions", "subscription audit",
  ],
  applicationName: "Trim",
  authors: [{ name: "Trim" }],
  openGraph: {
    type: "website",
    siteName: "Trim",
    title: "Trim — Find and cancel subscriptions you don't need",
    description:
      "Paste your subscription bill. Trim finds what you can cut. No account. No bank connection. Local analysis.",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trim — BILLS, TRIMMED.",
    description: "找出不必要的订阅,算出一年能省多少。本地分析,无需注册。",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geist.variable} ${instrument.variable} ${geistMono.variable}`}>
      <body className="bg-paper text-ink">
        {/* 结构化数据:SoftwareApplication(SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Trim",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              description:
                "Find unnecessary subscriptions, calculate your yearly savings, and take control of recurring bills. Local analysis, no account required.",
              offers: [
                { "@type": "Offer", name: "Free", price: "0", priceCurrency: "CNY" },
                { "@type": "Offer", name: "Trim Pro", price: "6.9", priceCurrency: "CNY" },
              ],
            }),
          }}
        />
        <HeaderNav />
        <main id="main" className="relative z-[1]">{children}</main>
        <Footer />
        <PageTransition />
      </body>
    </html>
  );
}
