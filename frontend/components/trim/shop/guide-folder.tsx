// =============================================================
// GuideFolder —— 指南页三折手册(v11 车间版 · 对标 Readymag Stories 翻页叙事)
// 核心隐喻:三折页纸质说明书 —— 三折并排呈摊开的折叠手册(俯视微透视);
// 点击折面 → 该折铺平展开(flex-basis 100% + 微 rotateY 收翼),其余两折
// 收拢成标题翼;一次只开一面,免长页滚动;再点折回。
// A 导出账单:支付宝/微信左右分栏 + 线条图标步骤 + 红笔圈注关键点;
// B 常见问题:全展开"批注式"—— 问题印刷黑体,答案红色等宽(页边批注);
// C 隐私承诺:红色警示便签(白字 + 两角胶带)。
// 功能保留:全部 FAQ 内容、导出步骤(双平台)、隐私四条;锚点语义折面化。
// 移动端(<768):三折纵向堆叠,逐个展开(内容自适应高度)。
// =============================================================
"use client";

import * as React from "react";
import { ArrowDown, CreditCard, Inbox, QrCode, Wallet } from "lucide-react";

/* ---------- 内容数据(v12:3 步路径 —— 复制账单) ---------- */
const ALIPAY = [
  { icon: Wallet, t: "打开账单", d: "支付宝 → 我的 → 账单" },
  { icon: QrCode, t: "全选复制", d: "账单列表右上「···」→ 批量选择 → 复制文本" },
  { icon: Inbox, t: "粘贴到 Trim", d: "回到本站 → Ctrl + V → 自动识别" },
  { icon: CreditCard, t: "或截长图上传", d: "账单页直接截长图 → 回到本站上传图片,本机识别" },
];
const WECHAT = [
  { icon: CreditCard, t: "进入账单", d: "微信 → 我 → 服务 → 钱包 → 账单" },
  { icon: QrCode, t: "全选复制", d: "账单页点「···」→ 选择时间范围 → 复制明细文本" },
  { icon: Inbox, t: "粘贴到 Trim", d: "回到本站 → Ctrl + V → 自动识别" },
  { icon: Wallet, t: "或截长图上传", d: "账单页直接截长图 → 回到本站上传图片,本机识别" },
];

const FAQS = [
  { q: "我的账单数据安全吗?", a: "文件只在你的浏览器里解析,服务端不接收任何原始文件;报告仅存于当前会话,可一键销毁。" },
  { q: "支持哪些格式?", a: "支付宝导出的 CSV(自动处理 GBK 编码)、微信「用于个人对账」的 xlsx 或 csv,以及账单页截图(PNG/JPG/WEBP,可一次选多张)。" },
  { q: "截图识别要联网吗?", a: "识别模型会随页面下载一次(约 11MB,之后走浏览器缓存)。图片本身只在本机解码,不上传、不经过任何第三方域名。" },
  { q: "截图识别失败怎么办?", a: "把长账单分成 2–3 张分别截图后一起上传(分段反而更准);也可以改用「复制文本粘贴」,两条路都能进同一份报告。" },
  { q: "解析不准确怎么办?", a: "时间跨度越长越准(建议 ≥3 个月);识别结果按置信度分级,低置信条目可人工复核。" },
  { q: "报告可以保存吗?", a: "可以现场导出纯文本清单;其余数据关闭页面即清除,不留痕迹。" },
];

const COMMITS = [
  { k: "00", v: "本地处理" },
  { k: "01", v: "无文件上传" },
  { k: "02", v: "无注册" },
  { k: "03", v: "会话级存储" },
];

/* ---------- 折面 ---------- */
type FoldDef = {
  key: string;
  code: string;
  title: string;
  sub: string;
  body: React.ReactNode;
  /** 收拢态轮显的封面字 */
  cover: string;
};

export function GuideFolder() {
  const [active, setActive] = React.useState<string | null>(null);
  const [wide, setWide] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setWide(!mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const folds: FoldDef[] = [
    {
      key: "export",
      code: "A",
      title: "复制账单",
      sub: "全选复制,不用导出文件",
      cover: "COPY",
      body: <ExportBody />,
    },
    {
      key: "faq",
      code: "B",
      title: "常见问题",
      sub: "批注式问答,一次看全",
      cover: "FAQ",
      body: <FaqBody />,
    },
    {
      key: "privacy",
      code: "C",
      title: "隐私承诺",
      sub: "贴在说明书最后的红色便签",
      cover: "PRIVACY",
      body: <PrivacyBody />,
    },
  ];

  return (
    <div className="bench">
      {/* 折叠手册(桌面:三折并排微透;移动:纵列) */}
      <div className={`flex w-full ${wide ? "gap-4" : "flex-col gap-8"}`}>
        {folds.map((f, i) => {
          const isOpen = active === f.key;
          return (
            <section
              key={f.key}
              aria-label={`${f.code} — ${f.title}${isOpen ? "(已展开)" : "(点击展开)"}`}
              className={`relative border border-ink/25 bg-paper transition-[flex-basis,transform,opacity] duration-[650ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
                wide ? "h-[70vh] min-h-[540px]" : ""
              }`}
              style={{
                flexBasis: wide ? (isOpen ? "100%" : "30%") : "auto",
                transform: wide
                  ? isOpen
                    ? "rotateY(0deg)"
                    : i === 0
                      ? "rotateY(14deg)"
                      : i === 2
                        ? "rotateY(-14deg)"
                        : "rotateY(0deg)"
                  : "none",
                transformOrigin: i === 0 ? "right center" : i === 2 ? "left center" : "center",
                perspective: "1600px",
                opacity: wide ? (isOpen || active === null ? 1 : 0.42) : 1,
              }}
            >
              {/* 折痕(每折内缘) */}
              <div aria-hidden className="crease pointer-events-none absolute inset-x-0 top-0 h-2 opacity-60" />

              {/* 折标题(始终可见;收拢态即封面) */}
              <button
                onClick={() => setActive(isOpen ? null : f.key)}
                aria-expanded={isOpen}
                className={`group flex w-full items-baseline justify-between gap-4 px-5 py-4 text-left sm:px-7 ${
                  isOpen ? "border-b border-ink/15" : ""
                }`}
              >
                <span className="flex items-baseline gap-4">
                  <span className="mtag text-[10px] text-rust">{f.code}</span>
                  <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink sm:text-[22px]">
                    {f.title}
                  </span>
                </span>
                <span className="mtag mtag-lg hidden text-[9.5px] text-sub/70 sm:block">
                  {isOpen ? "折回 ↺" : f.cover}
                </span>
              </button>

              {/* 展开体 */}
              {isOpen && (
                <div className={`overflow-hidden ${wide ? "h-[calc(100%-58px)] overflow-y-auto" : ""}`}>
                  <div className="px-5 pb-8 sm:px-7">{f.body}</div>
                </div>
              )}

              {/* 收拢态封面副题 */}
              {!isOpen && (
                <div className="pointer-events-none absolute inset-x-5 bottom-5 sm:inset-x-7">
                  <p className="text-[13px] font-medium text-sub">{f.sub}</p>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 底部提示 */}
      <p className="mtag mb-8 mt-8 text-center text-[9.5px] text-sub/70">
        点折展开 · 再点折回 · 一次只开一面
      </p>
    </div>
  );
}

/* ---------- A 导出账单:线条步骤 + 红笔圈注 ---------- */
function ExportBody() {
  return (
    <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
      {[
        { tag: "A · 支付宝", steps: ALIPAY },
        { tag: "B · 微信", steps: WECHAT },
      ].map((col) => (
        <div key={col.tag} className="relative">
          <p className="mtag text-[10.5px] text-rust">{col.tag}</p>
          <ol className="mt-5 space-y-5">
            {col.steps.map((s, i) => (
              <li key={s.t} className="relative flex items-start gap-5">
                {/* 步骤线 */}
                {i < col.steps.length - 1 && (
                  <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-26px)] w-px bg-ink/20" />
                )}
                {/* 线条图标 + 红笔圈注(关键步 = 全选复制) */}
                <span className="relative mt-0.5 flex h-[35px] w-[35px] shrink-0 items-center justify-center border border-ink/35">
                  <s.icon size={16} strokeWidth={1.5} aria-hidden className="text-ink/80" />
                  {i === 1 && (
                    <svg aria-hidden className="absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] text-rust" fill="none">
                      <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" className="animate-[spin_9s_linear_infinite]" style={{ transformOrigin: "50% 50%" }} />
                    </svg>
                  )}
                </span>
                <span>
                  <span className="block text-[15px] font-bold tracking-[-0.01em] text-ink">
                    {String(i + 1).padStart(2, "0")} · {s.t}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-sub">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          {/* 尾部批注 */}
          <p className="mtag mt-6 text-[9.5px] text-rust">◌ 复制文本粘贴,或在账单页截长图上传 —— 两条路都在本机识别</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- B FAQ:批注式(问题印刷体 / 答案红色等宽) ---------- */
function FaqBody() {
  return (
    <div className="space-y-1">
      {FAQS.map((f, i) => (
        <div key={f.q} className="grid gap-x-10 gap-y-2 border-b border-ink/10 py-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <p className="text-[15.5px] font-extrabold tracking-[-0.015em] text-ink">
            <span className="mtag mr-3 text-[9.5px] text-rust">Q{i + 1}</span>
            {f.q}
          </p>
          <p className="text-[12.5px] leading-[1.9] text-rust/90" style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}>
            A · {f.a}
          </p>
        </div>
      ))}
      <p className="mtag pt-4 text-[9.5px] text-sub/60">以上问题全部直答,不折叠。</p>
    </div>
  );
}

/* ---------- C 隐私承诺:红色警示便签 ---------- */
function PrivacyBody() {
  return (
    <div className="relative mx-auto max-w-[560px]">
      {/* 便签本 */}
      <div className="relative">
        <div className="paper-lift relative border border-rust bg-rust px-6 py-8 sm:px-8 sm:py-10">
          {/* 胶带两角 */}
          <span aria-hidden className="tape -top-2 left-1/2 -translate-x-1/2 rotate-[-3deg]" />
          <span aria-hidden className="tape -bottom-2 left-1/2 -translate-x-1/2 rotate-[2.5deg]" />
          <p className="mtag mtag-lg text-[10px] text-paper/80">⚠ PRIVACY · 隐私承诺</p>
          <p className="mt-5 text-[15px] font-bold leading-[1.8] tracking-[-0.01em] text-paper">
            你的账单文件从未离开浏览器。所有解析在本地完成,服务端不接收任何原始文件。
            报告仅存储于当前会话,关闭页面即销毁;你可以随时手动清除所有数据。
          </p>
          <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-paper/30 pt-6 lg:grid-cols-4">
            {COMMITS.map((c) => (
              <p key={c.k} className="flex items-baseline gap-2 text-[12.5px] font-semibold text-paper">
                <svg width="11" height="9" viewBox="0 0 13 11" aria-hidden fill="none" className="shrink-0 text-paper">
                  <path d="M1 5.5 L4.5 9 L12 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {c.v}
              </p>
            ))}
          </div>
        </div>
        {/* 便签底:轻微偏移的纸页(厚度) */}
        <div aria-hidden className="absolute inset-x-2 -bottom-1.5 top-3 border border-rust/25 bg-rust/10" />
      </div>
      <p className="mt-6 text-center">
        <span className="mtag text-[9.5px] text-sub/70">无追踪 · 无画像 · 无服务端存储</span>
      </p>
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-sub">
        <ArrowDown size={12} strokeWidth={1.5} aria-hidden /> 回首页继续
      </p>
    </div>
  );
}
