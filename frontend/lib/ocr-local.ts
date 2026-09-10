// =============================================================
// ocr-local —— 浏览器本地 OCR(PaddleOCR,模型自托管)
//
// 隐私硬约束(与全站一致):图片只在本机解码,识别全程在浏览器里完成,
// **不发起任何数据上传**。推理脚本与模型都取自本站同源静态资源
// (/ocr/ocr.js、/ocr/det、/ocr/rec),不请求任何第三方域名 —— 这也是
// 模型自托管而非用 CDN 的原因:让"本地分析"是结构上成立的,不是一个说法。
//
// 长图处理:手机账单截图往往是一张 1080×4000+ 的长图。整张丢给检测模型会被
// 压到 960×960,字变得极小、识别率骤降。因此这里把长图**按正方形切片**
// (相邻片留重叠,避免把一行字切成两半)逐片识别,再按绝对坐标拼回阅读顺序。
// 切片同时避免了超大 canvas 在 iOS 上的尺寸上限问题。
// =============================================================
import { MAX_FILE_SIZE } from "./validation";

/** PaddleOCR UMD 暴露的全局对象 */
interface PaddleOcr {
  init(detPath?: string, recPath?: string): Promise<void>;
  recognize(img: HTMLImageElement): Promise<{ text: string[]; points: number[][][] }>;
}
declare global {
  interface Window {
    paddlejs?: { ocr?: PaddleOcr };
  }
}

const SCRIPT_SRC = "/ocr/ocr.js";
const DET_MODEL = "/ocr/det/model.json";
const REC_MODEL = "/ocr/rec/model.json";

/** 每片的目标边长(接近检测模型 960 的输入,缩放损失最小) */
const TILE = 1280;
/** 相邻切片重叠比例(防止把一行字切两半) */
const OVERLAP = 0.12;
/** 超过这个高宽比才切片(普通截图/照片单次即可) */
const TILE_TRIGGER = 1.6;

export type OcrPhase = "loading" | "recognizing";

export interface OcrProgress {
  phase: OcrPhase;
  /** 0–1;recognizing 阶段按切片推进 */
  ratio: number;
  /** 当前第几片 / 共几片(单片时为 1/1) */
  tile?: { index: number; total: number };
}

/** 带绝对坐标的一行识别结果(坐标已换算回整张图) */
interface OcrLine {
  text: string;
  y: number;
  x: number;
  h: number;
}

let scriptPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;

/** 注入 /ocr/ocr.js(只注一次) */
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("OCR 只能在浏览器中运行"));
  if (window.paddlejs?.ocr) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null; // 允许重试
      reject(new Error("识别组件加载失败,请检查网络后重试"));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * 初始化识别引擎(下载并加载模型,首次约 11MB)。
 * 幂等:同一会话内重复调用只初始化一次。模型走浏览器 HTTP 缓存,
 * 再次访问只需 304 校验,不会重复下载。
 */
export function initOcr(onProgress?: (p: OcrProgress) => void): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    onProgress?.({ phase: "loading", ratio: 0 });
    await loadScript();
    const ocr = window.paddlejs?.ocr;
    if (!ocr) throw new Error("识别组件未就绪,请刷新页面重试");
    await ocr.init(DET_MODEL, REC_MODEL);
    onProgress?.({ phase: "loading", ratio: 1 });
  })().catch((e) => {
    initPromise = null; // 失败允许重试
    throw e;
  });
  return initPromise;
}

/** File → <img>(识别模型只认 <img>,直接喂 canvas 检测不到文本框) */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败,请换一张截图试试"));
    };
    img.src = url;
  });
}

/** 把原图的一块画到 canvas,再转成 <img> 交给识别 */
function sliceToImage(src: HTMLImageElement, y0: number, h: number): Promise<HTMLImageElement> {
  const c = document.createElement("canvas");
  c.width = src.naturalWidth;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("当前浏览器不支持图片处理");
  g.drawImage(src, 0, y0, src.naturalWidth, h, 0, 0, src.naturalWidth, h);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片分段失败,请换一张截图试试"));
    img.src = c.toDataURL("image/png");
  });
}

/** 一行文本的包围盒 → 绝对坐标(切片坐标 + 该片在图中的偏移) */
function toLine(text: string, poly: number[][] | undefined, offsetY: number): OcrLine | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  if (!poly || poly.length < 4) return { text: t, y: offsetY, x: 0, h: 1 };
  const ys = poly.map((p) => p[1]);
  const xs = poly.map((p) => p[0]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return { text: t, y: offsetY + (top + bottom) / 2, x: Math.min(...xs), h: Math.max(bottom - top, 1) };
}

/**
 * 按阅读顺序排序:先按纵向分行(高度接近的算同一行),行内再按横向。
 * OCR 返回的顺序不保证是视觉顺序,而账单解析依赖"金额的上下方是商户/日期"。
 */
function sortReadingOrder(lines: OcrLine[]): string[] {
  if (!lines.length) return [];
  const heights = lines.map((l) => l.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 1;
  const tol = medianH * 0.6;
  return [...lines]
    .sort((a, b) => (Math.abs(a.y - b.y) <= tol ? a.x - b.x : a.y - b.y))
    .map((l) => l.text);
}

/** 单个切片:识别 → 绝对坐标行 */
async function recognizeTile(img: HTMLImageElement, offsetY: number, coverUntil: number): Promise<OcrLine[]> {
  const ocr = window.paddlejs!.ocr!;
  const res = await ocr.recognize(img);
  const out: OcrLine[] = [];
  const texts = res?.text ?? [];
  for (let i = 0; i < texts.length; i++) {
    const line = toLine(texts[i], res?.points?.[i], offsetY);
    if (!line) continue;
    // 重叠区去重:每片只负责 [起点, 覆盖终点) 的行,避免同一行被识别两次
    if (line.y >= coverUntil) continue;
    out.push(line);
  }
  return out;
}

/**
 * 识别一张账单截图 → 按阅读顺序排列的文本行。
 * 长图自动切片;每片识别完回调进度,便于 UI 显示"第 n / 共 m 段"。
 */
export async function recognizeImage(file: File, onProgress?: (p: OcrProgress) => void): Promise<string[]> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("图片超过 10MB 上限,请压缩后再试");
  }
  await initOcr(onProgress);

  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H) throw new Error("图片读取失败,请换一张截图试试");

  // 纵向切片计划:每片高度 ≈ 图宽(接近正方形),相邻留重叠
  const tileH = Math.min(TILE, W);
  const overlapPx = Math.round(tileH * OVERLAP);
  const step = Math.max(tileH - overlapPx, 1);
  const tiles: { y0: number; h: number }[] = [];
  if (H <= W * TILE_TRIGGER) {
    tiles.push({ y0: 0, h: H });
  } else {
    for (let y0 = 0; y0 < H; y0 += step) {
      const h = Math.min(tileH, H - y0);
      tiles.push({ y0, h });
      if (y0 + h >= H) break;
    }
  }

  const collected: OcrLine[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const { y0, h } = tiles[i];
    onProgress?.({ phase: "recognizing", ratio: i / tiles.length, tile: { index: i + 1, total: tiles.length } });
    // 单片无需再切;多片时用下一片的起点作为本片的"负责终点"
    const coverUntil = i === tiles.length - 1 ? Infinity : tiles[i + 1].y0;
    const target = tiles.length === 1 ? img : await sliceToImage(img, y0, h);
    collected.push(...(await recognizeTile(target, y0, coverUntil)));
  }
  onProgress?.({ phase: "recognizing", ratio: 1, tile: { index: tiles.length, total: tiles.length } });

  return sortReadingOrder(collected);
}
