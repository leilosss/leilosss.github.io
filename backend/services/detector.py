# =============================================================
# 订阅识别引擎(核心)
# 双策略:
#   1) 关键词策略  —— 用内置关键词库(services/keywords.py)匹配交易对方/商品说明
#   2) 周期规律策略 —— 同一商户 + 相同金额反复扣费,按相邻间隔中位数归入
#                       月 / 季 / 年 周期
# 输出:订阅清单(名称/金额/周期/首末时间/置信度)+ 月度趋势 + 品类占比,
#       并汇总「若取消订阅一年可节省多少元」。
# 全部计算在请求内存中完成,不写磁盘、不落日志,响应即弃。
# =============================================================
from __future__ import annotations

import re
import statistics
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pandas as pd

from models import BillRow
from services.keyword_overlay import match_overlay
from services.keywords import KEYWORD_RULES, Rule

# 覆盖层「type 标签 → 周期枚举」(仅作 hint,真实间隔窗口优先)
_TYPE_TO_PERIOD = {"月度": "monthly", "季度": "quarterly", "年度": "yearly"}

# 周期判定窗口(相邻扣费间隔中位数,单位:天)
PERIOD_WINDOWS: List[Tuple[str, int, int]] = [
    ("yearly", 320, 400),     # 年付
    ("quarterly", 85, 110),   # 季付
    ("monthly", 24, 36),      # 月付
]
# 商品说明文本中的周期提示(正则 → 周期)
_HINT_PATTERNS: List[Tuple[str, str]] = [
    (r"包年|年费|年付|按年|/年|每年", "yearly"),
    (r"包季|季付|每季|/季|按季", "quarterly"),
    (r"包月|月付|按月|每月|连续包月|/月", "monthly"),
]
# 文案中提示该扣费确为订阅的强信号(用于关键词兜底规则的精度控制)
_SUB_SIGNALS = ["续费", "订阅", "包月", "包年", "包季", "自动", "会员", "vip", "vip会员"]


# ---------- 文本匹配 ----------
def _norm_merchant(name: str) -> str:
    """商户归一化键:去空白/转小写(用于周期聚合,不用于展示)"""
    return re.sub(r"[\s　]", "", name or "").lower()


def match_rule(text: str) -> Optional[Rule]:
    """在给定文本(交易对方+商品说明)中匹配关键词库规则。

    具名规则优先:取命中关键词长度最长者(越长越特异);
    只有无任何具名规则命中时才回退到 generic 兜底规则。
    """
    t = text.lower()
    named_hits: List[Tuple[int, int, Rule]] = []   # (关键词长度, 规则下标, 规则)
    generic_hits: List[Tuple[int, int, Rule]] = []
    for idx, rule in enumerate(KEYWORD_RULES):
        keywords: List[str] = rule["keywords"]
        require_any: List[str] = rule.get("require_any") or []
        for kw in keywords:
            if kw in t and (not require_any or any(r in t for r in require_any)):
                (generic_hits if rule.get("generic") else named_hits).append((len(kw), idx, rule))
                break  # 每条规则只记一次
    pool = named_hits or generic_hits
    if not pool:
        return None
    pool.sort(key=lambda x: (x[0], -x[1]), reverse=True)  # 关键词最长者胜;并列时靠前规则胜
    return pool[0][2]


def _period_hint_from_text(texts: List[str]) -> Optional[str]:
    """从累计文案中提取周期提示(年/季/月),按文本中最早出现位置判定"""
    best: Optional[Tuple[int, str]] = None
    for txt in texts:
        for pattern, period in _HINT_PATTERNS:
            m = re.search(pattern, txt)
            if m and (best is None or m.start() < best[0]):
                best = (m.start(), period)
    return best[1] if best else None


# ---------- 时间工具 ----------
def _to_dt(time_str: str) -> Optional[datetime]:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue
    return None


# ---------- 识别主流程 ----------
def _classify_period(gaps: List[int], hint: Optional[str]) -> Tuple[str, Optional[int]]:
    """按间隔中位数 + 文本提示综合判定周期 → (周期, 中位间隔天数)"""
    med = round(statistics.median(gaps)) if gaps else None
    if med is not None:
        for period, lo, hi in PERIOD_WINDOWS:
            if lo <= med <= hi:
                return period, med
    return (hint or "unknown"), med


def detect_transactions(rows: List[BillRow]) -> dict:
    """识别入口:输入解析后的账单行,输出完整报告 dict(与 DetectResult 对齐)"""
    out_rows: List[BillRow] = [r for r in rows if r.direction == "out" and r.amount > 0]
    all_dt = [_to_dt(r.time) for r in rows]
    valid_dt = [d for d in all_dt if d]

    # ---- 1) 周期聚合:按 (商户归一化, 金额) 分组 ----
    # acc 结构:{ key -> {merchant(原始), texts, times, rule(内置库首个命中),
    #                    rule_hits, ov(关键词覆盖层首个命中)} }
    acc: Dict[Tuple[str, float], dict] = {}
    for i, r in enumerate(out_rows):
        text = f"{r.counterparty} {r.item} {r.category}"
        rule = match_rule(text)
        ov = match_overlay(text)  # 覆盖层:服务关键词 → patterns
        key = (_norm_merchant(r.counterparty), round(r.amount, 2))
        a = acc.setdefault(key, {
            "merchant": r.counterparty, "rule": None, "rule_hits": 0,
            "ov": None, "texts": [], "times": [],
        })
        a["texts"].append(text)
        a["times"].append(r.time)
        if rule:
            # 同一组内只保留首个命中规则(避免末尾噪声行覆盖订阅规则)
            if a["rule"] is None:
                a["rule"] = rule
            a["rule_hits"] += 1
        if ov and a["ov"] is None:
            a["ov"] = ov

    # ---- 2) 逐组判定,生成订阅候选 ----
    subscriptions: List[dict] = []
    flagged_keys: set = set()   # 判定为订阅的组,用于计算"订阅支出"月度序列
    for seq, (key, a) in enumerate(acc.items()):
        rule: Optional[Rule] = a["rule"]
        ov: Optional[dict] = a["ov"]
        named_hit = bool(ov and ov.get("name"))       # 服务关键词命中(可单笔纳入)
        strong_pattern = bool(ov and ov.get("strong"))  # 自动续费/连续包 类强信号
        count = len(a["times"])
        dt_list = sorted(t for t in (_to_dt(t) for t in a["times"]) if t)
        gaps: List[int] = [round((dt_list[i] - dt_list[i - 1]).total_seconds() / 86400)
                           for i in range(1, len(dt_list))]
        hint = _period_hint_from_text(a["texts"])
        period, med = _classify_period(gaps, hint)
        consistent = med is not None and any(lo <= med <= hi for _, lo, hi in PERIOD_WINDOWS)

        # --- 纳入决策:关键词/覆盖层命中优先,失败才走周期规律 ---
        keep = False
        if rule or named_hit:
            keep = True
        elif strong_pattern and count >= 1:
            keep = True
        elif count >= 3 and consistent:
            keep = True
        elif count == 2 and (consistent or hint):
            keep = True
        if not keep:
            continue

        # --- 覆盖层标注(分类/图标/周期 hint);周期未知时用 hint 兜底 ---
        ov_category = str(ov["category"]) if ov and ov.get("category") else ""
        ov_icon = str(ov["icon"]) if ov and ov.get("icon") else ""
        ov_period = _TYPE_TO_PERIOD.get(str(ov.get("type") or "")) if ov else None
        if ov_period and period == "unknown":
            period = ov_period  # 覆盖层 type 作为默认周期(如 淘宝88VIP → 年度)

        if ov and ov.get("name"):
            name = str(ov["name"])
        elif rule and not rule.get("generic"):
            name = str(rule["name"])
        else:
            # 兜底通用规则(如"周期性会员(未匹配库)")不用于展示——
            # 直接显示真实商户名,避免出现"未匹配库"字样
            name = a["merchant"][:24] or "未知商户"

        if ov_category:
            category = ov_category
        elif rule:
            category = str(rule["category"])
        else:
            category = "其他"

        generic = bool(rule.get("generic")) if rule else False
        if ov and not rule and not named_hit:
            generic = False  # patterns 命中不算 generic,名称仍用商户/内置库

        # 证据来源:覆盖层命中但无周期证据 → keyword;叠加周期 → both
        if (rule or ov) and count >= 2 and consistent:
            source = "both"
        elif rule or ov:
            source = "keyword"
        else:
            source = "periodic"

        # 置信度:高 = 命中 + 周期一致且次数足;中 = 单一证据较充分;低 = 弱证据
        if (rule or ov) and count >= 3 and consistent and not generic:
            confidence = "high"
        elif ((rule or ov) and count >= 2) or (count >= 3 and consistent):
            confidence = "medium"
        else:
            confidence = "low"

        amount = float(key[1])
        annual_amount: Optional[float]
        if period == "monthly":
            annual_amount = round(amount * 12, 2)
        elif period == "quarterly":
            annual_amount = round(amount * 4, 2)
        elif period == "yearly":
            annual_amount = round(amount, 2)
        elif count >= 2 and dt_list:
            span_days = max((dt_list[-1] - dt_list[0]).total_seconds() / 86400, 1)
            annual_amount = round(amount * count * 365 / span_days, 2)
        else:
            annual_amount = None

        # generic 兜底且无周期证据时降为观察项(不计入年化节省)
        if generic and period == "unknown" and annual_amount is None and count == 1:
            pass

        subscriptions.append({
            "id": seq + 1,
            "name": name,
            "merchant": a["merchant"],
            "source": source,
            "period": period,
            "amount": amount,
            "annual_amount": annual_amount,
            "occurrences": count,
            "first_at": dt_list[0].strftime("%Y-%m-%d") if dt_list else "",
            "last_at": dt_list[-1].strftime("%Y-%m-%d") if dt_list else "",
            "median_gap_days": med,
            "confidence": confidence,
            "category": category,
            "icon": ov_icon,
            "sample_text": a["texts"][0][:80],
        })
        flagged_keys.add(key)

    # ---- 3) 月度趋势(总支出 vs 订阅支出),pandas 按月重采样 ----
    total_pairs = []
    sub_pairs = []
    for r in out_rows:
        d = _to_dt(r.time)
        if d is None:
            continue
        total_pairs.append((d, r.amount))
        if (_norm_merchant(r.counterparty), round(r.amount, 2)) in flagged_keys:
            sub_pairs.append((d, r.amount))

    def _monthly(series: List[Tuple[datetime, float]]) -> Dict[str, float]:
        if not series:
            return {}
        idx = pd.DatetimeIndex([d for d, _ in series])
        s = pd.Series([a for _, a in series], index=idx)
        s = s.resample("MS").sum()
        return {ts.strftime("%Y-%m"): round(float(v), 2) for ts, v in s.items()}

    total_map, sub_map = _monthly(total_pairs), _monthly(sub_pairs)
    months = [
        {"month": m, "out": total_map.get(m, 0.0), "sub": round(sub_map.get(m, 0.0), 2)}
        for m in sorted(set(total_map) | set(sub_map))
    ]

    # ---- 4) 品类占比 + 摘要 ----
    cat_annual: Dict[str, float] = defaultdict(float)
    cat_count: Dict[str, int] = defaultdict(int)
    for sub in subscriptions:
        cat_count[sub["category"]] += 1
        if sub["annual_amount"] is not None:
            cat_annual[sub["category"]] += sub["annual_amount"]
    categories = [
        {"category": c, "annual": round(cat_annual[c], 2), "count": cat_count[c]}
        for c in sorted(cat_annual, key=lambda k: -cat_annual[k])
    ]

    annual_total = round(sum(s["annual_amount"] for s in subscriptions
                             if s["annual_amount"] is not None), 2)
    subscriptions.sort(key=lambda s: -(s["annual_amount"] or 0))

    return {
        "summary": {
            "tx_count": len(rows),
            "out_total": round(sum(r.amount for r in out_rows), 2),
            "in_total": round(sum(r.amount for r in rows if r.direction == "in"), 2),
            "date_start": valid_dt[0].strftime("%Y-%m-%d") if valid_dt else "",
            "date_end": valid_dt[-1].strftime("%Y-%m-%d") if valid_dt else "",
            "sub_count": len(subscriptions),
            "annual_total": annual_total,
        },
        "subscriptions": subscriptions,
        "months": months,
        "categories": categories,
    }
