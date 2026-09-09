# =============================================================
# 订阅扫雷器 · 数据契约(Pydantic v2)
# 前端 TypeScript 侧镜像类型见 frontend/lib/types.ts,两处必须保持一致。
# 隐私设计:服务端只接收"已解析的结构化账单行(JSON)",不接收原始文件;
# 账单文件只在用户浏览器内解析,后端处理完立即出栈释放,绝不写磁盘。
# =============================================================
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

# ---- 基础枚举 ----
Platform = Literal["alipay", "wechat"]           # 账单平台
Direction = Literal["in", "out", "unknown"]      # 资金方向:收入/支出/不计收支
PeriodType = Literal["monthly", "quarterly", "yearly", "unknown"]  # 扣费周期
SourceType = Literal["keyword", "periodic", "both"]                # 命中策略
Confidence = Literal["high", "medium", "low"]    # 识别置信度


class BillRow(BaseModel):
    """统一的结构化账单行 —— 全链路的最小数据单元"""
    platform: Platform = "alipay"
    time: str = ""                 # 交易时间,形如 2026-01-05 14:23:11
    counterparty: str = ""         # 交易对方
    item: str = ""                 # 商品说明
    category: str = ""             # 原始"交易分类/类型"列
    direction: Direction = "unknown"
    amount: float = 0.0            # 金额(元),恒为正;收支方向由 direction 表达

    @field_validator("amount")
    @classmethod
    def _amount_normalize(cls, v: float) -> float:
        # 金额统一取绝对值并保留两位小数,避免 -/¥ 等符号残留
        try:
            return round(abs(float(v)), 2)
        except (TypeError, ValueError):
            return 0.0

    @field_validator("time")
    @classmethod
    def _time_normalize(cls, v: str) -> str:
        # 空值或无法识别的交易时间在解析阶段已被剔除;此处仅做清洗兜底
        return (v or "").strip()[:19]

    @field_validator("counterparty", "item", "category")
    @classmethod
    def _text_normalize(cls, v: str) -> str:
        return (v or "").strip()


# ---- 解析接口入参/出参 ----
class ParseIn(BaseModel):
    """/parse/{platform} 入参
    - rows   :【隐私默认路径】浏览器本地解析完成后的结构化行(前端唯一用法)
    - base64 :可选。原始文件字节,仅用于 curl/脚本自测等自动化场景,前端永不发送
    """
    rows: Optional[List[BillRow]] = None
    base64: Optional[str] = None
    file_name: str = ""


class ParseResult(BaseModel):
    """解析结果:规范化后的账单行 + 丢弃统计 + 警告信息"""
    ok: bool = True
    platform: Platform
    total: int = 0
    dropped: int = 0
    warnings: List[str] = []
    rows: List[BillRow] = []


# ---- 识别接口 ----
class DetectIn(BaseModel):
    rows: List[BillRow] = Field(..., description="解析后的账单行(必填,不允许为空列表)")


class Subscription(BaseModel):
    """识别出的单条订阅/周期性扣费"""
    id: int
    name: str                # 订阅名称(关键词命中则用内置库名称,否则用商户名)
    merchant: str = ""       # 实际扣费商户(交易对方)
    source: SourceType       # keyword=关键词 / periodic=周期规律 / both=两者
    period: PeriodType = "unknown"
    amount: float            # 单次扣费金额(元)
    annual_amount: Optional[float] = None  # 年化扣费;周期不明确时可能为空
    occurrences: int         # 命中的扣费次数
    first_at: str            # 首次发现时间
    last_at: str             # 最近扣费时间
    median_gap_days: Optional[int] = None  # 相邻扣费间隔中位数(天)
    icon: str = ""              # 关键词覆盖层标注的图标(emoji 数据,前端按需展示)
    confidence: Confidence
    category: str = "其他"    # 品类(用于占比图)
    sample_text: str = ""    # 触发命中的原文片段(便于人工复核)


class MonthPoint(BaseModel):
    """月度支出趋势点"""
    month: str               # YYYY-MM
    out: float               # 该月总支出
    sub: float               # 该月订阅支出


class CategoryStat(BaseModel):
    """品类占比统计"""
    category: str
    annual: float            # 该品类订阅年化合计
    count: int               # 该品类订阅条数


class Summary(BaseModel):
    """报告摘要"""
    tx_count: int = 0
    out_total: float = 0.0
    in_total: float = 0.0
    date_start: str = ""
    date_end: str = ""
    sub_count: int = 0
    annual_total: float = 0.0   # 识别出订阅的年化合计(≈ 取消后一年可省)


class DetectResult(BaseModel):
    """识别报告(基础版)"""
    ok: bool = True
    generated_at: str = ""
    summary: Summary = Summary()
    subscriptions: List[Subscription] = []
    months: List[MonthPoint] = []        # 月度支出趋势(ECharts 折线)
    categories: List[CategoryStat] = []  # 订阅品类占比(ECharts 饼图)
