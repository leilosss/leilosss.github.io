// =============================================================
// Trim · vestris 编辑室主题(tailwind)
// 无圆角/无阴影;颜色与字体走 tokens;强调绿见 globals.css
// =============================================================
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2EDE4",
        paperDeep: "#E7E1CE",
        ink: "#1A1A1A",
        sub: "#6E6861",
        sage: "#5C7C68",
        sageDeep: "#3E5543",
        rust: "#D63B2F",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', "sans-serif"],
        serif: ["var(--font-instrument)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", '"SF Mono"', '"Cascadia Mono"', "Consolas", "Menlo", "monospace"],
      },
      keyframes: {
        "rise-in": {
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
