// =============================================================
// watch-store —— 价格监控记录的本机存储(加密,长期保留)
//
// 与报告 vault 的区别(刻意分开):
//   报告 vault:7 天过期 —— 一份账单的结果,过期就过期。
//   价格记录:保存 400 天 —— 价格监控要跨月对比才有意义,7 天等于没有。
// 二者用同一把本机密钥(AES-GCM),只是有效期不同;明文不落盘,
// 「销毁本机数据」时一并清空(见报告页 DESTROY)。
//
// 记录的是"我见过这个订阅哪几个价格",不是"这个订阅现在多少钱"——
// 后者需要联网核对官方价目,本机做不到,页面文案里也如实这么写。
// =============================================================
import { itemFromSubscription, mergeItem, signalsOf, type PriceSignal, type WatchItem } from "./price-watch";
import { openJSON, sealJSON } from "./sec-store";
import type { DetectResult } from "./types";

const KEY = "trim-watch-v1";
/** 保留天数:够跨年对比,又不至于无限期留着 */
export const WATCH_KEEP_DAYS = 400;

interface WatchFile {
  updatedAt: string;
  items: WatchItem[];
}

let mem: WatchItem[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writePromise: Promise<void> = Promise.resolve();

function scheduleWrite(): void {
  if (typeof window === "undefined") return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    writePromise = (async () => {
      try {
        const file: WatchFile = { updatedAt: new Date().toISOString(), items: mem };
        localStorage.setItem(KEY, await sealJSON(file));
      } catch {
        /* 隐私模式等:静默降级(内存继续工作,仅不持久) */
      }
    })();
  }, 400);
}

/** 载入(幂等;必须在读取前 await 一次) */
export function watchReady(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const file = await openJSON<WatchFile>(raw);
        if (file?.items?.length) {
          const age = Date.now() - new Date(file.updatedAt).getTime();
          if (age <= WATCH_KEEP_DAYS * 86400000) mem = file.items;
          else localStorage.removeItem(KEY); // 过期:当作没有记录
        }
      }
    } catch {
      mem = [];
    }
    loaded = true;
  })();
  return loadPromise;
}

export const watchStore = {
  /** 已载入的条目(同步;读取前先 await watchReady()) */
  items(): WatchItem[] {
    return loaded ? mem : [];
  },

  /**
   * 记一份报告的价格,返回**合并后**的全部信号。
   * 每次导入账单都会调用:同一个订阅出现第二次时,涨价/降价才会浮现出来。
   */
  recordReport(report: DetectResult): PriceSignal[] {
    const at = (report.generated_at ?? new Date().toISOString()).slice(0, 10);
    for (const sub of report.subscriptions) {
      if (!(sub.amount > 0)) continue;
      const item = itemFromSubscription(sub, sub.last_at || at);
      mem = mergeItem(mem, item);
    }
    if (typeof window !== "undefined") scheduleWrite();
    return signalsOf(mem);
  },

  /** 当前全部信号(不新增记录) */
  signals(): PriceSignal[] {
    return signalsOf(mem);
  },

  /** 清空价格记录(与报告 vault 的 DESTROY 并列的一条出口) */
  async clear(): Promise<void> {
    mem = [];
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    await writePromise;
  },
};
