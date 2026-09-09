// =============================================================
// receipt —— 裁剪小票生成器(v12 · P2)
// 竖版牛皮纸小票(canvas 2D 本地绘制,零上传):
//   打孔纸边 / TRIM 裁切凭证 / 明细行 / 汇总(年省)/ 红色方章「已裁 N 项」。
// 输出:dataURL(...PNG)可下载;支持写剪贴板(ClipboardItem)。
// 字体:系统 mono + sans(CJK 用系统栈),与站点语言一致。
// =============================================================
import type { DetectResult } from "./types";
import { fmtCNY } from "./utils";

const PAPER = "#F2EDE4";
const INK = "#1A1A1A";
const RED = "#D63B2F";
const SUB = "#6E6861";

/** 生成小票 dataURL;宽 460,高度随行数 */
export function renderReceipt(report: DetectResult, decisions: Record<string, "cut" | "keep">): string {
  const cut = report.subscriptions.filter((s) => decisions[String(s.id)] === "cut");
  const keep = report.subscriptions.filter((s) => decisions[String(s.id)] !== "cut");
  const cutAnnual = cut.reduce((n, s) => n + (s.annual_amount ?? 0), 0);
  const W = 460;
  const rowH = 34;
  const headH = 150;
  const sumH = 118;
  const footH = 96;
  const H = headH + cut.length * rowH + sumH + footH;

  const c = document.createElement("canvas");
  c.width = W * 2; // 2x 高清
  c.height = H * 2;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  const g = c.getContext("2d")!;
  g.scale(2, 2);

  /* 纸底 + 纤维(极淡噪点横纹) */
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.05;
  g.fillStyle = INK;
  for (let y = 6; y < H; y += 9) g.fillRect(0, y, W, 1);
  g.globalAlpha = 1;

  /* 打孔纸边(左右) */
  g.fillStyle = PAPER;
  for (let y = 14; y < H; y += 26) {
    g.beginPath();
    g.arc(9, y, 4.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(W - 9, y, 4.5, 0, Math.PI * 2);
    g.fill();
  }

  const mono = 'ui-monospace, Consolas, "Cascadia Mono", monospace';
  const sans = '"Microsoft YaHei", "PingFang SC", sans-serif';

  g.fillStyle = INK;
  g.textBaseline = "middle";

  /* 头部 */
  g.font = `600 30px ${mono}`;
  g.fillText("TRIM", 34, 42);
  g.font = `400 13px ${mono}`;
  g.fillStyle = SUB;
  g.fillText("BILL TRIMMING RECEIPT", 34, 68);
  g.fillStyle = INK;
  g.font = `600 17px ${sans}`;
  g.fillText("裁剪凭证", 34, 96);
  g.font = `400 12px ${mono}`;
  g.fillStyle = SUB;
  g.fillText(`ISSUED ${report.generated_at.slice(0, 16).replace("T", " ")}`, 34, 118);
  g.font = `400 11px ${mono}`;
  g.fillText(`${report.summary.sub_count} SUBS DETECTED · LOCAL ONLY`, 34, 136);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(20, 148);
  g.lineTo(W - 20, 148);
  g.stroke();

  /* 明细(cut 行) */
  let y = headH + 18;
  g.font = `400 12.5px ${sans}`;
  cut.forEach((s, i) => {
    g.fillStyle = INK;
    g.fillText(s.name.slice(0, 16), 34, y);
    g.fillStyle = RED;
    g.strokeStyle = RED;
    g.lineWidth = 1.4;
    const tw = g.measureText(s.name.slice(0, 16)).width;
    g.beginPath();
    g.moveTo(32, y + 1);
    g.lineTo(32 + tw + 6, y + 1);
    g.stroke();
    g.font = `400 12px ${mono}`;
    g.fillStyle = INK;
    const amt = `${fmtCNY(s.amount)}/${s.period === "monthly" ? "月" : s.period === "yearly" ? "年" : "期"}`;
    g.fillText(amt, W - 34 - g.measureText(amt).width, y);
    g.font = `400 12.5px ${sans}`;
    y += rowH;
    void i;
  });
  if (cut.length === 0) {
    g.fillStyle = SUB;
    g.fillText("(无可裁剪项)", 34, y);
    y += rowH;
  }

  /* 汇总 */
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(20, y - 6);
  g.lineTo(W - 20, y - 6);
  g.stroke();
  y += 26;
  g.font = `400 12px ${mono}`;
  g.fillStyle = SUB;
  g.fillText(`CUT ${cut.length} · KEEP ${keep.length}`, 34, y);
  y += 26;
  g.font = `600 24px ${mono}`;
  g.fillStyle = INK;
  g.fillText(`¥${cutAnnual.toFixed(2)}`, 34, y + 2);
  g.fillStyle = RED;
  g.font = `400 12px ${mono}`;
  g.fillText("SAVED / YEAR", 34 + g.measureText(`¥${cutAnnual.toFixed(2)}`).width + 14, y + 2);
  y += 30;

  /* 红方章(已裁 N 项) */
  const stW = 108;
  const stY = y + 4;
  g.strokeStyle = RED;
  g.lineWidth = 2;
  g.strokeRect(34, stY, stW, 44);
  g.strokeStyle = RED;
  g.lineWidth = 1;
  g.strokeRect(39, stY + 5, stW - 10, 34);
  g.fillStyle = RED;
  g.font = `600 15px ${sans}`;
  g.fillText(`已裁 ${cut.length} 项`, 92, stY + 22 + 1);
  g.font = `400 9px ${mono}`;
  g.fillText("TRIM · LOCAL", 92, stY + 36 + 1);

  /* 脚注 */
  g.fillStyle = SUB;
  g.font = `400 10.5px ${mono}`;
  g.fillText("GENERATED LOCALLY · NEVER LEAVES THIS DEVICE", 34, H - 34);
  g.fillStyle = RED;
  g.fillText("⚠ 本地暂存 7 天,可手动销毁", 34, H - 18);

  return c.toDataURL("image/png");
}

/** 下载小票 PNG */
export function downloadReceipt(report: DetectResult, decisions: Record<string, "cut" | "keep">): void {
  const url = renderReceipt(report, decisions);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trim-receipt-${report.generated_at.slice(0, 10)}.png`;
  a.click();
}

/** 复制小票图片到剪贴板(Safari 系可能拒绝 → 返回 false,调用方提示下载) */
export async function copyReceipt(report: DetectResult, decisions: Record<string, "cut" | "keep">): Promise<boolean> {
  try {
    const blob = await (await fetch(renderReceipt(report, decisions))).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
