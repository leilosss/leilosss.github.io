# Product

> 由 impeccable init 建档(2026-09-09)。带 **[推断]** 标记的行非访谈获得,
> 由执行代理从显式需求与代码证据推断,已向用户披露;后续会话可随时修正。

## Platform
Web(PWA-ready 静态产物,运行于用户云服务器 Docker + Next standalone)。**[推断]** 无移动原生计划。

## Stack
Next.js 14(App Router)· TypeScript · Tailwind CSS v3 · 手写 CSS keyframes(globals.css)
· lucide-react · papaparse/read-excel-file(浏览器解析)。后端 FastAPI 仅收结构化 JSON,见 `backend/`。

## Users
- 主要使用者:本站所有者(个人开发者/学生),用真实支付宝与微信账单自我排雷。
- 潜在访客:想清理自动续费、但警惕隐私与"AI 模板感"的用户。

## Product Purpose
识别支付宝/微信账单中的自动续费订阅:本地解析 → 关键词+周期识别 → CUT/KEEP 决策 → 算清年省。
品牌 Trim("裁剪室")是产品的核心隐喻,不只外壳:删除线/判定记号/裁剪参考线/账本即交互语言——划痕是决定,不是装饰。

## Positioning
「有品味的隐私优先账单工具」:纸面编辑室美学(vestris.ai 参照——米白纸 + 墨线 + 鼠尾草划痕),区别于通用 SaaS 卡片风;
隐私主张为硬承诺(文件不出浏览器),不可为演示效果破坏。

## Operating Context
- 账单文件只在浏览器解析;服务端仅接收结构化行,响应即弃、不落盘(backend 硬约束,勿改)。
- 首页为 Persuade 模式(v2.7 现役):固定报头(章节锚点 + 常驻主 CTA「开始分析账单」)
  → Hero(价值主张 + **产品面板**:年度支出 / 逐条订阅与 CUT·REVIEW·KEEP 记号 / 可省金额)
  → 01 问题 → 02 产品演示(账单 → 本机识别 → 报告)→ 03 订阅分析(三档 + 判定依据)
  → 04 潜在节省(按理由分桶)→ 05 隐私 → 06 支持哪些账单 → 最终 CTA → 裁完之后
  (/deals 与 /annual 出口)→ 打赏 → 报尾。
  首屏以下每节只回答一个问题;首屏产品面板与报告页同源(数字来自 sample-report + report-math)。
  三档判定口径见 `lib/triage.ts`(REVIEW = 证据不足,交回用户)。
- 内页为 Operate 模式,但 v11 起呈「裁切车间」:三个内页(上传/报告/指南)全部以
  纸张/工作台/红笔/裁剪的物理隐喻重构交互 —— 上传 = 全页拖放 + 对折纸展开 + 红线扫描
  (对标 WeTransfer);报告 = 纸条物理分拣(CUT/KEEP 托盘、横快划、拖拽吸附、
  堆叠高度即裁剪前后对比;对标 12 Brews of Xmas);指南 = 三折手册逐面展开
  (对标 Readymag Stories)。共享全局语法(1px 线/纸面/无卡片圆角阴影渐变),
  红笔 = 车间批注层(页/章/划/警);v12 起全站统一批注红(rust #D63B2F),
  鼠尾草绿只保留 token 定义不再使用。
- 部署(2026-09-10 起分叉):**现役线上 = https://leilosss.github.io/(GitHub Pages,`output:"export"` 纯静态)**,
  发布 = `cd frontend && npm run build` → 把 `out/` 推到 gh-pages 分支。
  服务器 `ubuntu@122.51.57.37` 的 Docker 站停在 9-09 旧版(standalone + FastAPI 架构),
  与当前静态源码不兼容,**同步上去会构建失败**,除非先把 Dockerfile 改成 nginx 托管 out/。

## Capabilities and Constraints
- 支持:支付宝 CSV(旧/新表头、GBK/UTF-8、CRLF/LF 混用、脏引号)、微信 xlsx/csv(分隔行、序列号时间、千分位)、
  **Word .docx(交易明细证明转存,按表头定位列;旧版 .doc 给"另存为"指引)**、粘贴文本、账单截图(本机 OCR)。
- ⚠️ 引擎不依赖输入顺序:真实导出普遍"新的在前",`detectLocal` 分组后按时间升序再算间隔(2026-09-11 修)。
- `/report/demo` 为 8 条样本的演示报告,必须标注"示例数据";真实报告路径含报告 id。
- 硬约束(设计语言,以 DESIGN.md 的 token 表为准):禁止卡片容器/圆角/阴影/渐变/玻璃拟态/emoji 图形;
  1px 墨色 hairline、纸面 #F2EDE4、文字墨 #1A1A1A、次文字 #6E6861;v12 起
  **rust #D63B2F = 唯一交互/批注/划痕/焦点色**,sageDeep #3E5543 与 sage #5C7C68 只保留 token 定义;
  标签 = Geist Mono 600 大写宽字距(.mtag,车间层)与 Geist 600 大写(.tag),等宽仅作数字对齐(.num);
  展示行 = 首页 Geist 800 紧排,内页保留 Instrument Serif 大写直体(.display-serif)作旧基线。
- 时序动画必须 IO/JS 加状态类驱动(.is-on / .is-in / .is-triggered),禁止静态开场;
  一次性的、不循环的、有物理理由的动效优先(逐条划线 / 扫描一次),不做表演性特效。
- 尊重 prefers-reduced-motion(全关动画并落终态);focus 指示 rust;对比度 WCAG AA。
- 数据口径唯一入口 = `lib/report-math.ts`(金额)+ `lib/triage.ts`(档位);
  首页/报告/小票/年度体检全部从这里取值,禁止各写一套。

## Brand Commitments
- 隐私优先是产品事实:无注册、无账号、无上传原始文件、会话级存储、一键销毁。
- 不伪造:无虚构用户评价/数据;INDEX 示例账本与演示报告均明示"演示"。
- 品牌名固定 "Trim",无中文副标题。

## Evidence on Hand
- 真实账单(用户本机,未入库):`桌面/支付宝交易明细(20260608-20260908).csv`(48 笔有金额 +
  213 笔 0 元)、`桌面/微信支付账单流水文件(20260807-20260907).xlsx`(30 笔)。
- 回归工具:`backend/scripts/make_fixtures.py` + `validate_fixtures.py`(7 种格式夹具全绿)。
- 缺失声明:无任何第三方评价、案例或新闻素材,未来工作不得编造。

## Product Principles
1. 隐喻一致:每一个动效都有"裁剪"物理理由,不堆特效。
2. 原生滚动与可访问性优先:不劫持浏览器行为。
3. 改动可追溯、回归有据:解析格式改动必须过夹具矩阵。

## Accessibility & Inclusion
- 键盘可达:所有交互元素 focus-visible 鼠尾草深绿描边(1.5px/offset 3px);语义化 HTML(header/nav/main/section/footer)。
- 对比度 AA:正文墨 #2B2927、次文字 #6E6861 于纸面 #F2EFE5;鼠尾草深绿 #3E5543 用于正文级强调与划痕(≈6.6:1),
  亮鼠尾草 #5C7C68 仅 ≥3:1 图形用途;入场动效不承担信息(文字终态全对比)。
- Reduced-motion 关闭全部动画;页面过渡为整页闪切(不影响阅读)。
