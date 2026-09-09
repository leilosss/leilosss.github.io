# =============================================================
# 内置常见订阅服务关键词库(70+ 条)
# 每条规则:
#   name       —— 展示用订阅名称
#   category   —— 品类(用于报告占比图,取值固定集合)
#   keywords   —— 命中关键词(在「交易对方+商品说明」中做子串匹配,任意命中即算)
#   require_any —— 可选;若有,则命中关键词之外还必须命中其中任一(防止误伤普通消费)
#   generic    —— 兜底规则标记(仅在没有任何具名规则命中时才参与匹配)
# 规则可随时扩展:直接向列表追加条目即可,无需改引擎。
# =============================================================
from __future__ import annotations

from typing import Dict, List

Rule = Dict[str, object]

KEYWORD_RULES: List[Rule] = [
    # ---------- 影音 / 视频 ----------
    {"name": "腾讯视频", "category": "影音会员", "keywords": ["腾讯视频"]},
    {"name": "爱奇艺", "category": "影音会员", "keywords": ["爱奇艺", "奇艺果"]},
    {"name": "优酷", "category": "影音会员", "keywords": ["优酷"]},
    {"name": "芒果TV", "category": "影音会员", "keywords": ["芒果tv", "芒果视频"]},
    {"name": "哔哩哔哩大会员", "category": "影音会员",
     "keywords": ["bilibili", "哔哩哔哩"], "require_any": ["大会员", "会员", "vip", "年度"]},
    {"name": "咪咕视频", "category": "影音会员", "keywords": ["咪咕视频", "咪咕会员"]},
    {"name": "腾讯体育", "category": "影音会员", "keywords": ["腾讯体育"]},
    {"name": "爱奇艺体育", "category": "影音会员", "keywords": ["爱奇艺体育"]},
    {"name": "西瓜视频", "category": "影音会员", "keywords": ["西瓜视频会员"]},
    {"name": "腾讯START云游戏", "category": "游戏娱乐", "keywords": ["start云游戏"]},

    # ---------- 音乐 / 音频 ----------
    {"name": "网易云音乐", "category": "音乐音频", "keywords": ["网易云音乐", "云音乐"]},
    {"name": "QQ音乐", "category": "音乐音频", "keywords": ["qq音乐", "qq绿钻", "豪华绿钻"]},
    {"name": "酷狗音乐", "category": "音乐音频", "keywords": ["酷狗"]},
    {"name": "酷我音乐", "category": "音乐音频", "keywords": ["酷我"]},
    {"name": "喜马拉雅", "category": "音乐音频", "keywords": ["喜马拉雅"]},
    {"name": "蜻蜓FM", "category": "音乐音频", "keywords": ["蜻蜓fm"]},
    {"name": "荔枝FM", "category": "音乐音频", "keywords": ["荔枝fm", "荔枝播客"]},
    {"name": "Apple Music", "category": "音乐音频", "keywords": ["apple music"], "require_any": ["订阅", "续费", "会员"]},
    {"name": "Spotify", "category": "音乐音频", "keywords": ["spotify", "声破天"]},
    {"name": "YouTube Premium", "category": "影音会员", "keywords": ["youtube premium", "youtube music"]},

    # ---------- 网盘 / 云存储 ----------
    {"name": "百度网盘", "category": "网盘云存储", "keywords": ["百度网盘", "百度云盘"]},
    {"name": "夸克网盘", "category": "网盘云存储", "keywords": ["夸克网盘", "夸克会员"]},
    {"name": "阿里云盘", "category": "网盘云存储", "keywords": ["阿里云盘", "阿里云盘会员", "teambition"]},
    {"name": "迅雷会员", "category": "网盘云存储", "keywords": ["迅雷会员", "迅雷超级会员", "迅雷svip"]},
    {"name": "115网盘", "category": "网盘云存储", "keywords": ["115网盘", "115科技", "115会员"]},
    {"name": "天翼云盘", "category": "网盘云存储", "keywords": ["天翼云盘"]},
    {"name": "WPS会员", "category": "效率工具", "keywords": ["wps会员", "wps超级会员", "wps稻壳"]},
    {"name": "坚果云", "category": "网盘云存储", "keywords": ["坚果云"]},
    {"name": "iCloud", "category": "网盘云存储", "keywords": ["icloud"]},
    {"name": "Google One", "category": "网盘云存储", "keywords": ["google one"]},
    {"name": "Dropbox", "category": "网盘云存储", "keywords": ["dropbox"]},
    {"name": "OneDrive", "category": "网盘云存储", "keywords": ["onedrive"]},

    # ---------- 阅读 / 知识 ----------
    {"name": "微信读书", "category": "阅读知识", "keywords": ["微信读书"]},
    {"name": "QQ阅读", "category": "阅读知识", "keywords": ["qq阅读", "阅文集团"]},
    {"name": "起点读书", "category": "阅读知识", "keywords": ["起点读书", "起点中文网"]},
    {"name": "掌阅", "category": "阅读知识", "keywords": ["掌阅", "ireader"]},
    {"name": "知乎盐选", "category": "阅读知识", "keywords": ["知乎盐选", "知乎会员"]},
    {"name": "得到", "category": "阅读知识", "keywords": ["得到app", "得到知识"]},
    {"name": "樊登读书", "category": "阅读知识", "keywords": ["樊登读书", "樊登讲书"]},
    {"name": "知识星球", "category": "阅读知识", "keywords": ["知识星球"]},
    {"name": "百度文库", "category": "阅读知识", "keywords": ["百度文库"]},
    {"name": "快看漫画", "category": "阅读知识", "keywords": ["快看漫画"]},
    {"name": "腾讯动漫", "category": "阅读知识", "keywords": ["腾讯动漫"]},
    {"name": "英语流利说", "category": "阅读知识", "keywords": ["流利说"]},
    {"name": "欧路词典", "category": "效率工具", "keywords": ["欧路词典", "eudic"]},
    {"name": "多邻国", "category": "阅读知识", "keywords": ["duolingo", "多邻国"]},

    # ---------- 电商 / 生活平台会员 ----------
    {"name": "京东PLUS会员", "category": "电商生活", "keywords": ["京东plus", "京东plus会员"]},
    {"name": "淘宝88VIP", "category": "电商生活", "keywords": ["88vip", "88会员", "淘宝88"]},
    {"name": "拼多多省钱月卡", "category": "电商生活", "keywords": ["省钱月卡", "拼多多月卡"]},
    {"name": "美团会员", "category": "电商生活", "keywords": ["美团会员", "美团外卖会员"]},
    {"name": "饿了么超级吃货卡", "category": "电商生活", "keywords": ["超级吃货卡", "饿了么会员"]},
    {"name": "盒马X会员", "category": "电商生活", "keywords": ["盒马x会员", "盒马会员"]},
    {"name": "山姆会员店", "category": "电商生活", "keywords": ["山姆会员", "sam's", "山姆超市会籍"]},
    {"name": "云闪付会员", "category": "电商生活", "keywords": ["云闪付会员"]},
    {"name": "顺丰会员", "category": "电商生活", "keywords": ["顺丰会员", "顺丰月卡"]},

    # ---------- 出行 / 生活服务 ----------
    {"name": "滴滴出行会员", "category": "电商生活", "keywords": ["滴滴会员", "滴滴出行会员"]},
    {"name": "哈啰骑行月卡", "category": "电商生活", "keywords": ["哈啰单车", "哈啰骑行"]},
    {"name": "青桔单车月卡", "category": "电商生活", "keywords": ["青桔单车"]},
    {"name": "携程超级会员", "category": "电商生活", "keywords": ["携程会员"]},
    {"name": "高德打车会员", "category": "电商生活", "keywords": ["高德会员"]},
    {"name": "Keep会员", "category": "电商生活", "keywords": ["keep会员", "keep 会员"]},
    {"name": "腾讯乘车码", "category": "电商生活", "keywords": ["乘车码月卡", "乘车码会员"]},

    # ---------- 游戏 / 加速器 ----------
    {"name": "迅游加速器", "category": "游戏娱乐", "keywords": ["迅游加速"]},
    {"name": "UU加速器", "category": "游戏娱乐", "keywords": ["uu加速器", "网易uu"]},
    {"name": "腾讯游戏加速", "category": "游戏娱乐", "keywords": ["腾讯游戏加速"]},
    {"name": "任天堂Switch会员", "category": "游戏娱乐", "keywords": ["nintendo switch online", "switch online"]},
    {"name": "PlayStation Plus", "category": "游戏娱乐", "keywords": ["playstation plus", "ps plus", "psn会员"]},
    {"name": "Xbox Game Pass", "category": "游戏娱乐", "keywords": ["xbox game pass", "game pass"]},
    {"name": "Steam", "category": "游戏娱乐", "keywords": ["steam钱包", "steam 会员"]},

    # ---------- 海外 / 效率工具订阅 ----------
    {"name": "Netflix", "category": "海外订阅", "keywords": ["netflix", "奈飞"]},
    {"name": "Disney+", "category": "海外订阅", "keywords": ["disney+", "disney plus"]},
    {"name": "HBO Max", "category": "海外订阅", "keywords": ["hbo"]},
    {"name": "Amazon Prime", "category": "海外订阅", "keywords": ["amazon prime", "prime video"]},
    {"name": "ChatGPT Plus", "category": "海外订阅", "keywords": ["chatgpt", "openai", "open ai"]},
    {"name": "Claude Pro", "category": "海外订阅", "keywords": ["anthropic", "claude pro"]},
    {"name": "Midjourney", "category": "海外订阅", "keywords": ["midjourney"]},
    {"name": "Grammarly", "category": "海外订阅", "keywords": ["grammarly"]},
    {"name": "GitHub Copilot", "category": "海外订阅", "keywords": ["github copilot", "copilot pro"]},
    {"name": "JetBrains", "category": "海外订阅", "keywords": ["jetbrains"]},
    {"name": "Adobe Creative Cloud", "category": "海外订阅", "keywords": ["adobe", "creative cloud"]},
    {"name": "Notion", "category": "海外订阅", "keywords": ["notion ai", "notion 会员"]},
    {"name": "Figma", "category": "海外订阅", "keywords": ["figma"]},
    {"name": "Slack", "category": "海外订阅", "keywords": ["slack"]},
    {"name": "Zoom", "category": "海外订阅", "keywords": ["zoom meeting", "zoom 会员"]},
    {"name": "Canva", "category": "海外订阅", "keywords": ["canva pro", "canva 会员"]},
    {"name": "Microsoft 365", "category": "效率工具", "keywords": ["microsoft 365", "office 365", "microsoft office"]},
    {"name": "Telegram Premium", "category": "海外订阅", "keywords": ["telegram premium"]},
    {"name": "YouTube", "category": "海外订阅", "keywords": ["youtube"], "require_any": ["premium", "会员", "订阅"]},

    # ---------- 通用兜底(自动续费类文本) ----------
    {"name": "周期性会员(未匹配库)", "category": "其他", "generic": True,
     "keywords": ["自动续费", "自动扣费", "连续包月", "连续包年", "连续包季",
                  "自动续订", "订阅服务", "会员续费", "vip自动"]},
]

# 品类固定集合(顺序即饼图默认排序)
CATEGORIES = ["影音会员", "音乐音频", "网盘云存储", "阅读知识", "效率工具",
              "游戏娱乐", "电商生活", "海外订阅", "其他"]
