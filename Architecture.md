# Architecture & Technical Specification
**Project**: FocusFlow
**Environment**: Windows 11 (Target Desktop), Web (Target Cloud)

## 1. 技术栈选型 (Tech Stack)
*   **Meta-Framework**: Next.js 15 (App Router)
*   **Desktop Container**: Tauri 2.0 (Rust) - 采用 Web Wrapper 模式，应用打包后直接加载 Vercel 线上 URL（生产环境）或 `localhost:3000`（开发环境）。
*   **Database**: Neon (Serverless PostgreSQL)
*   **ORM**: Drizzle ORM
*   **Styling & UI**: Tailwind CSS v3 + shadcn/ui + Lucide Icons
*   **State Management**: Zustand (用于处理计时器状态和跨组件数据流)

## 2. 数据库设计 (Database Schema Blueprint)
系统仅包含三张核心表，严格遵循以下结构（使用 Drizzle Schema 定义）：

### 2.1 `projects` 表
*   `id`: uuid, primary key
*   `name`: varchar(255), not null
*   `type`: enum('general', 'book', 'course'), default 'general'
*   `target_units`: integer (目标页数/课时数，默认为 0)
*   `current_units`: integer (当前进度，默认为 0)
*   `created_at`: timestamp

### 2.2 `tasks` 表
*   `id`: uuid, primary key
*   `project_id`: uuid, foreign key references `projects(id)`
*   `title`: text, not null
*   `status`: enum('todo', 'in_progress', 'done'), default 'todo'
*   `planned_date`: date (计划执行日期)
*   `created_at`: timestamp

### 2.3 `focus_sessions` 表 (时间轴基石)
*   `id`: uuid, primary key
*   `task_id`: uuid, foreign key references `tasks(id)`
*   `started_at`: timestamp, not null
*   `ended_at`: timestamp, not null
*   `duration`: integer, not null (总时长，单位为秒，必须 >= 300)
*   `is_manual`: boolean, default false (是否为手动补录)
*   `created_at`: timestamp

## 3. 核心机制设计与 API 规范

### 3.1 Next.js 架构分层
*   使用 Server Actions (React 19) 替代传统的 API Routes 编写数据库交互逻辑。
*   所有的写操作（Mutations）集中在 `app/actions/` 目录下。
*   所有的读操作（Queries）直接在 React Server Components (RSC) 中执行以实现零客户端 JS 依赖的数据获取。

### 3.2 鉴权机制 (Authentication)
*   **单用户模式**：由于是私人工具，V1 版本采用最轻量的环境变量鉴权。
*   **实现方式**：在 Vercel 环境变量中设置 `ADMIN_PASSPHRASE`，前端使用 HTTP Only Cookie 存储验证通过后的 Token，Middleware 拦截所有未授权请求。

### 3.3 Tauri 与 Web 层的 IPC 通信机制
*   在 Next.js 的客户端组件（Client Components）中，通过 `@tauri-apps/api` 探针检测当前是否在 Tauri 环境内运行。
*   `window.__TAURI__` 检测：
    *   若为 `true`：点击“开启专注”时，通过 Tauri IPC 发送指令，主进程 (Rust) 挂起原窗口，唤醒 `MiniTimerWindow`。
    *   若为 `false` (纯浏览器环境)：优雅降级（Graceful Degradation），仅在当前网页显示网页版计时器。

## 4. 开发流转与 Agent 执行规范 (Rules for AI)
1.  **架构严守**：任何关于数据库表结构的修改，必须先在 `Architecture.md` 中更新，然后再执行 Drizzle 的 migration 命令。
2.  **组件驱动**：使用 `shadcn/ui` 时，务必通过 CLI 命令（如 `npx shadcn@latest add button`）物理导入组件代码，绝不允许手写伪劣的同名 UI 组件。
3.  **幂等性测试**：在实现“时间冲突检测”及“5分钟过滤”逻辑时，必须在对应的 Server Action 文件旁边同步生成单元测试用例。