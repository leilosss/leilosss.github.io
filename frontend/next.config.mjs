// =============================================================
// Next.js 配置
// - output: 'standalone' —— 生产镜像(Docker)以最小体积运行
// - 生产环境安全响应头:CSP / HSTS / 防嗅探 / 防拖拽外链
// 隐私架构:浏览器只与本站同源通信;后端调用全部经 /api 路由在服务端代理,
// 因此 CSP connect-src 收紧为 'self'(浏览器永不知道后端地址)。
// =============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: { ignoreDuringBuilds: true }, // 代码质量由 tsc/typecheck 把关

  // 生产环境安全响应头(本地 dev 不加,避免影响 HMR 热更新)
  headers: async () =>
    process.env.NODE_ENV === "production"
      ? [
          {
            source: "/(.*)",
            headers: [
              {
                key: "Content-Security-Policy",
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval 供 ECharts 等产物使用,生产可进一步收紧
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob:",
                  "font-src 'self' data:",
                  "connect-src 'self'",
                  "media-src 'self'",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "frame-ancestors 'none'",
                  "form-action 'self'",
                ].join("; "),
              },
              { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
              { key: "X-Content-Type-Options", value: "nosniff" },
              { key: "Referrer-Policy", value: "no-referrer" },
              { key: "X-Frame-Options", value: "DENY" },
              { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
            ],
          },
        ]
      : [],
};

export default nextConfig;
