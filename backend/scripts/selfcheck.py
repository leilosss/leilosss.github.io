# =============================================================
# 全链路自检脚本(验收用)
# 用法(backend 目录): python scripts/selfcheck.py
# 流程:生成示例账单 → 服务端完整解析(GBK 解码/表头定位/openpyxl)
#       → 订阅识别 → 断言关键订阅全部命中 → 打印报告摘要
# =============================================================
from __future__ import annotations

import io
import sys
from datetime import datetime
from pathlib import Path

# 让脚本可以 import backend 顶层模块(services/models)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from openpyxl import Workbook  # noqa: E402

from scripts.make_samples import (  # noqa: E402
    write_alipay_csv, write_wechat_csv, write_wechat_xlsx,
)
from services.alipay_parser import parse_alipay_bytes, parse_alipay_text  # noqa: E402
from services.wechat_parser import parse_wechat_bytes  # noqa: E402
from services.detector import detect_transactions  # noqa: E402

EXPECTED_SUBS = {"腾讯视频", "爱奇艺", "百度网盘", "京东PLUS会员", "iCloud", "网易云音乐", "Spotify", "WPS"}


def check_wechat_edge_cases() -> list[tuple[str, bool, str]]:
    """回归用例:真实微信文件的各种“格式正确却解析 0 行”场景"""
    results: list[tuple[str, bool, str]] = []

    # 场景 A:含分隔行「-----微信支付账单明细列表-----」的 CSV(标准导出)
    sep_csv = (
        "微信支付账单明细,,,,,\n"
        "昵称：[测试用户],,,,,\n"
        "时间:[2026-01-01 00:00:00 至 2026-02-01 00:00:00],,,,,\n"
        "---------------------微信支付账单明细列表--------------------\n"
        "交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注\n"
        "2026-01-05 10:00:00,商户消费,腾讯视频商户,腾讯视频VIP-自动续费,支出,25.00,零钱,支付成功,1001,2001,\n"
        "2026-01-06 11:00:00,转账收款,李四,转账,收入,30.00,零钱,支付成功,1002,2002,红包\n"
        "2026-01-07 12:00:00,商户消费,测试商户,测试商品,/,0.00,零钱,支付成功,1003,2003,\n"
        "合计:收款30.00元,付款25.00元,,,,,\n"
    )
    rows, _w = parse_wechat_bytes(sep_csv.encode("utf-8-sig"), "sep_sample.csv")
    results.append(("含分隔行 CSV 可解析", len(rows) == 2, f"(实际 {len(rows)})"))
    if rows:
        results.append(("支出→out 映射", rows[0].direction == "out", rows[0].direction))
        results.append(("收入→in 映射", rows[1].direction == "in", rows[1].direction))
        results.append(("金额为 float", isinstance(rows[0].amount, float) and rows[0].amount == 25.0,
                        repr(rows[0].amount)))

    # 场景 B:金额带千分位逗号(CSV 带引号字段)
    comma_csv = sep_csv.replace(
        "腾讯视频VIP-自动续费,支出,25.00,",
        "腾讯视频VIP-自动续费,支出,\"1,000.00\",",
        1,
    )
    rows2, _w2 = parse_wechat_bytes(comma_csv.encode("utf-8-sig"), "comma_sample.csv")
    results.append(("金额忽略逗号 → 1000.0",
                    bool(rows2) and rows2[0].amount == 1000.0,
                    repr(rows2[0].amount) if rows2 else "0 行"))

    # 场景 C:xlsx 中交易时间为 Excel 日期序列号(45xxx 数字)而非文本
    serial_dt = datetime(2026, 1, 15, 10, 30, 0)
    serial = (serial_dt - datetime(1899, 12, 30)).total_seconds() / 86400
    wb = Workbook()
    ws = wb.active
    ws.append(["微信支付账单明细", None])
    ws.append(["---------------------微信支付账单明细列表--------------------"])
    ws.append(["交易时间", "交易类型", "交易对方", "商品", "收/支", "金额(元)", "支付方式", "当前状态"])
    ws.append([serial, "商户消费", "Spotify AB", "Spotify Premium", "支出", 12.0, "零钱", "支付成功"])
    ws.append([serial + 31.0, "商户消费", "Spotify AB", "Spotify Premium", "支出", 12.0, "零钱", "支付成功"])
    ws.append(["合计:收款0.00元,付款24.00元", None])
    buf = io.BytesIO()
    wb.save(buf)
    rows3, _w3 = parse_wechat_bytes(buf.getvalue(), "serial_sample.xlsx")
    results.append(("xlsx 序列号时间可解析", len(rows3) == 2, f"(实际 {len(rows3)})"))
    if rows3:
        results.append(("序列号转出正确日期", rows3[0].time.startswith("2026-01-15"), rows3[0].time))
    return results


def _fmt_row(r) -> str:
    return f"[{r.time}] {r.direction:<3} ¥{r.amount:>8.2f} {r.counterparty} | {r.item[:24]}"


def main() -> int:
    ok = True

    def check(label: str, cond: bool, extra: str = ""):
        nonlocal ok
        mark = "✅" if cond else "❌"
        print(f"{mark} {label} {extra}")
        if not cond:
            ok = False

    # 1) 生成示例文件
    a_file, x_file, c_file = write_alipay_csv(), write_wechat_xlsx(), write_wechat_csv()
    print("== 步骤 1:解析示例账单 ==")

    # 2) 支付宝:GBK 字节 → 解码 → 解析
    a_rows, a_warn = parse_alipay_bytes(a_file.read_bytes())
    print(f"-- 支付宝 CSV:解析 {len(a_rows)} 行,警告 {len(a_warn)} 条")
    for w in a_warn:
        print(f"   ⚠ {w}")
    for r in a_rows[:5]:
        print("   " + _fmt_row(r))
    check("支付宝行数充足", len(a_rows) > 40, f"(实际 {len(a_rows)})")
    check("支付宝含订阅商户", any("京东" in r.counterparty and r.amount == 149.0 for r in a_rows))

    # 3) 微信 xlsx
    x_rows, x_warn = parse_wechat_bytes(x_file.read_bytes(), "wechat_sample.xlsx")
    print(f"-- 微信 xlsx:解析 {len(x_rows)} 行,警告 {len(x_warn)} 条")
    for w in x_warn:
        print(f"   ⚠ {w}")
    check("微信 xlsx 行数充足", len(x_rows) > 40, f"(实际 {len(x_rows)})")
    check("微信 xlsx 未混入说明行", all("微信支付账单" not in r.counterparty for r in x_rows))

    # 4) 微信 csv
    c_rows, c_warn = parse_wechat_bytes(c_file.read_bytes(), "wechat_sample.csv")
    print(f"-- 微信 csv:解析 {len(c_rows)} 行,警告 {len(c_warn)} 条")
    check("微信 csv 行数一致", len(c_rows) == len(x_rows), f"(xlsx {len(x_rows)} vs csv {len(c_rows)})")

    # 4.5) 微信解析边界回归:分隔行格式 / 千分位金额 / Excel 序列号时间
    print("== 步骤 1.5:微信解析边界回归 ==")
    for label, cond, extra in check_wechat_edge_cases():
        check(f"微信 {label}", cond, extra)

    # 5) 编码兜底:把支付宝文本强制按 UTF-8 硬解会乱码 → GBK 探测路径应兜住
    raw_gb = a_file.read_bytes()
    try:
        raw_gb.decode("utf-8")
        check("示例 GBK 编码(应为乱码/异常)", False, "示例未按 GB18030 写入?")
    except UnicodeDecodeError:
        check("示例文件确为 GBK 编码", True)
    from services.alipay_parser import decode_bytes
    text = decode_bytes(raw_gb)
    check("GBK 解码无乱码", "交易对方" in text)

    # 6) 订阅识别(分别对支付宝、微信 xlsx 跑)
    print("== 步骤 2:订阅识别 ==")
    for label, rows in (("支付宝", a_rows), ("微信xlsx", x_rows)):
        report = detect_transactions(rows)
        names = {s["name"] for s in report["subscriptions"]}
        summary = report["summary"]
        print(f"-- {label}:检出订阅 {summary['sub_count']} 条,年化合计 ¥{summary['annual_total']:.2f}")
        missing = EXPECTED_SUBS - names
        for s in sorted(report["subscriptions"], key=lambda x: -(x["annual_amount"] or 0)):
            print(f"   · {s['name']:<16} {s['period']:<8} "
                  f"¥{s['amount']:>7.2f}/次 ×{s['occurrences']} "
                  f"[{s['first_at']} ~ {s['last_at']}] {s['confidence']}")
        check(f"{label}:关键订阅全部命中", not missing,
              f"缺失:{sorted(missing) or '无'}")
        tv = next((x for x in report["subscriptions"] if x["name"] == "腾讯视频"), None)
        check(f"{label}:覆盖层标注(视频/图标)",
              bool(tv) and tv["category"] == "视频" and tv.get("icon") == "🎬",
              f"(got {tv and tv['category']}/{tv and tv['icon']})")

    # 7) 报告字段完整性抽查
    report = detect_transactions(a_rows)
    check("月度趋势非空", len(report["months"]) >= 10, f"(共 {len(report['months'])} 个月)")
    check("品类占比非空", len(report["categories"]) >= 3,
          f"({', '.join(c['category'] for c in report['categories'][:5])})")
    check("报告 JSON 可序列化", isinstance(detect_transactions(a_rows)["summary"], dict))

    print("=" * 60)
    print("自检" + ("全部通过 ✅" if ok else "存在失败 ❌ 请查看上方标记"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
