// =============================================================
// INDEX(首页 /)—— v2.0 · VALUE FIRST
// 3 秒理解:这是什么 / 为什么需要 / 能省多少 / 下一步点哪里。
// 结构:
//   HERO   痛点提问 + 一句话解释 + 主 CTA + 隐私三条(第一屏可点)
//   STORY  01 小数字 → 02 累加 ¥3,936/年 → 03 CUT/KEEP 判定 → 04 省 ¥1,836/年
//   HOW    OPEN → PASTE → ANALYZE → SEE SAVINGS(30 秒内出结果)
//   CLOSE  墨带收束 CTA
// 版式:≥1366 沿用对开(34vw 裁切线 = 中缝);<1366 单页纵向。
// =============================================================
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CutLine } from "@/components/trim/cut-line";
import { PrivacyTable } from "@/components/trim/home-sections";
import { Marquee } from "@/components/trim/marquee";
import { ClipRevealImg, ParallaxY, Reveal } from "@/components/trim/reveal";
import { StoryAddUp, StorySavings, StorySmall, StoryTriage } from "@/components/trim/story";

// 对开栅格:≥1366 一分为二(出血毛边 | 右页正文);<1366 = 单页容器
const SPREAD =
  "mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10 " +
  "min-[1366px]:m-0 min-[1366px]:grid min-[1366px]:w-full min-[1366px]:max-w-none " +
  "min-[1366px]:grid-cols-[minmax(0,34vw)_minmax(0,1fr)] min-[1366px]:p-0";

const LEAF =
  "min-[1366px]:w-full min-[1366px]:max-w-[min(1020px,calc(100vw-34vw-2.5rem))] " +
  "min-[1366px]:px-10 min-[1366px]:py-24";

const BAND =
  "mx-auto w-full max-w-[1280px] px-5 py-20 text-center sm:px-8 sm:py-28 lg:px-10 " +
  "min-[1366px]:m-0 min-[1366px]:grid min-[1366px]:w-full min-[1366px]:max-w-none " +
  "min-[1366px]:grid-cols-[minmax(0,34vw)_minmax(0,1fr)] min-[1366px]:p-0";

const BAND_LEAF =
  "min-[1366px]:w-full min-[1366px]:max-w-[min(1020px,calc(100vw-34vw-2.5rem))] " +
  "min-[1366px]:px-10 min-[1366px]:py-28";

/** 隐私三条(全站统一措辞;只陈述能证明的事实) */
const PRIVACY_LINE = ["无需注册", "不连银行卡", "本地分析"];

export default function Home() {
  return (
    <div className="relative">
      <CutLine />

      {/* ---------- HERO:痛点 + 价值 + 行动(第一屏内完成) ---------- */}
      <section className="flex min-h-[calc(100svh-73px)] items-center">
        <div className={SPREAD}>
          {/* 出血毛边(≥1366):品牌样张墨印 + folio 边注 */}
          <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:flex-col min-[1366px]:items-center min-[1366px]:justify-between min-[1366px]:py-24">
            <ParallaxY speed={0.06}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/trim-mark.jpg"
                alt=""
                draggable={false}
                className="h-auto w-[min(24vw,220px)] select-none mix-blend-multiply"
              />
            </ParallaxY>
            <span className="folio-v mtag text-[9.5px] text-sub/70">
              SUBSCRIPTION INTELLIGENCE · BILLS, TRIMMED.
            </span>
          </div>

          {/* 右页 */}
          <div className={`relative ${LEAF}`}>
            <div aria-hidden className="pointer-events-none absolute -top-4 right-0 w-[min(34vw,340px)] min-[1366px]:top-0 min-[1366px]:right-[3%]">
              <ClipRevealImg src="/trim-mark.jpg" className="h-auto w-full mix-blend-multiply opacity-[0.055]" />
            </div>

            {/* 眉标:这是什么 */}
            <p className="mtag text-[10px] text-rust">SUBSCRIPTION CLEANUP · 订阅体检</p>

            {/* 痛点提问(超粗,一眼看懂) */}
            <h1 className="mt-5 text-[clamp(40px,8.6vw,92px)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink min-[1366px]:text-[clamp(56px,5vw,104px)]">
              你每年
              <br />
              在订阅上
              <br />
              <span className="text-rust">浪费了多少?</span>
            </h1>

            {/* 一句话解释产品 */}
            <p className="prose-body mt-7 max-w-[40ch] text-[17px] sm:text-[18px]">
              把账单粘贴进来,Trim 算出你的年度订阅支出,并找出可以裁掉的部分。
            </p>

            {/* 主 CTA + 次入口(第一屏可点) */}
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
              <Link href="/upload" className="stamp-cta self-start" aria-label="开始裁剪">
                <span className="stamp-cta-inner">
                  START TRIMMING
                  <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
                </span>
              </Link>
              <Link
                href="/report/demo"
                className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust hover:decoration-rust"
              >
                先看示例报告 →
              </Link>
            </div>

            {/* 隐私三条(信任前置) */}
            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              {PRIVACY_LINE.map((p) => (
                <li key={p} className="mtag flex items-center gap-1.5 text-[9.5px] text-sub">
                  <svg width="10" height="8" viewBox="0 0 13 11" aria-hidden fill="none" className="text-rust">
                    <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>

            {/* 可自行验证的信任信号(不做无法证明的安全宣称) */}
            <p className="prose-sm mt-3.5 max-w-[42ch] text-[13.5px]">
              识别在浏览器里跑 ——{" "}
              <strong className="font-semibold text-ink">断开网络也能用</strong>,你可以自己验证这一点。
            </p>

            {/* 30 秒路径(把流程摆在第一屏,消除未知) */}
            <ol className="mt-11 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink/15 pt-5">
              {["打开", "粘贴账单", "自动识别", "看到能省多少"].map((s, i) => (
                <li key={s} className="mtag flex items-center gap-3 text-[9.5px] text-sub">
                  {i > 0 && <span aria-hidden className="text-ink/25">→</span>}
                  <span className={i === 3 ? "text-rust" : ""}>{s}</span>
                </li>
              ))}
              <li className="mtag ml-auto text-[9.5px] text-ink/50">≈ 30 秒</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- STORY 01:小数字 ---------- */}
      <section className="border-t border-ink/15">
        <div className={SPREAD}>
          <div aria-hidden className="hidden min-[1366px]:block" />
          <div className={LEAF}>
            <StorySmall />
          </div>
        </div>
      </section>

      {/* ---------- STORY 02:累加 ---------- */}
      <section className="border-t border-ink/15 bg-paperDeep">
        <div className={SPREAD}>
          <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:items-center min-[1366px]:justify-center">
            <span className="folio-v mtag text-[9.5px] text-sub/60">THE REAL NUMBER</span>
          </div>
          <div className={LEAF}>
            <StoryAddUp />
          </div>
        </div>
      </section>

      {/* ---------- STORY 03:CUT / KEEP 判定 ---------- */}
      <section className="border-t border-ink/15">
        <div className={SPREAD}>
          <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:items-center min-[1366px]:justify-center">
            <span className="folio-v mtag text-[9.5px] text-sub/60">CUT / KEEP</span>
          </div>
          <div className={LEAF}>
            <StoryTriage />
          </div>
        </div>
      </section>

      {/* ---------- 纸带隔断 ---------- */}
      <section aria-hidden className="border-t border-ink/15 bg-paper">
        <Marquee
          className="py-3.5"
          itemClassName="text-[10.5px] text-ink/75"
          items={["NO ACCOUNT", "NO BANK CONNECTION", "LOCAL ANALYSIS", "CUT WHAT YOU DON'T NEED", "KEEP WHAT MATTERS"]}
        />
      </section>

      {/* ---------- STORY 04:能省多少 + CTA ---------- */}
      <section className="border-t border-rust/40">
        <div className={SPREAD}>
          <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:items-center min-[1366px]:justify-center">
            <span className="folio-v mtag text-[9.5px] text-rust/70">YOU COULD SAVE</span>
          </div>
          <div className={LEAF}>
            <StorySavings />
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
              <Link href="/upload" className="stamp-cta self-start">
                <span className="stamp-cta-inner">
                  算算我的
                  <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
                </span>
              </Link>
              <Link
                href="/report/demo"
                className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust hover:decoration-rust"
              >
                查看示例报告 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 隐私:结构即承诺 ---------- */}
      <section className="border-t border-ink/15">
        <div className={SPREAD}>
          <div aria-hidden className="hidden min-[1366px]:flex min-[1366px]:items-center min-[1366px]:justify-center">
            <span className="folio-v mtag text-[9.5px] text-sub/60">PRIVACY BY STRUCTURE</span>
          </div>
          <div className={LEAF}>
            <p className="mtag text-[10px] text-sub">05 — 你的账单去了哪里</p>
            <h2 className="sect mt-4 text-ink">哪儿也没去。</h2>
            <Reveal as="p" className="prose-body mt-6 max-w-[46ch]">
              识别在你的浏览器里完成。没有账号,不连银行卡,账单文本不会离开这台设备。
            </Reveal>
            <div className="mt-10">
              <PrivacyTable />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 收束:墨带 CTA ---------- */}
      <section className="bg-ink text-paper">
        <div className={BAND}>
          <div aria-hidden className="relative hidden min-[1366px]:flex min-[1366px]:flex-col min-[1366px]:items-center min-[1366px]:justify-center min-[1366px]:gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trim-mark.jpg" alt="" draggable={false} className="h-auto w-[min(28vw,280px)] select-none invert opacity-[0.07]" />
            <span className="folio-v mtag text-[9.5px] text-paper/45">CUT WHAT YOU DON&apos;T NEED</span>
          </div>

          <div className={BAND_LEAF}>
            <h2 className="text-[clamp(30px,6.4vw,58px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-paper">
              现在就知道<br className="sm:hidden" />你一年能省多少。
            </h2>
            <p className="prose-body mx-auto mt-6 max-w-[38ch] text-paper/75">
              粘贴一次账单,30 秒看到结果。不需要注册。
            </p>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
              <Link href="/upload" className="stamp-cta bg-paper" style={{ borderColor: "var(--rust)" }}>
                <span className="stamp-cta-inner">
                  START TRIMMING
                  <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
                </span>
              </Link>
              <Link
                href="/report/demo"
                className="text-[15px] font-semibold text-paper underline decoration-paper/40 decoration-1 underline-offset-[6px] transition-colors hover:text-white"
              >
                查看示例报告 →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
