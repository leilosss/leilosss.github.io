// =============================================================
// 与后端 models.py 一一对应的共享类型(修改时两端同步)
// =============================================================

export type Platform = "alipay" | "wechat";
export type Direction = "in" | "out" | "unknown";
export type PeriodType = "monthly" | "quarterly" | "yearly" | "unknown";
export type SourceType = "keyword" | "periodic" | "both";
export type Confidence = "high" | "medium" | "low";

/** 统一的结构化账单行 */
export interface BillRow {
  platform: Platform;
  time: string;            // YYYY-MM-DD HH:MM:SS
  counterparty: string;    // 交易对方
  item: string;            // 商品说明
  category: string;        // 原始交易分类/类型
  direction: Direction;
  amount: number;          // 金额(元)
}

/** /api/parse/* 响应 */
export interface ParseResult {
  ok: boolean;
  platform: Platform;
  total: number;
  dropped: number;
  warnings: string[];
  rows: BillRow[];
}

/** 识别出的单条订阅 */
export interface Subscription {
  id: number;
  name: string;
  merchant: string;
  source: SourceType;
  period: PeriodType;
  amount: number;
  annual_amount: number | null;
  occurrences: number;
  first_at: string;
  last_at: string;
  median_gap_days: number | null;
  /** 关键词覆盖层标注的图标(数据随报告下发;UI 按设计语言决定是否展示) */
  icon?: string;
  confidence: Confidence;
  category: string;
  sample_text: string;
  /** v2.0 裁剪理由标签(UNUSED / DUPLICATE / HIGH COST / ACTIVE …);由本地引擎或示例数据给出 */
  reason?: string;
  /** v2.0 使用情况一句话(如「90 天未打开」);仅本地推断或示例,不做虚假断言 */
  usage?: string;
  /** v2.0 价格监测:上一次已知单价(检测到涨价时存在) */
  prev_amount?: number;
}

export interface MonthPoint {
  month: string; // YYYY-MM
  out: number;
  sub: number;
}

export interface CategoryStat {
  category: string;
  annual: number;
  count: number;
}

export interface Summary {
  tx_count: number;
  out_total: number;
  in_total: number;
  date_start: string;
  date_end: string;
  sub_count: number;
  annual_total: number;
}

/** /api/detect 响应(基础报告) */
export interface DetectResult {
  ok: boolean;
  generated_at: string;
  /** 本地识别扩展字段:账单来源平台(「去取消」指引用;后端响应无此字段) */
  platform?: string;
  summary: Summary;
  subscriptions: Subscription[];
  months: MonthPoint[];
  categories: CategoryStat[];
}
