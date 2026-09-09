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
- 首页为 Persuade 模式叙事(原生纵向滚动 + IO 时序触发 + v10 对开版式:≥1366 呈书脊对开,
  34vw 线即中缝、内容锚定线右永不穿线,线本体为印刷裁切语法——打孔虚线 + 毛边实切痕;
  展示行 Instrument 衬线大写;01 与 02 间为 paperDeep 零证据统计带、02/03 间为无尽纸带;
  品牌样张四处落位含 hero 剪开揭示背景、全出血区 folio 竖排边注;
  <1366 回退单页版式),内页为 Operate 模式。
- 内页为 Operate 模式,但 v11 起呈「裁切车间」:三个内页(上传/报告/指南)全部以
  纸张/工作台/红笔/裁剪的物理隐喻重构交互 —— 上传 = 全页拖放 + 对折纸展开 + 红线扫描
  (对标 WeTransfer);报告 = 纸条物理分拣(CUT/KEEP 托盘、横快划、拖拽吸附、
  堆叠高度即裁剪前后对比;对标 12 Brews of Xmas);指南 = 三折手册逐面展开
  (对标 Readymag Stories)。共享全局语法(1px 线/纸面/无卡片圆角阴影渐变),
  红笔 = 车间批注层(页/章/划/警),绿 = 编辑室裁定层(首页)。
  34vw 线即中缝、内容锚定线右永不穿线,线本体为印刷裁切语法——打孔虚线 + 毛边实切痕;
  展示行 Instrument 衬线大写;01 与 02 间为 paperDeep 零证据统计带、02/03 间为无尽纸带;
  品牌样张四处落位含 hero 剪开揭示背景、全出血区 folio 竖排边注;
  <1366 回退单页版式),内页为 Operate 模式。
- 部署自愈:服务器 `ubuntu@122.51.57.37`,frontend 容器 0.0.0.0:80;改动需前端清目录重建(见项目记忆)。

## Capabilities and Constraints
- 支持:支付宝 CSV(旧/新表头、GBK/UTF-8、CRLF/LF 混用、脏引号)、微信 xlsx/csv(分隔行、序列号时间、千分位)。
- `/report/demo` 为 8 条样本的演示报告,必须标注"示例数据";真实报告路径含报告 id。
- 硬约束(设计语言,已按建成代码与 DESIGN.md 承诺):禁止卡片容器/圆角/阴影/渐变/玻璃拟态;
  1px 墨色 hairline、纸面 #F2EFE5、文字墨 #2B2927、次文字 #6E6861;鼠尾草深绿 #3E5543 为唯一正文级
  交互/强调/划痕色,亮鼠尾草 #5C7C68 仅图形级用途(≥3:1),rust #9E3B2F 仅错误与销毁;
  标签 = Geist 600 大写宽字距(.tag,非等宽),等宽仅作数字对齐(.num);展示行 v10 起为
  Instrument Serif 大写直体(.display-serif,rsquad 大标题语言),Geist 500 紧排(.display)
  保留作非主页标题基线,Instrument Serif 斜体作拉丁点缀。
- 时序动画必须 IO/JS 加状态类驱动(.is-on / .is-in),禁止静态开场;首页(Persuade)为唯一入场时序面,
  内页(Operate)交互即时、无入场序列。
- 尊重 prefers-reduced-motion(全关动画并落终态);focus 指示鼠尾草深绿;对比度 WCAG AA。

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
