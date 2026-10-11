# FocusFlow (极简 All-in-One 个人管理系统)

> 以“时间流”为绝对核心的个人管理系统。剔除数据孤岛，所有项目、待办、习惯最终收敛于专注时间轴（Timeline）。Web 优先，支持 Tauri 2.0 桌面端悬浮小窗与原生增强。

---

## 1. 技术栈 (Tech Stack)

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **UI / Styling**: Tailwind CSS v4 + shadcn/ui + Lucide Icons (深黑主题 + 克莱因蓝 `#002FA7` 强调色 + 毛玻璃质感)
- **Database & ORM**: Neon Serverless PostgreSQL + Drizzle ORM
- **State Management**: Zustand
- **Desktop Container**: Tauri 2.0 (Rust) 双窗口模式（主工作台 + 悬浮微型计时器 `mini-timer`）
- **Testing**: Vitest (核心业务规则覆盖率 100%)

---

## 2. 快速启动 (Getting Started)

### 2.1 环境变量配置

复制环境变量模板：
```bash
cp .env.example .env.local
```

在 `.env.local` 中配置以下环境变量：
```bash
# Neon Serverless PostgreSQL 连接串 (必须包含 ?sslmode=require)
DATABASE_URL="postgresql://neondb_owner:password@ep-example.us-east-2.aws.neon.tech/focusflow?sslmode=require"

# 单用户身份认证口令 (进入系统时必须输入)
ADMIN_PASSPHRASE="your-secure-passphrase"
```

### 2.2 数据库 Schema 同步

确保数据库连接配置完毕后，运行以下命令将表结构推送到 Neon：
```bash
npx drizzle-kit push
```

该命令将同步以下 3 张核心表：
- `projects`：项目分类（通用分类 / 书籍阅读 / 网课）及进度跟踪。
- `tasks`：具象任务项，关联项目，支持 `todo` / `in_progress` / `done` 状态流转。
- `focus_sessions`：专注时间轴基石，严格记录每次专注起止时刻与时长。

### 2.3 运行单元测试

```bash
npm test
```

包含三大硬性业务规则测试：
1. **碎片过滤规则**：正计时结束若时长 < 300 秒（5分钟），拒绝写入并提示丢弃。
2. **幽灵截断规则**：正计时时长若 > 14400 秒（4小时），强制截断为 4 小时。
3. **冲突检测规则**：手动补录严格进行时间段重叠检测（Overlap Detection）。

### 2.4 启动 Web 开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)，输入配置的 `ADMIN_PASSPHRASE` 即可进入工作台。

---

## 3. 生产部署指南 (Production Deployment)

### 3.1 部署到 Vercel (Web 端推荐)

1. 将代码推送到 GitHub 仓库。
2. 在 [Vercel Dashboard](https://vercel.com) 点击 **New Project** 并导入仓库。
3. 在项目设置中添加环境变量：
   - `DATABASE_URL`: 生产环境 Neon 数据库连接串。
   - `ADMIN_PASSPHRASE`: 强密码管理员口令。
4. 构建命令保持默认 `npm run build`，输出目录保持 `.next`，直接部署。

### 3.2 桌面端运行与编译 (Tauri 2.0)

本项目已配置完整的 Tauri 2.0 骨架 (`src-tauri`) 与权限策略：

- **桌面开发调试**：
  ```bash
  npm run tauri:dev
  ```
- **桌面构建打包**：
  ```bash
  npm run tauri:build
  ```

> **系统编译依赖提示**：
> - Windows: 需要安装 Rust 工具链 (`rustup`) 以及 Visual Studio C++ 生成工具 (MSVC `link.exe`) 与 WebView2 运行时。
> - 在纯浏览器环境中运行时，系统通过 `BroadcastChannel` 与 Popup 机制实现零依赖的优雅降级。

