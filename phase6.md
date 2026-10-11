# FocusFlow UI & Architecture Major Overhaul (Phase 5)

请阅读以下全新的产品需求与设计规范。我们即将对系统进行一次深度的“指挥中心”化改造，并进一步确立「高对比度 IDE 极客美学」。

## 一、 视觉色彩规范更新 (The Core Aesthetic)
请在全局 CSS 和 Tailwind 配置中，更新以下核心色彩，覆盖所有界面的重点色：
1.  **Background**: 纯黑 `#000000` (bg-black)。所有面板分割依然使用 1px 的 `border-zinc-800`。
2.  **Primary Accent (克莱因蓝)**: `#002FA7`。用于主要的 CTA 按钮、进度条填色、当前选中的 Tab 背景。
3.  **Highlight/Alert (硬核亮红)**: `#BC0C0C`。极少量使用。仅用于：24小时时间轴的“当前时间指示线”、严重警告、删除按钮的 hover 状态。
4.  **Typography**: 数字、计时器、图表轴线刻度，强制使用 `font-mono` (等宽字体)。

## 二、 核心重构任务 (Action Items)

### Task 1: 废除旧首页，构建「Command Center」仪表盘
- 路径：重构 `app/page.tsx`。
- 布局参考 Notion Dashboard 风格，但在视觉上保持 1px 硬线风格。
- **顶部模块**：
  - 左侧：极大字号的动态时钟（HH:MM:SS）与当前日期。
  - 右侧：调用 `https://api.open-meteo.com/v1/forecast` (使用经纬度 22.31, 114.17 默认香港/亚太，只需获取 current weather code 和 temp)，实现极简纯文本天气展示。
- **下半部分（双栏布局）**：
  - 左栏：Active Projects Progress (查询进行中的项目，展示极简线性进度条)。
  - 右栏：Today's Tasks (直接列出计划在今天的待办，支持直接勾选)。

### Task 2: 数据库扩容与「Habits」模块开发
- 在 Drizzle schema 中新增两张表：
  1. `habits`: `id`, `name`, `created_at`
  2. `habit_logs`: `id`, `habit_id`, `date` (YYYY-MM-DD), `completed` (boolean)
- 运行 migration 并在侧边栏新增 `/habits` 路由。
- **UI 布局**：实现一个 7 天网格矩阵（左侧为习惯名称，右侧为周一到周日的圆形/方形复选框）。勾选时触发 Server Action 直接更新 `habit_logs`。

### Task 3: 高级数据看板 (Pro Analytics)
- 重构 `/analytics` 页面。使用 `recharts` 库。
- 顶栏：今日专注总时长、总专注次数（对比昨日的趋势 ↑↓）。
- 图表 1 (Line Chart)：近 14 天每日总专注时长趋势。
- 图表 2 (Bar Chart)：最佳专注时段（统计各个小时段 00:00-23:00 的专注频次分布）。
- 图表 3 (Heatmap)：纯手工用 CSS Grid 画一个类似 GitHub 的极简年度贡献热力图，展示每天的专注强度。
- *注意*：所有数据聚合必须在 Server Actions 层的 SQL/逻辑中完成，禁止向 Client 传递全量流水数据。

### Task 4: 24小时垂直时间轴 (Vertical Timeline) 重构
- 目标页面：`/focus` 页面右侧 Sidebar。
- 顶部保留 Date Picker，允许向前翻看历史日期。
- **渲染逻辑 (Absolute Positioning Math)**：
  - 构建一个总高度为 `1440px` (24h * 60px) 的相对定位容器，左侧带有 00:00 到 23:00 的刻度。
  - 遍历该日的 `focus_sessions`，将其渲染为绝对定位的 Block。
  - Block `top` = `(start_hour * 60 + start_minute) px`。
  - Block `height` = `duration_in_minutes px`。
  - Block 背景色：克莱因蓝 `#002FA7`，透明度 80%。
- **当前时间线 (Current Time Indicator)**：
  - 如果选中的日期是“今天”，在这个容器里注入一根红色的 1px 绝对定位横线 (bg-[#BF0808])。
  - 使用 `useEffect` 每分钟更新这根线的 `top` 值，使其精准对应当前物理时间。

请严格遵守「绝对直角、无毛玻璃、不写占位符」原则，逐步执行以上 Task。