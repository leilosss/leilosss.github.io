// =============================================================
// DealsCountdown —— 大促倒计时
// 天数按本机日期实时算(静态导出无法在构建期知道访问当天的日期,
// 写死一个「61 天」隔天就是错的数字)。首帧先渲染不含天数的文字,
// 挂载后再补数字,避免水合不一致。
// =============================================================
"use client";

import * as React from "react";

const MIDNIGHT = 86400000;

/** 距下一个 11-11 的整天数(按本地日历日算,不涉及时区换算) */
function daysToPromo(now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let target = new Date(now.getFullYear(), 10, 11).getTime(); // 11 月 11 日
  if (target < today) target = new Date(now.getFullYear() + 1, 10, 11).getTime();
  return Math.round((target - today) / MIDNIGHT);
}

export function DealsCountdown() {
  const [days, setDays] = React.useState<number | null>(null);

  React.useEffect(() => {
    setDays(daysToPromo(new Date()));
  }, []);

  // 只返回前半句(不带标点),标点由调用方紧贴拼接,避免中文排版里多出空格
  if (days === null) return <span>双11倒计时</span>;
  if (days === 0) return <span>双11 就是今天</span>;
  return (
    <span>
      双11 倒计时 <span className="num">{days}</span> 天
    </span>
  );
}
