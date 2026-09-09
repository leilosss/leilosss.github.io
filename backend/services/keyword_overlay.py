# =============================================================
# 订阅关键词覆盖层(subscription_keywords.json 的加载与匹配)
# 语义:解析账单行的「交易对方 + 商品」文本——
#   1) 先按服务关键词精确子串命中(如「腾讯视频」出现在文本即命中)
#   2) 未命中再按正则 patterns(如 .*自动续费.* / .*会员.*)
# 命中输出:服务名(可选)、category 分类、icon 图标、type 周期类型标签;
# 周期类型只作为 hint —— 真实扣费间隔(月/季/年窗口)永远优先。
# =============================================================
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, Optional

_LIB_PATH = os.path.join(os.path.dirname(__file__), "subscription_keywords.json")


@lru_cache(maxsize=1)
def library() -> Dict[str, Any]:
    """加载关键词库(带缓存;文件即数据源,改 JSON 无需改代码)"""
    with open(_LIB_PATH, encoding="utf-8") as f:
        data = json.load(f)
    # 预判"强信号" patterns(文本自带 自动续费/连续包 等,单笔也值得纳入)
    for pat in data.get("patterns", []):
        raw = pat.get("match", "")
        pat["_strong"] = bool(re.search(r"自动续费|连续包|自动扣费", raw))
    return data


def match_overlay(text: str) -> Optional[Dict[str, Any]]:
    """在文本中匹配覆盖层。

    返回 dict 含:
      name     —— 服务关键词命中时给出规范名(patterns 命中无此键)
      category —— 分类(视频/音乐/工具/阅读/购物/创作/自动续费/会员服务)
      icon     —— 图标(emoji,由前端决定是否展示)
      type     —— 周期类型标签(月度/年度),仅作 hint
      strong   —— patterns 命中时是否为"自动续费类"强信号
    未命中返回 None → 由原周期性检测逻辑接管。
    """
    lib = library()
    t = text.lower()
    # 1) 服务关键词:大小写不敏感子串
    for name, meta in lib.get("keywords", {}).items():
        if name.lower() in t:
            return {
                "name": name,
                "category": str(meta.get("category", "")),
                "icon": str(meta.get("icon", "")),
                "type": str(meta.get("type", "")),
            }
    # 2) 正则 patterns(原文大小写不敏感)
    for pat in lib.get("patterns", []):
        try:
            hit = re.search(pat.get("match", ""), text, re.IGNORECASE)
        except re.error:
            continue
        if hit:
            return {
                "category": str(pat.get("category", "")),
                "type": str(pat.get("type", "")),
                "strong": bool(pat.get("_strong")),
            }
    return None
