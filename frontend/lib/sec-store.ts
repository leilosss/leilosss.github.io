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
const KEY_MATERIAL = "trim-vault-v12-key"; // 密钥物料(与密文同存本机,见下方安全边界注释)
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
  // 密钥须落盘复用(而非每次页面加载随机生成),否则跨页跳转(静态导出下 /upload → /report
  // 是整页刷新,JS 模块重新执行)会用新随机密钥解旧密文,导致刚生成的报告"读不出来"。
  const stored = localStorage.getItem(KEY_MATERIAL);
  const raw = stored ? unb64(stored) : crypto.getRandomValues(new Uint8Array(32));
  if (!stored) localStorage.setItem(KEY_MATERIAL, b64(raw));
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
    // IV = 12 字节(AES-GCM 推荐长度)→ base64 恰好 16 字符,与写入时 b64(iv) 长度一致
    const iv = unb64(data.payload.slice(0, 16));
    const ct = unb64(data.payload.slice(16));
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
