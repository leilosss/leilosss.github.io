// =============================================================
// 会话存储适配层(v12):接口保持 v9 不变,底层 = sec-store vault
// (localStorage AES-GCM 加密 · 7 天;见 sec-store.ts)。
// 新增 ensureReady() —— 页面加载后 await,保证首次同步读非空。
// =============================================================
import { vault } from "./sec-store";
import type { DetectResult } from "./types";

let initPromise: Promise<void> | null = null;

/** 启动加密仓库(幂等;HeaderNav/报告页在首次读取前 await) */
export function ensureReady(): Promise<void> {
  if (!initPromise) initPromise = vaultInitSafe();
  return initPromise;
}

async function vaultInitSafe(): Promise<void> {
  /* 动态 import 防循环;vaultInit 本身幂等 */
  const { vaultInit } = await import("./sec-store");
  await vaultInit();
}

/** 生成简短报告 id(时间基 36) */
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const reportsStore = {
  save(report: DetectResult): string {
    const id = genId();
    vault.setReport(id, report);
    return id;
  },
  get(id: string): DetectResult | null {
    return vault.reports()[id]?.report ?? null;
  },
  latestId(): string | null {
    const all = vault.reports();
    const ids = Object.keys(all).sort((a, b) => (all[b].createdAt < all[a].createdAt ? -1 : 1));
    return ids[0] ?? null;
  },
  clearAll() {
    vault.clear();
  },
};

export const decisionStore = {
  getMap(reportId: string): Record<string, "cut" | "keep"> {
    return vault.decisions(reportId);
  },
  set(reportId: string, subId: number | string, d: "cut" | "keep") {
    vault.setDecision(reportId, subId, d);
  },
  remove(reportId: string) {
    vault.removeDecisions(reportId);
  },
};
