# =============================================================
# 全格式夹具校验器(上线前回归)
# 用法: python scripts/validate_fixtures.py(backend 目录)
# 逐个读取 fixtures_out/manifest.json → 服务端解析 → 行数比对 → detect 冒烟
# 退出码:0 全过 / 1 有失败
# =============================================================
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.alipay_parser import parse_alipay_bytes  # noqa: E402
from services.detector import detect_transactions  # noqa: E402
from services.wechat_parser import parse_wechat_bytes  # noqa: E402

OUT = ROOT / "fixtures_out"
MANIFEST = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))


def main() -> int:
    ok = True
    print(f"{'平台':<8}{'类型':<16}{'期望':>6}{'实际':>6}  判定  备注")
    for m in MANIFEST:
        raw = (OUT / m["file"]).read_bytes()
        if m["platform"] == "alipay":
            rows, warn = parse_alipay_bytes(raw)
        else:
            rows, warn = parse_wechat_bytes(raw, m["file"])
        got = len(rows)
        passed = got >= m["expected_rows"]
        ok = ok and passed
        mark = "✅" if passed else "❌"
        print(f"{m['platform']:<8}{m['kind']:<16}{m['expected_rows']:>6}{got:>6}  {mark}  {m['note']}")
        if warn:
            print(f"         警告: {'; '.join(warn)[:120]}")
        if passed and rows:
            # detect 冒烟:整份跑通识别不崩溃
            try:
                detect_transactions(rows)
            except Exception as exc:  # noqa: BLE001
                ok = False
                print(f"         detect 冒烟失败: {exc}")
    # 专项:未配对 ASCII 引号吞行 → 容错解析应仍还原两行
    raw2 = (
        "交易时间,交易分类,交易对方,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注\n"
        "2026-01-01 10:00:00,消费,商户A,商品A1 自动续费,支出,25.00,余额,交易成功,1,m,\"\n"
        "2026-02-01 10:00:00,消费,商户A,商品A2 自动续费,支出,25.00,余额,交易成功,2,m,"
    ).encode("gb18030")
    rows2, _w2 = parse_alipay_bytes(raw2)
    mark2 = "✅" if len(rows2) >= 2 else "❌"
    ok = ok and len(rows2) >= 2
    print(f"alipay  未配对引号专项       2{len(rows2):>6}  {mark2}  容错解析还原两行")
    print("=" * 60)
    print("全格式回归" + ("通过 ✅" if ok else "存在失败 ❌"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
