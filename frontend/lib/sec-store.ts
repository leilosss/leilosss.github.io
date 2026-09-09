// =============================================================
// sec-store —— 本地加密暂存(vault,v12)
// 隐私升级:sessionStorage → **localStorage 加密暂存(7 天)**,
// WebCrypto AES-GCM(256)整体加密;密钥与密文同存本机 —— 前端安全的
// 边界如实声明:加密用于防明文直读与防无聊窥视,本机数据只受浏览器
// 与登录用户保护;7 天过期自动清除,「销毁章」一键清空。
// 同步读接口(内存副本)+ 异步初始化解密 + 防抖写回(全量单键)。
// =============================================================
import type { DetectResult } from "./types";

export type TrimDecision = "cut" | "keep";

const KEY = "trim-vault-v12";
const TTL_MS = 7 * 24 * 3600 * 1000; // 7 天

interface VaultData {
  createdAt: string;
  payload: string; // AES-GCM: base64(iv + ciphertext)
}

interface VaultShape {
  reports: Record<string, { createdAt: string; report: DetectResult }>;
  decisions: Record<string, Record<string, TrimDecision>>;
}

let mem: VaultShape = { reports: {}, decisions: {} };
let ready = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let keyCache: CryptoKey | null = null;

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  if (keyCache) return keyCache;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  keyCache = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return keyCache;
}

/** 启动解密(幂等);失败(损坏/过期)= 清空重来 */
export async function vaultInit(): Promise<void> {
  if (ready) return;
  ready = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as VaultData;
    if (Date.now() - new Date(data.createdAt).getTime() > TTL_MS) {
      localStorage.removeItem(KEY);
      return;
    }
    const iv = unb64(data.payload.slice(0, 24));
    const ct = unb64(data.payload.slice(24));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await getKey(), ct.buffer as ArrayBuffer);
    mem = JSON.parse(new TextDecoder().decode(plain)) as VaultShape;
  } catch {
    mem = { reports: {}, decisions: {} };
    localStorage.removeItem(KEY);
  }
}

function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 400);
}

async function flush(): Promise<void> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getKey(), new TextEncoder().encode(JSON.stringify(mem)));
    const payload = b64(iv) + b64(new Uint8Array(ct));
    const data: VaultData = { createdAt: new Date().toISOString(), payload };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 隐私模式等:静默降级(内存继续工作,仅不持久) */
  }
}

/* ---------- 同步接口(内存副本;初始化前读写 = 空,调用方 await vaultInit) ---------- */
export const vault = {
  reports(): Record<string, { createdAt: string; report: DetectResult }> {
    return mem.reports;
  },
  setReport(id: string, report: DetectResult): void {
    mem.reports[id] = { createdAt: new Date().toISOString(), report };
    // 只保留最近 3 份(与 v9 一致)
    const ids = Object.keys(mem.reports).sort((a, b) => (mem.reports[b].createdAt < mem.reports[a].createdAt ? -1 : 1));
    for (const old of ids.slice(3)) delete mem.reports[old];
    scheduleWrite();
  },
  decisions(reportId: string): Record<string, TrimDecision> {
    return mem.decisions[reportId] ?? {};
  },
  setDecision(reportId: string, subId: number | string, d: TrimDecision): void {
    const m = mem.decisions[reportId] ?? (mem.decisions[reportId] = {});
    m[String(subId)] = d;
    scheduleWrite();
  },
  removeDecisions(reportId: string): void {
    delete mem.decisions[reportId];
    scheduleWrite();
  },
  clear(): void {
    mem = { reports: {}, decisions: {} };
    localStorage.removeItem(KEY);
    scheduleWrite();
  },
};
