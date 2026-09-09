# =============================================================
# 示例账单生成器
# 用途:生成与真实文件同构的测试样本(支付宝 GBK CSV / 微信 xlsx / 微信 csv),
#       供验收、自测与演示。运行环境:backend 目录下 python scripts/make_samples.py
# =============================================================
from __future__ import annotations

import csv
import io
import random
from pathlib import Path

from openpyxl import Workbook

OUT_DIR = Path(__file__).resolve().parent.parent / "samples"

# 支付宝官方 CSV 列(以真实导出文件为准)
ALIPAY_HEADER = [
    "交易号", "商家订单号", "交易创建时间", "付款时间", "最近修改时间", "交易来源地",
    "类型", "交易对方", "商品名称", "金额（元）", "收/支", "交易状态",
    "服务费（元）", "成功退款（元）", "备注", "资金状态",
]

# 微信 xlsx/csv 列
WECHAT_HEADER = [
    "交易时间", "交易类型", "交易对方", "商品", "收/支", "金额(元)",
    "支付方式", "当前状态", "交易单号", "商户单号", "备注",
]

MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

# 假数据:10 个订阅(月付×6 / 季付×1 / 年付×2 / Apple×1)
# 格式:(对方, 商品, 金额, 起始年, 起始月, 频率)
SUBSCRIPTIONS = [
    ("腾讯视频商户", "腾讯视频VIP-自动续费", 25.00, 2025, 10, "month"),
    ("爱奇艺科技有限公司", "爱奇艺黄金VIP-连续包月", 22.00, 2025, 11, "month"),
    ("百度网盘商户", "百度网盘超级会员-连续包月", 25.00, 2025, 9, "month"),
    ("网易云音乐商户", "网易云音乐黑胶VIP-包月", 15.00, 2025, 12, "month"),
    ("Apple", "iCloud 50GB方案 月度订阅", 6.00, 2025, 10, "month"),
    ("Spotify AB", "Spotify Premium Individual 订阅", 12.00, 2026, 1, "month"),
    ("喜马拉雅", "喜马拉雅VIP-按季付费", 18.00, 2025, 12, "quarter"),
    ("京东商城平台商户", "京东PLUS会员(年卡)续费", 149.00, 2025, 8, "year"),
    ("WPS", "WPS超级会员-包年", 178.00, 2025, 8, "year"),
    ("拼多多官方", "省钱月卡-自动续费", 11.90, 2026, 2, "month"),
]

# 一次性消费(制造噪声,金额应各不相同以防误报)
NOISE = [
    ("瑞幸咖啡", "瑞幸咖啡-美式(自提)", 13.80),
    ("盒马鲜生", "生鲜百货订单", 86.50),
    ("滴滴出行", "快车订单", 21.30),
    ("美团平台商户", "外卖订单", 32.90),
    ("肯德基", "KFC 全家桶", 79.90),
    ("中石化", "加油 92#", 200.00),
    ("淘宝网", "日用百货订单", 45.20),
    ("京东商城平台商户", "数码配件订单", 59.00),
    ("瑞幸咖啡", "瑞幸咖啡-拿铁", 19.90),
    ("市政供水", "水费缴纳", 37.40),
    ("国家电网", "电费缴纳", 156.80),
    ("中石化", "加油 92#", 220.00),
]


END_YEAR, END_MONTH = 2026, 8  # 账单截止期(含)


def _month_dates(year: int, month: int, freq: str):
    """按频率生成 (年,月,日) 序列,可跨年推进到 END_YEAR/END_MONTH"""
    cursor = 0
    y, m = year, month
    while (y, m) <= (END_YEAR, END_MONTH):
        cursor += 1
        d = min(10 + (cursor % 9), MONTH_DAYS[m - 1])
        yield (y, m, d)
        if freq == "month":
            m += 1
        elif freq == "quarter":
            m += 3
        elif freq == "year":
            m += 12
        y, m = (y + (m - 1) // 12), ((m - 1) % 12 + 1)


def _tx_no(y, mo, d, seed) -> str:
    return f"{y}{mo:02d}{d:02d}{2000000000000000000 + seed:018d}"


def build_alipay_lines() -> list[list[str]]:
    """构造支付宝 CSV 的全部行(说明文字 24 行 + 表头 + 数据)"""
    lines: list[list[str]] = []
    for i in range(24):  # 说明文字行
        lines.append([f"支付宝交易记录明细查询-说明文字第{i + 1}行" if i == 0 else ""])
    lines.append(["账号:[demo@example.com]"])
    lines.append(["起始日期:[2025-08-01 00:00:00 至 2026-08-31 23:59:59]"])
    lines.append(["-" * 70])
    lines.append(ALIPAY_HEADER)

    seq = 1
    def emit(y, mo, d, typ, merchant, item, amount, direction):
        nonlocal seq
        t = f"{y:04d}-{mo:02d}-{d:02d} 09:{min(seq % 58, 58):02d}:{(seq * 7) % 60:02d}"
        lines.append([
            _tx_no(y, mo, d, seq), _tx_no(y, mo, d, seq + 100), t, t, t, "浙江省杭州市",
            typ, merchant, item, f"{amount:.2f}", direction, "交易成功",
            "0.00", "", "", "已支出" if direction == "支出" else "",
        ])
        seq += 1

    # 生成订阅交易
    for (merchant, item, amount, y0, m0, freq) in SUBSCRIPTIONS:
        for (y, mo, d) in _month_dates(y0, m0, freq):
            if (y, mo) >= (2025, 8) and (y, mo) <= (2026, 8):
                emit(y, mo, d, "商户消费", merchant, item, amount, "支出")
    # 一次性消费 + 两笔收入
    rng = random.Random(42)
    for (merchant, item, amount) in NOISE:
        y = rng.randint(2025, 2026)
        mo = rng.randint(9 if y == 2025 else 1, 12 if y == 2025 else 8)
        d = min(rng.randint(1, 28), MONTH_DAYS[mo - 1])
        emit(y, mo, d, "消费", merchant, item, amount, "支出")
    emit(2026, 1, 10, "转账", "工资代发", "工资", 8600.00, "收入")
    emit(2026, 7, 10, "转账", "工资代发", "工资", 8600.00, "收入")
    return lines


def write_alipay_csv() -> Path:
    """写支付宝 GBK 编码 CSV(模拟真实导出)"""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerows(build_alipay_lines())
    out = OUT_DIR / "alipay_sample.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(buf.getvalue().encode("gb18030"))
    return out


def build_wechat_rows():
    """构造微信账单行:列表最前若干行为说明,最后为合计"""
    matrix = [
        ["微信支付账单明细", None, None, None, None, None, None, None, None, None, None],
        ["", None, None, None, None, None, None, None, None, None, None],
        ["导出类型:全部", None, None, None, None, None, None, None, None, None, None],
        ["时间:[2025-08-01 00:00:00 至 2026-08-31 23:59:59]", None, None, None, None, None,
         None, None, None, None, None],
        [None] * 11,
        WECHAT_HEADER,
    ]
    seq = 0
    out_total = 0.0
    for (merchant, item, amount, y0, m0, freq) in SUBSCRIPTIONS:
        for (y, mo, d) in _month_dates(y0, m0, freq):
            if not ((y, mo) >= (2025, 8) and (y, mo) <= (2026, 8)):
                continue
            seq += 1
            t = f"{y:04d}-{mo:02d}-{d:02d} 10:{seq % 60:02d}:{(seq * 13) % 60:02d}"
            matrix.append([t, "商户消费", merchant, item, "支出", f"{amount:.2f}",
                           "零钱", "支付成功", f"4200001{seq:014d}", f"WX{seq:010d}", ""])
            out_total += amount
    rng = random.Random(7)
    for (merchant, item, amount) in NOISE:
        y = rng.randint(2025, 2026)
        mo = rng.randint(9 if y == 2025 else 1, 12 if y == 2025 else 8)
        d = min(rng.randint(1, 28), MONTH_DAYS[mo - 1])
        seq += 1
        t = f"{y:04d}-{mo:02d}-{d:02d} 18:{seq % 60:02d}:{(seq * 11) % 60:02d}"
        matrix.append([t, "商户消费", merchant, item, "支出", f"{amount:.2f}",
                       "零钱", "支付成功", f"4200002{seq:014d}", f"WX{seq:010d}", ""])
        out_total += amount
    # 表尾:合计行(解析器应在此截断)
    matrix.append([f"合计:收款0.00元,付款{out_total:.2f}元", None] + [None] * 9)
    return matrix


def write_wechat_xlsx() -> Path:
    """写微信 .xlsx 账单"""
    matrix = build_wechat_rows()
    wb = Workbook()
    ws = wb.active
    ws.title = "微信支付账单"
    for row in matrix:
        ws.append(row)
    out = OUT_DIR / "wechat_sample.xlsx"
    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)
    return out


def write_wechat_csv() -> Path:
    """写微信邮箱版 CSV(UTF-8 BOM)"""
    matrix = build_wechat_rows()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerows(matrix)
    out = OUT_DIR / "wechat_sample.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(b"\xef\xbb\xbf" + buf.getvalue().encode("utf-8"))
    return out


if __name__ == "__main__":
    a = write_alipay_csv()
    x = write_wechat_xlsx()
    c = write_wechat_csv()
    print(f"已生成示例账单:\n  {a}\n  {x}\n  {c}")
