// =============================================================
// TipJar —— 打赏区(价格情报页下半)
// 参考 Buy Me a Coffee 的轻量读法:不摆价格表,先让人选"心意"再出码。
// 档位刻意不写金额,金额由扫码后自己填(与"心意不分多少"一致)。
// 收款码 = public/tip/{wechat,alipay}.png(2026-09-11 换成真实码)。
// 换码:把新截图丢给根目录 crop-qr.ps1(按暗像素包围盒裁出二维码本体 + 4% 静区),
// 输出直接盖掉这两个文件即可;改完用 check-qr.js 解码验证一次,别只看"图能显示"。
// =============================================================
"use client";

import * as React from "react";
import { Coffee, CupSoda, Sparkles } from "lucide-react";

// 档位图标用线段图标而非 emoji:🧋 在 Windows 上没有字形,会渲染成空心方块;
// 且全站设计纪律本就是「仅 lucide 与自绘 svg,不用 emoji 图形」。
const TIERS = [
  { id: "coffee", Icon: Coffee, label: "咖啡" },
  { id: "tea", Icon: CupSoda, label: "奶茶" },
  { id: "any", Icon: Sparkles, label: "随意来点" },
];

const PAY = ["微信", "支付宝"] as const;

export function TipJar() {
  const [tier, setTier] = React.useState("tea"); // 默认选中奶茶(与设计稿一致)
  const [pay, setPay] = React.useState<(typeof PAY)[number]>("微信");
  const groupId = React.useId();

  return (
    <div className="border border-ink">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        {/* ---------- 左:心意档位 ---------- */}
        <div className="border-b border-ink px-5 py-7 sm:px-7 sm:py-8 lg:border-b-0 lg:border-r">
          <div role="radiogroup" aria-labelledby={`${groupId}-legend`} className="space-y-3">
            <p id={`${groupId}-legend`} className="mtag text-[9px] text-sub">
              心意档位 · 金额扫码后自己填
            </p>
            {TIERS.map((t) => {
              const on = tier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTier(t.id)}
                  className={`flex w-full items-center gap-4 border px-4 py-4 text-left transition-colors sm:px-5 ${
                    on ? "border-rust bg-rust/[0.055]" : "border-ink bg-paper hover:bg-paperDeep/60"
                  }`}
                >
                  <t.Icon
                    size={19}
                    strokeWidth={1.6}
                    aria-hidden
                    className={`shrink-0 ${on ? "text-rust" : "text-ink/80"}`}
                  />
                  <span className={`text-[16px] font-bold tracking-[-0.015em] ${on ? "text-rust" : "text-ink"}`}>
                    {t.label}
                  </span>
                  {on && <span className="mtag ml-auto text-[8.5px] text-rust">已选</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-ink/20 pt-4">
            <p className="text-[13.5px] leading-relaxed text-sub">每一份支持都在帮 Trim 走得更远。</p>
            <p className="mtag mt-2 text-[9px] text-sub/80">扫码后可输入任意金额</p>
          </div>
        </div>

        {/* ---------- 右:收款码 ---------- */}
        <div className="flex flex-col px-5 py-7 sm:px-7 sm:py-8">
          <div className="mtag flex text-[9.5px]" role="tablist" aria-label="收款方式">
            {PAY.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pay === p}
                onClick={() => setPay(p)}
                className={`flex-1 border border-ink py-2.5 transition-colors ${
                  pay === p ? "bg-ink text-paper" : "text-ink hover:bg-paperDeep/60"
                } ${p === "支付宝" ? "border-l-0" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* 收款码:1px 黑框 + 白底方图(白底是二维码本身,不参与纸面配色 —— 扫描优先) */}
          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[248px] border border-ink bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pay === "微信" ? "/tip/wechat.png" : "/tip/alipay.png"}
              alt={`${pay}收款码`}
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>

          <p className="mtag mt-4 text-center text-[9.5px] text-sub">长按识别 / 截图扫码</p>
        </div>
      </div>
    </div>
  );
}
