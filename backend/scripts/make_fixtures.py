# =============================================================
# 全格式解析回归夹具生成器(上线前回归用)
# 运行: python scripts/make_fixtures.py(backend 目录)
# 产出: backend/fixtures_out/ 下多格式账单 + manifest.json(期望)
# 覆盖:支付宝 旧版GBK/旧版UTF8-BOM/新版GBK(脏引号+零元+混用)
#       微信 csv(BOM+分隔行+千分位)/xlsx(分隔行)/xlsx(序列号时间)
# =============================================================
from __future__ import annotations

import json
import shutil
from pathlib import Path

from scripts.make_samples import (  # noqa: E402
    ALIPAY_HEADER,
    NOISE,
    SUBSCRIPTIONS,
    WECHAT_HEADER,
    build_alipay_lines,
    build_wechat_rows,
)
from services.alipay_parser import decode_bytes  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "fixtures_out"
MANIFEST: list[dict] = []


def _record(platform: str, kind: str, file: str, expected_rows: int, note: str) -> None:
    MANIFEST.append({
        "platform": platform, "kind": kind, "file": file,
        "expected_rows": expected_rows, "note": note,
    })


def write_alipay_classic_gbk() -> None:
    """旧版表头(交易号开头)· GBK"""
    text = "\n".join(",".join(r) for r in build_alipay_lines())
    (OUT / "alipay_classic_gbk.csv").write_bytes(text.encode("gb18030"))
    _record("alipay", "classic-gbk", "alipay_classic_gbk.csv", 89, "旧版表头+GBK(交易号/交易创建时间)")


def write_alipay_classic_utf8_bom() -> None:
    """旧版表头 · UTF-8 BOM(部分工具转码后的形态)"""
    src = (OUT / "alipay_classic_gbk.csv").read_bytes()
    text = decode_bytes(src)
    (OUT / "alipay_classic_utf8bom.csv").write_bytes(b"\xef\xbb\xbf" + text.encode("utf-8"))
    _record("alipay", "classic-utf8bom", "alipay_classic_utf8bom.csv", 89, "旧版表头+UTF-8 BOM")


def write_alipay_new_gbk() -> None:
    """新版交易明细表头(交易时间开头)· GBK · CRLF
    内容:4 条真实形态扣费(DeepSeek/阿里云 等)+ 2 条 0 元订单
        + 1 条商品说明含未配对 ASCII 引号 + 1 条订单号含制表符
    """
    new_header = ("交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,"
                  "收/付款方式,交易状态,交易订单号,商家订单号,备注,")
    rows = [
        ("2026-09-08 11:50:18", "日用百货", "淘宝闪购", "a***@tb.com", "外卖红包", "支出", "0.10", "余额", "交易成功", "1", "m1", ""),
        ("2026-09-07 20:04:33", "软件服务", "杭州深度求索人工智能基础技术研究有限公司", "pay***@deepseek.com", "DeepSeek-API服务(158****** 自动续费", "支出", "10.00", "光大银行储蓄卡(1283)", "交易成功", "2", "m2", ""),
        ("2026-09-06 08:30:00", "其他", "阿里云", "pay***@aliyun-inc.com", "充值:阿里云服务购买，业务交易号:CFP20260906001", "支出", "10.00", "信用卡(1283)", "交易成功", "3\t", "m3", ""),
        ("2026-09-05 12:00:00", "生活缴费", "国家电网", "gd***@sgcc.com.cn", "电费", "支出", "0.00", "余额", "交易成功", "4", "m4", "零元"),
        ("2026-09-04 09:12:44", "视频", "哔哩哔哩", "b***@bilibili.com", "大会员 自动续费", "支出", "15.00", "余额", "交易成功", "5", "m5", ""),
        ("2026-09-03 18:22:10", "其他", "湖南煦涵环保科技有限公司", "296***@qq.com", "直饮水", "支出", "0.00", "余额", "交易成功", "6", "m6", "零元"),
    ]
    lines = [
        "-" * 80,
        # 占位身份:夹具里**不许出现真实姓名/手机号**(2026-09-11 修 —— 这里曾是导出人的真实信息,
        # 而本仓库是公开的)
        "导出信息：", "姓名：张三", "支付宝账户：13800000000",
        "起始时间：[2026-06-08 00:00:00]    终止时间：[2026-09-08 23:59:59]",
        "导出交易类型：[全部]", "共6笔记录", "",
        new_header,
    ]
    lines += [",".join(r) for r in rows]
    content = "\r\n".join(lines) + "\r\n"
    (OUT / "alipay_new_gbk.csv").write_bytes(content.encode("gb18030"))
    _record("alipay", "new-gbk", "alipay_new_gbk.csv", 4, "新版表头+GBK+CRLF+脏引号+制表符+零元(零元不计有效)")


def write_wechat_csv() -> None:
    """微信邮箱版 CSV(UTF-8 BOM · 分隔行 · 含千分位金额行)"""
    matrix = build_wechat_rows()
    # 替换首条 25.00 为千分位写法,验证金额解析
    for row in matrix:
        if len(row) > 5 and row[5] == "25.00":
            row[5] = '"1,000.00"'
            break
    out = []
    for row in matrix:
        out.append(",".join("" if c is None else str(c) for c in row))
    (OUT / "wechat_standard.csv").write_bytes(b"\xef\xbb\xbf" + "\n".join(out).encode("utf-8"))
    _record("wechat", "standard-csv", "wechat_standard.csv", 87, "邮箱 CSV:BOM+分隔行+千分位金额")


def write_wechat_xlsx() -> None:
    """微信 xlsx(说明+分隔行+数据)"""
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "微信支付账单"
    for row in build_wechat_rows():
        ws.append([None if c is None else str(c) for c in row])
    wb.save(str(OUT / "wechat_standard.xlsx"))
    _record("wechat", "standard-xlsx", "wechat_standard.xlsx", 87, "xlsx:分隔行+文本时间")


def write_wechat_serial_xlsx() -> None:
    """微信 xlsx · 交易时间为 Excel 序列号数字(防 0 行场景)"""
    from datetime import datetime, timedelta
    from openpyxl import Workbook
    base = datetime(2026, 1, 15, 10, 30, 0)
    epoch = datetime(1899, 12, 30)
    wb = Workbook()
    ws = wb.active
    ws.append(["微信支付账单明细", None])
    ws.append(["---------------------微信支付账单明细列表--------------------"])
    ws.append(WECHAT_HEADER)
    for i in range(3):
        dt = base + timedelta(days=30 * i)
        serial = (dt - epoch).total_seconds() / 86400
        ws.append([serial, "商户消费", "Spotify AB", "Spotify Premium 订阅", "支出", 12.0, "零钱", "支付成功", f"t{i}", "m", ""])
    ws.append(["合计:收款0.00元,付款36.00元", None])
    wb.save(str(OUT / "wechat_serial.xlsx"))
    _record("wechat", "serial-xlsx", "wechat_serial.xlsx", 3, "xlsx:Excel 序列号时间")


def write_wechat_lf_csv() -> None:
    """微信 CSV 变体:仅 LF 换行、无 BOM(部分工具另存后的形态)"""
    src = (OUT / "wechat_standard.csv").read_bytes().decode("utf-8-sig")
    (OUT / "wechat_lf.csv").write_bytes(src.replace("\r\n", "\n").encode("utf-8"))
    _record("wechat", "lf-csv", "wechat_lf.csv", 87, "邮箱 CSV:LF only + 无 BOM")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    write_alipay_classic_gbk()
    write_alipay_classic_utf8_bom()
    write_alipay_new_gbk()
    write_wechat_csv()
    write_wechat_xlsx()
    write_wechat_serial_xlsx()
    write_wechat_lf_csv()
    (OUT / "manifest.json").write_text(
        json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"夹具已生成 → {OUT}")
    for m in MANIFEST:
        print(f"  {m['platform']:<8}{m['kind']:<14}期望 {m['expected_rows']:>3} 行  · {m['note']}")


if __name__ == "__main__":
    main()
