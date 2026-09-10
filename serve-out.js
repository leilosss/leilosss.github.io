// =============================================================
// 本地静态服务(out/) —— 项目已改为 output:"export",next start 不再可用。
// 用途:本地预览 / playwright 验证(截图、E2E、解析回归)。
//   node SubscriptionScanner/serve-out.js [port]     默认 3000
// 路由:/upload → out/upload.html;/report?d=x → out/report.html
// =============================================================
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "frontend", "out");
const PORT = Number(process.argv[2] || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/** URL 路径 → out/ 内的实际文件(目录/无扩展名自动补 .html) */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/";
  const candidates =
    clean === "/"
      ? ["index.html"]
      : [clean.replace(/^\//, ""), `${clean.replace(/^\//, "")}.html`, `${clean.replace(/^\//, "")}/index.html`];
  for (const c of candidates) {
    const full = path.join(ROOT, c);
    // 防目录穿越:解析后必须仍在 out/ 内
    if (!full.startsWith(ROOT)) continue;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

http
  .createServer((req, res) => {
    const file = resolve(req.url || "/");
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(ROOT, "404.html")));
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`out/ served → http://localhost:${PORT}`));
