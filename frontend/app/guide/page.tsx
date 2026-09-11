// =============================================================
// GUIDE /guide —— 三步说明(v2.0)
// 修复 v11 三折页在移动端的可读性事故(折面挤压 → 文字重叠/裁切/字号过小)。
// 新结构 = 极简三步 + 平台细则 + 批注式 FAQ + 隐私便签,全部纵向流式,
// 桌面用三栏并排(纸张折页语言由折痕线与页码保留,不再用 3D 折叠挤压布局)。
// 品牌语言保留:牛皮纸、1px 线、红笔批注、等宽标签、印刷折痕。
// =============================================================
"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCopy, Scissors, Wallet } from "lucide-react";

const STEPS = [
  {
    n: "01",
    en: "COPY YOUR BILL",
    t: "复制你的账单",
    d: "在微信或支付宝的账单页全选复制。不用导出文件,不用等邮件。",
    icon: Wallet,
  },
  {
    n: "02",
    en: "PASTE INTO TRIM",
    t: "粘贴到 Trim",
    d: "回到本站,直接上传导出的文件,或按 Ctrl + V 粘贴(手机长按)。识别在你的浏览器里完成。",
    icon: ClipboardCopy,
  },
  {
    n: "03",
    en: "CUT WHAT YOU DON'T NEED",
    t: "裁掉不需要的",
    d: "看到年度总支出与可省金额,逐条 CUT / KEEP,再照清单去平台关闭。",
    icon: Scissors,
  },
];

const ALIPAY = [
  "支付宝 → 我的 → 账单",
  "右上角「···」→ 筛选时间范围(建议 ≥3 个月)",
  "导出文件直接上传,或全选文本复制",
];
const WECHAT = [
  "微信 → 我 → 服务 → 钱包 → 账单",
  "选择月份 / 时间范围",
  "导出文件直接上传,或全选文本复制",
];

const FAQS = [
  { q: "我的账单数据安全吗?", a: "账单文本只在你的浏览器里解析,不发送到任何服务器,也不会交给第三方模型。报告加密存在本机,7 天后自动过期,你也可以随时销毁。" },
  { q: "需要注册或绑定银行卡吗?", a: "都不需要。Trim 不接触你的账号、密码或银行卡,只读你主动上传或粘贴的账单内容。" },
  { q: "识别不准怎么办?", a: "时间跨度越长越准(建议 ≥3 个月)。每条判定你都能改 —— Trim 给建议,你做决定。" },
  { q: "Trim 能帮我自动取消吗?", a: "不能,也不会去做。自动取消需要你的账号权限,那与我们的隐私承诺冲突。Trim 给出准确的取消路径,由你自己在平台里关闭。" },
  { q: "支持哪些账单?", a: "微信或支付宝导出的 CSV、XLSX、TXT 直接上传;转存成 Word 的账单(.docx)也能读;还能粘贴账单文本,或者直接传账单截图(本机识别)。全部只在本机解析。" },
];

const COMMITS = ["无需注册", "不连银行卡", "本地分析", "数据留在这台设备"];

export default function GuidePage() {
  return (
    <div className="bench mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      {/* 页头 */}
      <p className="mtag text-[10px] text-rust">HOW IT WORKS · 三步</p>
      <h1 className="mt-4 text-[clamp(32px,7vw,58px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink">
        复制、粘贴、裁掉。
      </h1>
      <p className="prose-body mt-5 max-w-[44ch]">
        全程约 30 秒。不需要注册,不连银行卡,账单不离开这台设备。
      </p>

      {/* ---------- 三步(纵向流式;≥768 三栏并排,折痕线分隔) ---------- */}
      <ol className="mt-12 grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="relative bg-paper px-5 py-7 sm:px-6 sm:py-8">
            {/* 折痕(纸张语言,不挤压布局) */}
            <span aria-hidden className="crease pointer-events-none absolute inset-x-0 top-0 h-2 opacity-60" />
            <div className="flex items-center gap-3">
              <span className="mtag text-[11px] text-rust">{s.n}</span>
              <span className="flex h-[34px] w-[34px] items-center justify-center border border-ink/30">
                <s.icon size={16} strokeWidth={1.6} aria-hidden className="text-ink/80" />
              </span>
            </div>
            <p className="mtag mt-5 text-[9.5px] text-sub">{s.en}</p>
            <h2 className="mt-1.5 text-[20px] font-extrabold tracking-[-0.025em] text-ink">{s.t}</h2>
            <p className="prose-body mt-2.5 text-[15px]">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
        <Link href="/upload" className="stamp-cta self-start">
          <span className="stamp-cta-inner">IMPORT BILL</span>
        </Link>
        <Link href="/report?d=demo" className="self-start text-[15px] font-semibold text-ink underline decoration-ink/35 decoration-1 underline-offset-[6px] transition-colors hover:text-rust hover:decoration-rust">
          TRY DEMO →
        </Link>
      </div>

      {/* ---------- 平台细则 ---------- */}
      <section id="copy" className="mt-20 scroll-mt-20">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>WHERE TO COPY · 从哪里复制</span>
          <span className="text-ink/40">A / B</span>
        </p>
        <div className="mt-7 grid gap-10 md:grid-cols-2 md:gap-14">
          {[
            { tag: "A · 支付宝", steps: ALIPAY },
            { tag: "B · 微信支付", steps: WECHAT },
          ].map((col) => (
            <div key={col.tag}>
              <p className="mtag text-[10.5px] text-rust">{col.tag}</p>
              <ol className="mt-4">
                {col.steps.map((st, i) => (
                  <li key={st} className="flex items-baseline gap-4 border-b border-ink/10 py-3.5">
                    <span className="mtag w-6 shrink-0 text-[9.5px] text-rust">{String(i + 1).padStart(2, "0")}</span>
                    <span className="prose-body text-[15px]">
                      {st}
                      {/* 关键步红笔圈注 */}
                      {i === col.steps.length - 1 && (
                        <span className="relative ml-2 inline-block">
                          <span className="mtag text-[9px] text-rust">关键</span>
                          <svg aria-hidden className="absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] text-rust" fill="none" viewBox="0 0 60 26">
                            <ellipse cx="30" cy="13" rx="28" ry="11" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 4" />
                          </svg>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="prose-sm mt-6 text-[13.5px]">
          ◌ 上传导出的文件,或复制文本粘贴 —— 两种方式都能用,不用整理数据。
        </p>
      </section>

      {/* ---------- FAQ:批注式(问题印刷体 / 答案红笔批注) ---------- */}
      <section id="faq" className="mt-20 scroll-mt-20">
        <p className="rule-label mtag text-[9.5px] text-sub">
          <span>QUESTIONS · 常见问题</span>
          <span className="text-ink/40">{FAQS.length}</span>
        </p>
        <div className="mt-2">
          {FAQS.map((f, i) => (
            <div key={f.q} className="grid gap-x-10 gap-y-2.5 border-b border-ink/12 py-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <h3 className="text-[17px] font-extrabold leading-snug tracking-[-0.02em] text-ink">
                <span className="mtag mr-3 align-middle text-[9.5px] text-rust">Q{i + 1}</span>
                {f.q}
              </h3>
              <p
                className="text-[14.5px] leading-[1.85] text-rust/90"
                style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
              >
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 隐私便签(红底白字 + 胶带) ---------- */}
      <section id="privacy" className="mt-20 scroll-mt-20">
        <div className="relative mx-auto max-w-[620px]">
          <div className="paper-lift relative border border-rust bg-rust px-6 py-8 sm:px-9 sm:py-10">
            <span aria-hidden className="tape -top-2 left-1/2 -translate-x-1/2 rotate-[-3deg]" />
            <span aria-hidden className="tape -bottom-2 left-1/2 -translate-x-1/2 rotate-[2.5deg]" />
            <p className="mtag mtag-lg text-[10px] text-paper/85">PRIVACY · 隐私承诺</p>
            <p className="mt-5 text-[16px] font-semibold leading-[1.8] text-paper">
              账单文本只在你的浏览器里解析,不发送到服务器,不交给第三方模型。
              报告加密存在本机,7 天后自动过期,你也可以随时一键销毁。
            </p>
            <ul className="mt-7 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-paper/30 pt-6 lg:grid-cols-4">
              {COMMITS.map((c) => (
                <li key={c} className="flex items-baseline gap-2 text-[14px] font-semibold text-paper">
                  <svg width="12" height="10" viewBox="0 0 13 11" aria-hidden fill="none" className="shrink-0">
                    <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden className="absolute inset-x-2 -bottom-1.5 top-3 -z-[1] border border-rust/25 bg-rust/10" />
        </div>
      </section>

      <p className="mtag mt-16 text-[10px]">
        <Link href="/" className="text-sub transition-colors hover:text-rust">← 返回首页</Link>
      </p>
    </div>
  );
}
