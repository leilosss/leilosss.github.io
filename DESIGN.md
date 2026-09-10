---
title: "Trim"
# 第 23 版 · Trim 2.0 + v2.5 价格情报页(2026-09-10,由已上线代码逐条核对)
world: cutting-room-paper
tokens: paper #F2EDE4 / ink #1A1A1A / sub #6E6861 / sageDeep #3E5543(仅保留定义) / sage #5C7C68(仅保留定义) / rust #D63B2F(唯一交互/批注/划痕/焦点/选区色) / paperDeep #E7E1CE
---

# Design System: Trim(纸面编辑室)

由已上线代码反推并逐条核对(实现即证据),后续页面遵守本文件。
视觉参照 vestris.ai 的纸面编辑部气质:纸墨 + 编辑记号承载一切表达;不复制其版式与内容。

## Overview
概念驱动的"裁剪室"第八版。删掉旧版的红色兴奋剂,强调色收敛为一支**鼠尾草深绿**(正文级
可读)+ 一支亮鼠尾草(图形级);裁决语言从"红笔"改为"编辑划痕"。**判定语法 = 语义**:
单划痕 = 已决定裁掉,无记号 = 保留,双线交叉 = 疑似重复扣费(仅示例/图例语境)。颜色在
此不承载成功/失败,只承载"纸面上被做了什么"。模式:首页 Persuade(全站唯一带入场时序的
面),上传/报告/指南/404 Operate(即时)。品牌固定 Trim,无中文副标题;中文排版回退系统栈
(Geist 无中文字形,混排是既有事实)。

### v2.5 增量(2026-09-10 · /deals 价格情报 + 打赏 · 报纸式版式)
- **新页面 `/deals`**:Trim 的第二个获客面,两块内容合成一页(价格情报 + 打赏)。
  在这**一页**把印刷报章的完整逻辑用足:报头 → 正文 → 裁切虚线 → 报尾,
  全宽 1px 黑实线做结构分割(其余页面仍用 ink/15 的轻分隔线,不跟着变)。
- **报头**:超大 `TRIM`(clamp 到 124px)+ **方形**红句点落在 M 右下角(全站零圆角,
  句点也用方点而非圆点);右侧等宽 `BILLS, TRIMMED.` 与报头基线对齐;底缘通栏黑实线。
- **价格对比表**(借 Wise 对比表的读法):表头反白(ink 底 / paper 字)、
  网格用 **1px 全墨线**(不是惯用的 ink/15 —— 这一页的表格是主角,配得上全权重)、
  价格走 `.num` 等宽、历史低价以小号灰字挂在年卡格下方、
  结论单独成列(`现在充` = rust 底 paper 字 / `建议等` = ink 框 paper 底)、
  待出手的那一行用 rust/[0.055] 极淡红底高亮。
- **整行可展开**:点击展开 12 个月年卡价走势(1px 墨线折线 + 两个方点)
  与跨渠道对比。**走势窗口刻意取 12 个月** —— 6 个月装不下去年双11的历史低点,
  图上标记与「历史低 ¥X」文案就会互相打架;低点标记落在它**实际发生的那一月**,
  不是折线右端。数据全程标注为示例,不假装实时抓取。
- **中缝裁切线**:横向打孔虚线(`.cut-rule`,与纵向裁切线同一套 7px/14px 打孔节奏)
  + 剪刀图标 + `──────`,呼应裁剪室概念。
- **打赏区**:参考 Buy Me a Coffee 的轻量读法 —— 先选心意再出码;
  三档**不写金额**(与「心意不分多少」一致),档位/收款方式都只是意图,
  页面不接任何支付 SDK,只展示收款码(当前为占位框,放图即用)。
- **图标纪律的兑现**:档位图标原本按需求用 emoji,但 🧋 在 Windows 上**没有字形**
  (渲染成空心方块),且全站本就有「仅 lucide 与自绘 svg,不用 emoji 图形」的硬规定
  → 换成 lucide 线段图标(Coffee / CupSoda / Sparkles / Zap),同一条 1.6 描边。
- **导航与页脚**:导航加 `DEALS`(4 项)。**踩坑**:加第 4 项后 375px 直接横滚
  (IMPORT 按钮被推出视口 40px)→ 窄屏收紧间距(gap-x-2.5 / px-4)、
  裁切标记与标语 `sm` 以下隐藏,375/390/430 三档恢复无横滚。
  `/deals` 自带报头与报尾,故**导航不在该页重复标语**、**全站页脚在该页不渲染**
  (否则一屏里出现两条 `© 2026 TRIM`);页脚的信任四条(无需注册 / 不连银行卡 /
  本地分析 / 本机暂存 7 天)并入该页报尾,不丢信任信号。

### v2.4 增量(2026-09-10 · 截图识别账单 · 浏览器本地 PaddleOCR)
- **新增入口**:账单页截长图 → 上传 → **本机 OCR** → 交易数组 → 现有订阅分析 → Report。
  与 CSV/XLSX/TXT/UPLOAD、PASTE BILL 并列,是同一台工作台上的第四条进料口,
  不新增页面、不改版式 —— 上传页只多了"截图"这一行说明与一块截图路径提示。
- **隐私升级为结构性事实**:推理脚本与模型**自托管在 `/ocr/**`(13MB)**,不引任何
  CDN。测试里两条硬断言保证它不会退化:「图片未以任何方式上传(无非 GET 请求)」
  「OCR 未请求任何第三方域名」。这是"本地分析"从说法变成架构的关键一步。
- **引擎**(`lib/ocr-local.ts`):PaddleOCR PP-OCRv2,按需注入 `/ocr/ocr.js`
  (1.6MB,不进主 bundle —— 上传页产物只 +2.4kB);模型走浏览器 HTTP 缓存,
  复访仅 304 校验(GitHub Pages 实测返回 304 / 0 字节)。
  - **长图自动切片**:1080×4000+ 的长截图整张会被压到 960×960、字极小、
    识别率骤降;改为按正方形切片(12% 重叠)+ 用每行的绝对 y 归属到唯一切片
    去重,再按阅读顺序(分行后行内按 x)拼回。顺带绕开 iOS 超大 canvas 上限。
  - **实测坑**:识别模型只认 `<img>`,直接喂 `canvas` 会检测到 0 个文本框。
- **解析**(`lib/ocr-parse.ts`)**复用而非重写**:OCR 出来的就是一段排好序的账单文本,
  与用户复制出来的同构,因此直接走 `paste-parse` 的锚点解析,只按 OCR 特性调两处:
  - `dateSearch: "pair"`:微信把日期排在金额下方、支付宝排在上方,"取最近距离"
    必然取到相邻交易的日期 → 改为**第 k 个金额 ↔ 第 k 个日期**的序号配对,
    两种版式都对;数量对不上时退回最近距离。
  - 商户名归一化:OCR 对同一商户会给出不同结果(「SpotifyPremium订阅」/「订闻」),
    而识别引擎按「商户+金额」分组,**不归一化同一订阅会被拆成两条、周期规律失效**。
    复用同一份关键词库收敛到规范名,另加保守的编辑距离 1 纠错(Netfix → Netflix,
    限长度 ≥5、前 3 字母一致的拉丁词)。输出仍是 `BillRow[]`,detectLocal 与报告页一行未改。
- **多图合并**:可一次选多张(移动端即系统相册),逐张识别后合并成同一份报告 ——
  这也是 OCR 失败时的推荐出路(分段截图反而更准)。
- **文案纪律**:截图路径写全(支付宝「我的 → 账单 → 选择月份 → 截长图」/ 微信
  「我 → 服务 → 钱包 → 账单 → 截长图」);失败时给两条具体出路而不是一句"识别失败";
  进度**如实**显示"加载识别模型(首次约 11MB)"与"第 n / m 段",不假装进度。
- **修掉一个自己引入的回归**:`paste-parse` 的日期模式默认值 —— `opts` 缺省时
  `undefined !== "up"` 为真,把纯文本粘贴路径误切到 nearest,年化算成 ¥53,655。
  由 `test-paste` 抓到。**改共享函数的默认行为,必须跑既有回归**。

### v2.0 增量(2026-09-09 · 产品级重构 · Subscription Intelligence)
- **原则**:VALUE FIRST, DESIGN SECOND · DO NOT SACRIFICE USABILITY FOR AESTHETICS。
  品牌资产全部保留(牛皮纸 #F2EDE4 / 炭黑 #1A1A1A / 印刷红 #D63B2F / 1px 线 /
  编辑部账单排版 / CUT·KEEP·RECEIPT·COPY LIST·DESTROY 语言);推翻的只有"牺牲可读性的形式"。
- **排版三声部(硬规则)**:① 展示 `.display` / `.sect`(仅品牌、Hero、Section Title)
  ② 正文 `.prose-body` ≥16px / 行高 1.75(移动端不缩小)③ 数据 `.figure` / `.mtag` /
  `.num`(tabular)。**艺术字体禁止承担正文与长段落**。
- **首页 = Storytelling**(非 Feature Cards):Hero「你每年在订阅上浪费了多少?」+
  一句话解释 + START TRIMMING 印章 CTA + 隐私三条 + 30 秒路径条(全在第一屏;
  实测首个 CTA 顶部 467px < 844);滚动叙事 01 小数字 → 02 累加 ¥3,936/年(计数)→
  03 CUT/KEEP 逐条判定(190ms/条)→ 04 省 ¥1,836/年(红色最大字)。
  信任信号只用**可自行验证**的:"断开网络也能用"(不做无法证明的安全宣称)。
- **上传页**:消灭空白态 —— PASTE BILL + TRY DEMO 双入口、粘贴感应纸面、
  「TRIM 会这样识别」示例四行(Netflix ¥49 / Spotify ¥15 / Adobe ¥68 / iCloud ¥6)、隐私四条。
- **报告页(产品最重要的页)**:价值头条 = YOUR SUBSCRIPTION BILL → ¥3,936/年 →
  **红色 YOU CAN CUT ¥1,836/年 · N 个订阅**(页面第一视觉重心)+ TOTAL/CUT/KEEP/SAVE
  四格 + MONTHLY|YEARLY 切换。**主体从「物理散落拖拽台」改为「账单清单」**
  (v11 台面在移动端拥挤且纸条互遮,违反可用性铁律):CUT 区 / KEEP 区分栏,每条带
  理由标签(HIGH COST / DUPLICATE / UNUSED / LOW SIGNAL / RECURRING)+ 一句话依据 +
  CANCEL 入口。**CUT 品牌交互保留并强化**:红裁剪线自左划过 → CUT 印章落下
  (stamp-down 0.34s)→ 金额划掉 → 「→ ¥0」浮入 → 「SAVED ¥N/年」展开;
  横向划动 = 裁/留(移动端最自然的手势)。
- **Guide 页**:修复 v11 三折页在移动端的可读性事故(折面挤压 → 重叠/裁切/字号过小)
  → 三步纵向流式(≥768 三栏并排,折痕线保留纸张语言)+ 平台细则(红笔圈注)+
  批注式 FAQ + 红色隐私便签。VL 复检:"已彻底解决旧版重叠/裁切问题,推荐上线"。
- **商业化(规则全部明示,不做暗示性收费)**:`/pricing` 三档 —— Free(永久免费:
  分析/裁决/清单/小票全包)· Trim Pro ¥6.9 月 或 ¥49 年(价格监测 / 重复检测 /
  历史对比 / 年度体检 / 高级导出)· Concierge ¥9.9 每订阅(人工协助取消,
  **不索取账号密码、不代登录、失败全额退**)。替代品推荐区写明"当前未接入任何佣金
  合作;未来若有佣金会标注推广且不影响排序与判定"。Pro / Concierge 均标注
  "内测中,未开放支付,不会自动扣款"。
- **留存**:`/annual` 年度体检(总支出 / 订阅数 / 涨价项 / 还能省)+ PRICE WATCH
  (基于本机历史记录比对单价,不联网追踪任何平台价格);报告页底部两个出口卡
  通向 Pro 与 Annual。
- **SEO**:title「Trim — Find and cancel subscriptions you don't need」+ 中英双语
  description + keywords + OpenGraph / Twitter + JSON-LD SoftwareApplication(含 offers)。
- **数据准确性回归(新基建)**:`test-paste.js` —— 真实浏览器跑 5 条解析用例
  (日期不被当金额 / 多订阅年化 / 收入行剔除 / 千分位年付 / 单笔不误判),5/5 通过。
  **修掉一个严重 bug**:粘贴文本里日期「2026-06-10」的 2026 被当成金额(年化算成
  ¥48,624);修法 = 金额判定前先 `stripDateTime`,且要求带货币符号或小数位。
  同时修「名称取自清洗后的噪声行」(`isNoise` 必须判清洗后文本;名称优先向上找)。
- **响应式**:1920 / 390 / 375 三档实测无横向滚动;导航精简为 HOW · REPORT · PRICING
  + 常驻 START 按钮(移动端不挤压)。
- **新增文件**:`components/trim/story.tsx`(首页叙事)、`shop/report-headline.tsx`、
  `shop/report-ledger.tsx`、`app/pricing/page.tsx`、`app/annual/page.tsx`。
  弃用:`shop/report-bench.tsx`(拖拽台,保留在库中未引用)。

### v2.3 增量(2026-09-10 · 金额口径单一来源 · 修 ¥0/YEAR)
- **修掉 ¥0 bug(严重)**:真实账单常只有一个月的跨度,识别出的每条订阅只出现一次
  → 没有可实测的扣费周期 → `annual_amount = null` → 各处 `?? 0` 求和
  → 报告头条 `¥3,936/YEAR` 的位置显示 **¥0 / YEAR**,四项指标全 0
  (实测复现:3 个订阅 → TOTAL/CUT/KEEP/SAVE 全为 ¥0)。v2.2 的守卫只覆盖
  「0 个订阅」,没覆盖「有订阅但周期不可测」。
- **新增 `lib/report-math.ts` = 全站唯一计算入口**:`subAnnual` / `sumAnnual` /
  `spendSplit` / `perCycle` / `yuan` / `cycleUnit`。首页叙事、报告头条、账单清单、
  复制清单、裁剪小票、年度体检全部改从这里取值,**不再各算各的**。
  Demo 的 ¥3,936 与 ¥1,836 也改为由订阅推导(原为手写常量),首页与报告从此
  不可能分叉 —— 这是本次改动的结构性收益。
- **年化永不缺失**:周期可测(月 24-36 / 季 85-110 / 年 320-400 天)按实测;
  周期不可测时按最普遍的月付推算 12 期,并由 `isEstimated()` 标出,界面在
  该数字旁如实标注「按 12 期估算」。**沿用既有原则:只陈述账单能证明的事** ——
  因此仍不输出 UNUSED 这类使用情况判断,推算也只标注不隐藏。
- **0 不出现**:空分组(CUT 或 KEEP 为 0 项)不渲染 `¥0 / YEAR`,统一用「—」
  表示「这项不适用」;全部保留时不显示 ¥0 大数字,改显示「全部保留」+
  下一步动作。行内「→ ¥0」保留(它是被划掉的单价的归零写照,不是 ¥0 头条)。
- **头条标签对齐产品承诺**:`YOUR SUBSCRIPTION BILL · YEARLY SPEND` → `¥N / YEAR`
  → `YOU CAN CUT · 你可以裁掉` → `¥N / YEAR` → `POTENTIAL SAVINGS · 裁掉 N 个订阅`。
  单位统一为 `/ YEAR` `/ MONTH`(行级 `POTENTIAL SAVING ¥N / YEAR`)。
- **顺带修**:周期未确认时单价后缀取 `"周期待确认"[0]` 而显示「/周」→ 改用
  专用短后缀表(月/季/年,缺失为「期」)。
- **测试基建**:`serve-out.js`(全站 `output:"export"` 后 `next start` 不可用,
  本地预览与测试改为静态服务 `out/`);`test-report-math.js`(11 项:¥0 守卫 /
  Demo 承诺值 / 首页与报告同源);`test-xlsx.js`(6 项:Excel 日期序列号解析 /
  收入行剔除 / 合计行截断 / 头条无 ¥0);`shot21.js`(截图基线)。
  修 `test-paste.js` 自 v2.2 起失效的断言(头条文案改英文后正则未同步,导致
  4/5 用例长期误报"解析失败"—— 数据准确性防线实际已失守)。

### v12 增量(2026-09-09 · 全站红笔车间 · 3步路径)
- **产品路径**:「导出→上传→标记→导出结果」8 步 → **复制 → 粘贴 → 确认** 3 步;
  用户裁决:全站统一红笔系统(首页也迁入),「编辑室绿」彻底退场。
- **全站铁律落地**:交互/划痕/焦点/选区/进度条/裁切线一律 rust #D63B2F;
  sage/sageDeep 仅保留 token 定义不再使用;选区内红底纸字;focus-visible 红;
  progress-rail 红;cutline 打孔红 + 毛边红实切痕(seed 7)。
- **本土化识别引擎(核心隐私资产)**:`lib/local-detect.ts` = backend detector.py 的
  完整 TS 移植(关键词库 90+ 条/周期窗口/置信度/月度/品类),`lib/paste-parse.ts`
  = 粘贴文本解析(两遍锚点法:金额锚点 → 上下双向找名、向上找日期;微信/支付宝
  复制文本通吃)。**粘贴与文件两条路都 100% 本地 —— 后端零调用**(文件流从此
  不再走 /api/parse+/api/detect;后端仅留 FASTA 版检测供自检)。detectLocal 扩展
  字段 platform(供「去取消」指引)。
- **加密 vault**:`lib/sec-store.ts` — sessionStorage → **localStorage AES-GCM(256)
  加密暂存 7 天**(密钥与密文同机;注释如实声明前端安全边界),`ensureReady()`
  幂等解锁;store.ts 接口不变;「本地暂存 7 天,可手动销毁」红字落地。
- **上传页 = 粘贴工作台**:idle 无边框无按钮(等宽小字「复制账单,粘贴到此处」+
  四角十字 + 「点击读取剪贴板」兜底按钮 + 底部极淡「或拖入账单文件」);
  window paste 事件 → 纸面浮现、原文行逐行显影、红扫描线 2.6s 扫底、无百分比
  「第 X 项 / 共 — 项」;done 0.6s 后滑出自动进报告;error 纸被批回(红 X 圈注+
  「无法识别,请检查账单文本」)。e2e12.js 用真实剪贴板(Ctrl+V)验证全链。
- **报告页 = 智能初裁 + 无文件导出**:真实报告**默认全 CUT**(连续包月/自动续费/
  周期扣款全部先裁,用户做减法);meta 红线「已自动标记 X 项可裁剪」。**inTray
  机制**:v12 初裁全 CUT 时纸条留在台面(浅红+红弯线,清晰可点),**拖入 CUT 托
  才收纳堆叠**;从堆拖出(拖回台面/拖入 KEEP 托)= 取出。三章:COPY LIST(复制
  取消清单,剪贴板,失败兜底下载)/ RECEIPT(生成裁剪小票,canvas 本地 PNG,
  `lib/receipt.ts`)/ DESTROY(页内红框确认)。纸条「去取消」按钮 = 复制平台取消
  指引(浏览器无法深链 App 内页;指引即动作)。
- **首页 = 红化 + 中文叙事 + 双入口**:h1 「自动续费 / 正在悄悄扣你的钱」
  (Geist 800 tracking-tight,取代衬线大写);CutStrikeDemo 钩线叙事(¥328 划→
  ¥186,过判定线触发);LedgerDemo 进判定带后**逐条划线**(220ms/条,默认 3 CUT
  5 KEEP,无整行浸色,仅红线);KPI 4 格(0 上传/100% 本地/2+ 平台/0 注册)计数 +
  红笔对勾;主 CTA = **红色印章** `stamp-cta`(双线公章,「复制账单 开始裁剪」);
  「查看示例报告 →」+「复制→粘贴→直接裁剪」小字。
- **Logo/导航**:Trim 25px(放大 30%)+ 末端红色裁切标记 CutGlyph(剪刀语族)+
  标语改红色等宽小字;全站导航 hover 一律红(前绿已清)。
- **指南页**:A 折改「复制账单」(全选复制,不用导出文件;红圈批注在「全选复制」
  步);隐私便签四条 = 白笔打勾列表。
- **VL 评审**:首页 8.7(红线+标题+印章 CTA = 点睛)/ 上传 9.0(教科书级)/
  报告 9.0(全 CUT 台面被肯定);动效克制,未加 hover 浮起等表演性效果。

### v11 增量(2026-09-09 · 内页车间系统)
- **叙事**:「楼上编辑室(首页,绿裁定)/ 楼下裁切车间(三个内页,红批注)」—— 共享
  语法骨架(1px 线/纸面/无卡片圆角阴影渐变/判定记号),色层分工:绿 = 系统裁定,红 =
  人工复核动作。用户决策:声线分层,首页 v10 资产不动。
- **全局 token 微调(落地用户规范,首页视觉无感)**:`paper #F2EFE5→#F2EDE4`(牛皮纸)、
  `ink #2B2927→#1A1A1A`(炭黑)、`rust #9E3B2F→#D63B2F`(标记红;语义从"仅错误/销毁"
  升级为"批注红"——批/章/划/警,错误与销毁仍是其一);首页所有 rgba(43,41,39,*)
  同步 → rgba(26,26,26,*)。
- **字体系统补全**:Geist 700/800(内页超粗标题 tracking-tight,"工单声部")+
  **Geist Mono 400/500/600(自托管 woff2,`--font-geist-mono`)**;`.mtag` =
  mono 600 大写 0.22em 宽字距(车间层标签/数据/操作文字;`.mtag-lg` 0.3em)。
- **三页交互(全部功能保留,模板组件清零)**:
  - 上传(WeTransfer 式全页拖放):无独立上传框,全页即感应区;中央**对折牛皮纸**
    (两半页 ±14° 微掀 + 折面受光/背光 + 书脊缝;拖入展开铺平、纸缘虚 → 红实线);
    解析 = 红线扫描 3.2s 匀速到底 + 灰轮廓逐行显影;**无百分比**,等宽字
    「正在识别 … 第 X 项 / 共 — 项」;done = 抖动定格 + 0.6s 纸滑出视口自动跳转
    (+「[ 进入裁剪 → ]」红线入口);error = 纸被批回(-3.5° 下陷 + 红 X 圈注章)。
    四角十字标记 = 对齐校准(拖入转红);底部红线声明「⚠ 文件不会离开浏览器」。
  - 报告(12 Brews 物理分拣):无表格,条目 = **错落纸条**(260px,2 列网格 + ±3% 抖动
    + ±4.5° 角;纸棱 = 底层错位纸 3px + 0 1px 硬棱,**无模糊阴影**);三种操作并存:
    ①横快划(≥70px 且 <350ms)= 裁 ②拖进左右细线托(CUT 左 22% / KEEP 右,PointerDrag
    自研:原生 pointer 事件 + gsap.set/to —— **GSAP Draggable 已弃用**:其内部 x/y 缓存
    与布局动画的 gsap.to 互相覆盖导致拖拽死锁)③点末端剪刀标记 = 切换;
    CUT 纸条 = #F5E6E4 浅红底 + **手写弯线**(SVG path 微弯,`spec: 浅红底+红斜线`)
    + 自动归左托堆叠(每张 13px 纸棱,角度/偏移随机化 ±1.6°/±9px,后裁压上);
    左托旁 = 已裁 N 项 + 年省(红),右托旁 = 保留 N 项 + 年留(墨)**,堆叠高度 = 裁剪前后
    对比的可视化**;导出/销毁 = 右下两枚方章(EXPORT/DESTROY,bounce 盖章 + 印泥残影
    红框瞬显)→ 执行;销毁确认 = 页内红框条(非弹窗);预分拣建议 = confidence high
    初始即 CUT(与 v9 同);移动端(<1024)纵列纸条 + 点击切换(禁拖拽)。
  - 指南(Readymag 三折叙事):三折手册俯视(30%/30%/30% + 侧翼 ±14° 微透视),一
    次展开一面(flex-basis 100% 0.65s cubic-bezier(.22,1,.36,1)),再点折回;
    A 导出 = 双平台步骤 + 线条图标 + **关键步红圈虚线批注**(旋转动画);B FAQ =
    全展开"批注式"(问题印刷粗体 / 答案红色等宽 mono,页边批注感,无折叠);
    C 隐私 = **红底白字警示便签**(两角半透明胶带 .tape 微旋 + 底部偏移纸页)。
    锚点导航 → 折面化。
- **e2e 教训**:GSAP 3.13 `import { Draggable } from "gsap/Draggable"` + 手写布局动画
  冲突自锁(拖拽死);`this.dragEndTime` 属性不存在(自己记时间戳);一律自研
  pointer 拖拽更稳。e2e 冒烟脚本见 `frontend` 外 `e2e11.js`(route mock /api/parse
  + /api/detect,本地无后端可跑全链)。

### v10 增量(2026-09-09)
- **展示行字体升级(rsquad 移植)**:display 标题转 **Instrument Serif 400 大写直体**
  (`.display-serif`,upper + -0.015em,等效 rsquad Cortese 大标题语言;CJK 回退宋体系)——
  展示层级 = 衬线大写,正文/标签 = Geist,混排双声部;斜体词(*trims* 等)在大写内仍斜体。
- **品牌样张全站第四处 + 头条处**:hero 右页标题后方 = 样张"剪开"揭示背景
  (ClipRevealImg:交叉剪口菱形 → 整版展开,awwWW clip-path 几何语言 → 纸面版;
  multiply 融纸 + 8% 墨痕,标题居上可读)。
- **零证据统计带(KpiStrip)**:01 与 02 之间横贯纸面深(paperDeep,首个兑现的预留色);
  三格 0 文件上传 / 0 字节存储 / 100% 本地解析,滚动进判定带触发 0→N 计数
  (easeOutCubic 0.9s;数据只陈述事实,不伪造;≥1366 与对开同构:左格 = №010 folio 边注)。
- **无尽纸带(Marquee)**:02/03 之间横贯印刷条,`No upload · No sign-up …` tag 词句
  无缝横滚(rsquad loopScroll 节奏;内容 ×2 复制、track 移 -50% 回环,零 JS);
  分隔符 = 9px 套准十字(PlusCross,与页面记号同族)。aria-hidden 装饰。
- **左出血 folio 化(配比问题的版式解)**:左区不再空置——01 底部竖排
  `№ 010 · Trimming room · working proof`、02 `Privacy by structure`、03 `Marks are decisions`、
  04 `Cut carefully · Keep the rest`(墨带内 paper/45);01 样张随滚动轻微视差
  (ParallaxY,0.06,纸张被翻阅的深度)。
- **毛边实切痕**:v9 直实线 → SVG feTurbulence 位移的纸纤维毛边(seed 7,
  1.5px sageDeep,scaleY 滚动逻辑不变)——裁纸刀口的真实边缘。
- **rsquad 只借节奏、结构与字体语言,不复制**:无 hud 边角网格、无视频、无商品化。

### v9 增量(2026-09-08,同日演进)
- "左右配比怪 + 实线"的诊断:34vw 竖线 × 居中内容 = 常见宽度下文字必然穿线(几何必然)。解法 =
  **对开版式**:≥1366px 首页呈"书脊对开",34vw 线即中缝,一切内容锚定线右,永不穿线;<1366 保持单页。
- 实线 → **印刷裁切语法**:打孔虚线(未裁的纸缘)+ 随阅读深度下放的实切痕(滚动即裁纸)。
- 互动增量吸自 awwWW(github.com/rr3s1/awwWW):45° 几何 wipe 语言 → 按钮刀锋滑入 + 滚动实切;
  排版呼吸参考 rsquad.io——**只借节奏与配比,不换字体**(Geist + Instrument Serif 保持)。
- 品牌样张(用户提供 trim-mark.jpg)以印刷身份落位三处,首尾"纸面版 vs 印墨版"闭环(见 Layout)。

## Colors
- `paper` `#F2EFE5` — 唯一底。body 背景,所有"纸"元素。
- `ink` `#2B2927` — 正文、1px 线、墨块按钮、整块收束带。
- `sub` `#6E6861` — 次级说明/元数据(纸面上 AA 达标)。
- `sageDeep` `#3E5543` — **唯一正文级交互/强调色**:链接 hover、focus 指示、判定划痕、
  整行浸色的源、实况年省数字、步骤编号、active 裁决词;于纸面约 6.6:1,可用于正文。
- `sage` `#5C7C68` — 图形级(≥3:1 用途):裁切线打孔虚线(50%)、`border-sage/50` 区界、btn-light hover(变体保留,现无实例)。
- `rust` `#9E3B2F` — 只用于错误与销毁语义:上传失败框与图标、销毁按钮/确认框描边。永不作装饰与成功。
- `paperDeep` `#E7E1CE` — 调色板已定义、当前页面未使用(预留)。
- `--sage-tint` rgba(62,85,67,.08)— 被裁行的整行浸色(墨绿 8%,v10 自亮绿收敛,更近纸面铅笔痕;仍属 sage 族派生)。

### Named Rules
- 除以上外禁止新色;任何 alpha 必须由既有色派生(ink/15、sage/55、rust/60…)。
- 无"成功绿":成功是纸面上的事实陈述,不用彩色 ✓;上传完成只写字。
- 深底只允许整块 `bg-ink` 区(首页收束带),其上文字一律 paper 系。

## Typography
- Geist Sans 本地托管 woff2(`next/font/local`,latin 子集):400 正文 / 500 展示 / 600 标签与按钮。
- Instrument Serif 400(含 italic):**展示行大写直体 = 标题声部**(`.display-serif`,见 v10 增量),
  拉丁斜体点缀(`.serif-i`、标题内 `*词*` 转斜体、词标 tagline、KPI 后缀 %)。
- `.display`:weight 500、-0.03em、line-height 1.04、text-wrap balance;页面 H1 clamp 36–60,
  首页标题由 EditorialLine 承载(48–92;≥1366 对开右页升至 56–108,标题全宽不再受双栏约束)。
- `.display-serif`:Instrument 400、upper、-0.015em;与 `.display` 同用(锁定 `.ltrs` 逐字机制)。
- `.tag`:Geist 600 + text-transform uppercase + 0.14em 字距、11px——**不是等宽字体**;`.tag-lg` 0.2em。
- 数字一律 `.num`(tabular-nums);等宽字体只用于对齐,禁止整段等宽服装。
- 大标题"显影"= 逐字浮起(见 Motion),不是灰→墨的显影。

## Layout
- 首页(Persuade):原生纵向滚动;**对开版式 ≥1366**(`min-[1366px]:`,page.tsx 模块级
  SPREAD/LEAF/BAND 常量):每节栅格 `grid-cols-[minmax(0,34vw)_minmax(0,1fr)]`——左 34vw =
  出血毛边(纸缘,零内容),右页 LEAF 贴线 40px 起、`max-w ≤ min(1020px, 100vw−34vw−2.5rem)`、
  py-28(04 墨带 BAND/BAND_LEAF:py-32 + 文本居中)。<1366 回退 v8 单页容器(标题全宽 + 双栏),
  行为与上一版一致。34vw 裁切线(`lg:` 起显示,print 隐藏)本体见 Motion(scroll-cut)。
  区块序:01 揭示(实演)→ KPI 零证据带(paperDeep 插页)→ 无尽纸带 → 02 隐私 →
  03 判定记号(纸带既分且连)→ 04 收束;区界一律 `border-t` hairline(带体自带
  border-y),03 区上缘用 `border-sage/50` 区分。
- **品牌样张 trim-mark.jpg**(public/,四处落位,首尾闭环):① hero 右页标题后方背景
  (ClipRevealImg 裁切揭示,w ≤ min(38vw,500px),multiply + 8% 墨痕,标题之上可读);
  ② 01 左出血顶对齐 = 近白底墨印(multiply 融于纸面、w ≤ min(26vw,240px)、与右页正文
  同高起线 pt-28,ParallaxY 视差 0.06);③ 02·03 左出血 = 单枚 rotate-45 Plus 11px
  (top-28 对齐右页标题行);④ 04 墨带左出血 = 反白墨稿(`invert opacity-[.07]`、
  w ≤ min(30vw,300px) + folio 边注,垂直居中)——纸面版 vs 印墨版。全部 aria-hidden 装饰。
- **左出血 folio 边注(v10)**:每区出血缘一枚竖排 `.folio-v` tag 小字
  (vertical-rl,10px,sub/70;墨带内 paper/45),内容见 v10 增量——左区从"空置出血"
  变为"稿纸边缘的文字",治理配比空洞。
- **KPI 零证据带**:全宽 `bg-paperDeep` + `border-y ink/15`,位于 01 与 02 之间;
  ≥1366 内部对开:左 34vw 格 = 竖排 `№ 010 · …`,右 = 三格统计(divide-x ink/15,
  数字 `.num` clamp 34–54 semibold、`.tag` 10px 标签、12px 说明)。
- **无尽纸带**:02/03 之间全宽横贯,`border-b ink/15`,`py-4` 内 `.tag` 11px 词句
  + 9px PlusCross 分隔,`--marquee-speed` 46s 线性无限;内容 ×2 aria-hidden。
- 内页(Operate):纵向流式,内容列 max-w-[1080px],页边 1.5–2rem;h1 后跟 13px 导语。
- 无卡片容器:信息用 1px 通栏线、hairline 行组织;**缝格技术**——外层 grid
  `gap-px border border-ink/15 bg-ink/15`,格 `bg-paper`,1px 缝隙即缝线(报告统计 4 格)。
- Header 桌面一行细排;窄屏导航折为第二行(全宽、横向可滚)。

## Elevation & Depth
- 无阴影、无渐变、无层级浮层。允许的 z 层:固定 34vw 判定线(z-2)、粘顶纸底 header(z-30)、
  main 内容(z-1 之下不受盖)、纸页闪切(z-60)、模态(z-50,在闪切下)。
- 浮层仅销毁确认:纸框 + 1px rust 描边,遮罩 `bg-ink/25`,无模糊。

## Shapes
- 零圆角。记号类形状仅:裁切线两端与毛边的套准十字(rotate-45 方点/Plus 11px)、上传框四角
  11px 十字校准标(自绘 svg PlusMark,非 ✛ 字符)。无胶囊、无玻璃、无发光。

## Components
- **HeaderNav**:顶缘 2px 鼠尾草滚动进度(`.progress-rail` 固定,rAF 驱动 width);跳过链接
  (`tag` 墨底纸字,聚焦滑入);词标 `Trim`(19px semibold 紧排,hover→sageDeep)+ Instrument
  斜体 tagline "bills, trimmed.";`.tag` 大写导航 INDEX / UPLOAD / REPORT(动态:最近报告,
  无则 /report/demo)/ GUIDE,active = ink + 下划线;右侧:示例报告(.linku)+ 开始裁剪(.btn-ink 小号)。
- **Footer / PageTransition**:Footer 全站共享;路由切换以 `page-dip`(0.38s ease-out 纸页闪切)
  呈现,aria-hidden 层盖屏后移除。
- **按钮 `.btn`**:直角 1px 墨框 inline-flex、gap .55rem、600/13px/+.03em、padding .8rem 1.2rem;
  **v9 刀锋(awwWW 45° 几何 wipe → 纸面版)**:`::after` 斜刃(inset -1px -40% 即宽 180%,
  `background: var(--blade, transparent)`,文字下层 z-1 + isolation isolate)初始
  `skewX(-24deg) translateX(-130%)`,hover/focus-visible 归零滑入 0.5s cubic-bezier(.22,1,.36,1),
  仅 no-preference 挂过渡(reduce 由底色过渡接管);**只有 `btn-ink` 配刀**(--blade=sageDeep,
  文字恒 paper 不需要换色 → 刀过与换色零错拍);`btn-paper`/`btn-light` 不配刀(文字须换色,
  与刀过必错拍)→ 透明刀退化为原 hover 底色过渡。`btn-ink` 墨底纸字 hover→sageDeep;
  `btn-paper` 透明 hover 反转为墨底;`btn-light` 纸底 hover→sage(现无实例,变体保留)。
- **文本链接 `.linku`**:纸色 1px 下划线(ink/30,offset 4px),hover 整词转 sageDeep;**墨底禁用**——
  墨带上手写 `text-paper underline decoration-paper/40` hover 白。
- **文本级切换(toggle/筛选/裁决词)**:underline 承载选中语义,不用胶囊按钮——active =
  ink 下划线(裁决为 CUT 时 sageDeep 下划线),inactive = sub、hover→ink。
- **LedgerDemo 实演窗(首页 01)**:1px 墨框纸底;窗顶 `.tag` 标题 + "Demo · 示例数据"角标
  (1px ink/25 细框);行 `grid-cols-[1fr_auto_auto]` + hairline;CUT/KEEP 判定钮 aria-pressed;
  被裁行即划 + `text-sub` + 整行 `--sage-tint`;汇总行 aria-live:月支出总额(被裁时总额划痕)
  → 墨实付 → sageDeep 年省;底注指向 /upload。
- **隐私表(02)**:hairline 行:`.tag` 英文标签 + 19px medium 声明 + 说明右对齐;只陈述产品事实。
- **判定语法(03)**:左列 4 步(01–04 sageDeep 编号 + 标题 + 说明),右列记号图例:单划痕样例
  (sageDeep 1.5px 静线)+ 交叉双线 svg(±9°)+ 尾注"无记号 = 保留;年省不做估算"。
- **收束带(04)**:整块 `bg-ink`;paper 大标题(EditorialLine)+ paper/70 正文 + `btn-ink
  border-paper/60` CTA(sageDeep 刀锋;墨带里墨底靠纸色 1px 描边保可见)+ 纸色下划线链接(禁
  .linku)。≥1366 呈 BAND 对开:左出血 = 反白样张墨稿。
- **统计 4 格(报告)**:缝格网格;数字 26–30 semibold 紧排(已划 CUT 数为 sageDeep),
  `.tag` 9px 标签;整格数字随裁决实时变化。
- **订阅账本(报告,TrimReportList)**:整块 1px 墨框纸底容器;行 = 服务名(`.cut-strike`)/
  周期价 .num / 裁决钮;裁定即:名字划痕 + text-sub、整行 `--sage-tint`、行底 ink/10;
  页脚 "N CUT · M KEEP" + sageDeep 年省。
- **CompareBar(裁剪前后)**:`.tag` 标签 + 1px ink/25 细框(高 7px、p-px 内白)+ 填充宽度
  过渡 0.5s;裁剪前 = ink、裁剪后 = sageDeep;右侧 .num 金额。
- **上传页**:四态 phase machine(idle/parsing/done/error);纸框 idle = dashed 1px ink/35
  → 拖放 = solid sageDeep + `--sage-tint` 浸色 → error = solid rust/60 + rust 5% 浸色;
  四角 PlusMark 随态染色;解析进度 = 1px 墨框 5px + 墨填充(宽 0.15s)+ .num 百分比;
  done 陈述"解析完成,发现 N 个订阅…"无彩色勾,0.8s 自动跳;error = rust XCircle + 原因
  + 重新上传/查看指南(.linku);spec strip 三格(divide hairline):格式/大小/解析;
  底注"文件只在本机解析 —— 不会发送到任何服务器。"
- **指南页**:流程三格 strip(01/02/03 sageDeep `.tag`)→ 锚点导航(.linku)→ 平台列
  (A · 支付宝 / B · 微信:sageDeep tag + 编号 hairline 步骤)→ FAQ(details/summary,
  lucide Plus `group-open:rotate-45`)→ 隐私承诺四格(`border-t` .tag,无 ✔)。
- **404**:静态即裁决:巨型 `.display` "404"(`cut-strike is-cut`,clamp 110–220px)首帧已划好
  (初始态即终态,transition 不触发动画);文案 + `.btn-ink` 返回工作台。

## Motion
- **IO 规则**:一切入场必须由 IO/JS 加状态类触发(useInViewOnce → `.ltrs.is-on` / `.reveal.is-in`),
  禁止静态开场;首页为全站唯一 IO 时序面;Operate 面无入场序列,交互即时(仅局部过渡:
  按钮 .18s、行色 .3s、进度 .15s、对比条 .5s)。
- **EditorialLine 逐字显影**(签名时刻,站内一支,只用于标题):`.ltrs .ch` 初始透明,`.is-on`
  触发 ch-in 0.55s cubic-bezier(.16,1,.3,1),每字延迟 `--i * 16ms` 阶梯,上浮 .4em → 原位;
  行内 `*词*` 段转 Instrument 斜体。
- **区块浮现**:`.reveal.is-in` rise-in 0.55s 同曲线(10px 上浮),用于段落与行,不与逐字叠加。
- **判定划痕**:`.cut-strike::after` = 1.5px sageDeep、`top:52%`、左右 -0.12em、自左 scaleX;
  `.is-cut` 触发 0.4s cubic-bezier(.22,1,.36,1)——点击即划(Operate 即时),无入场等待;
  **`.is-cut` 必须与 `.cut-strike` 同元素**。`.x-strike` ±9° 双线为静态 CSS 记号(示例/图例)。
- **裁切实读感(scroll-cut,首页 v9,线体 v10 毛边化)**:裁切线 = `.cutline-base`(打孔
  虚线:repeating-linear-gradient 向下 sage/50 2px、间隔 10px)+ `.cutline-cut`(v10 起为
  SVG 毛边手工裁线——1.5px sageDeep 线叠 `feTurbulence baseFrequency .08/.0012 scale 2.4`
  位移,纸纤维边缘,seed 7 固定 SSR 稳定;`transform: scaleY(p)`、transform-origin top、
  0.18s linear,no-preference 才挂 transition)。p = scrollY / (scrollHeight − innerHeight)
  (与 progress-rail 同源,rAF 节流);**阅读深度 = 纸被裁开的长度**。reduce:JS 早退、
  scaleY 恒 0,只剩打孔虚线(静态纸缘)。
- **裁切揭示(ClipRevealImg,hero 品牌样张,v10)**:`.tclip` 初始 = 交叉剪口菱形
  (六点 polygon 于 50% 中轴),进判定带 `.is-open` 展开整版 1.15s cubic-bezier(.22,1,.36,1)
  ——"纸被剪开一道十字再展开"的回放,与裁切线/刀锋同族几何语言。
  reduce:`.tclip { clip-path: none }` 恒整版。
- **KPI 计数(KpiStrip,v10)**:进判定带触发,0→N easeOutCubic 0.9s(`useCountUp`,
  rAF;values 0/0/100 —— 零恒显 0,计数只发生在 100)。reduce 直达终值。
- **无尽纸带(Marquee,v10 纯 CSS 零 JS)**:`.marquee-track` 内容 ×2,
  `translateX(0→-50%)` 线性无限(时长 `--marquee-speed`,46s 默认);
  aria-hidden;reduce `animation: none` 静态停在首词。
- **滚动视差(ParallaxY,v10)**:子元素 `translate3d(0, scrollY*speed, 0)`
  (speed 0.06,正 = 滞后于页面上移,浮现"纸被翻阅"深度),rAF 节流同源算法;
  仅 01 左出血样张。reduce JS 早退。
- **刀锋滑入(按钮)**:见 Components `.btn`;hover/focus-visible 触发 0.5s 一次,不循环不常驻。
- **纸页闪切**:page-dip 0.38s ease-out(布局级)。
- **prefers-reduced-motion**:全杀——duration/delay 0.01ms;`.ltrs .ch` 与 `.reveal` 强制终态;
  `.cut-strike::after` 去 transition 并直接 scaleX(1);page-dip 关闭;scroll-cut/刀锋由 JS 早退
  + CSS 门控各自落到静态度。任何新动效必须带此覆盖。

## Print
- 隐藏 `.progress-rail`、`.cutline`、`.no-print`(报告"打印报告"走系统打印,纸底直出)。

## Named Rules(硬性)
- 禁:卡片容器、圆角、阴影、渐变、玻璃拟态、发光、emoji 图形图标(仅 lucide 与自绘 svg)、
  mono-as-costume(等宽只作 tabular 数字)、静态开场动画、色板外新色、彩色成功语义。
- 线宽纪律:结构性 hairline 一律 1px;判定划痕 1.5px;圆形无,若有刻度为方点。
- 判定记号只表达判定:keep 行零记号、零染色;demo/演示数据全程显式标注;不伪造评价与数字。

## Accessibility & Inclusion
见 PRODUCT.md;补充(已实现):html lang=zh-CN;语义 header/nav/main/footer + 跳内容链接;
裁决钮与筛选钮带 aria-pressed;实演窗汇总 aria-live="polite";上传支持键盘(Enter/Space)与
拖放双入口;输入焦点 `focus:border-sageDeep`(搜索框:border-b + 无色变,placeholder
`placeholder:text-sub/70`)。
**浏览器表面(base 层已实现)**:`:focus-visible` = 1.5px sageDeep 实线、offset 3px;
`::selection` sageDeep 底 + paper 字;caret ink;滚动条 10px、ink/22 方头(border-radius 0、
3px 纸色边内嵌)、track 透明;color-scheme light。
