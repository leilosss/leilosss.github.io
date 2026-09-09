// =============================================================
// UPLOAD /upload —— 上传账单(v11 车间版壳)
// 全页即拖放感应区,核心交给 UploadBench(折叠纸 → 扫描线 → 滑出/批回)。
// 功能与 v9 等价:四态机、重复覆盖、双入口、规格、自动跳转、隐私声明。
// =============================================================
import { UploadBench } from "@/components/trim/shop/upload-bench";

export default function UploadPage() {
  return (
    <div className="px-0">
      <h1 className="sr-only">上传账单</h1>
      <UploadBench />
    </div>
  );
}
