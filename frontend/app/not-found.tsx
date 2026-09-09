// =============================================================
// 404 —— 被划掉的 404(纸面裁剪室)
// 静态划痕:首帧即完整显现(transition 不触发),无 IO 时序
// =============================================================
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100svh-73px)] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-center">
        <span className="display cut-strike is-cut inline-block text-[clamp(110px,26vw,220px)] leading-none text-ink">
          404
        </span>
      </p>
      <p className="mt-8 max-w-[42ch] text-[14px] leading-relaxed text-sub">
        这一页不在工作台上 —— 可能被裁掉了,或者从未存在。
      </p>
      <p className="mt-10">
        <Link href="/" className="btn btn-ink text-sm">
          返回工作台
        </Link>
      </p>
    </div>
  );
}
