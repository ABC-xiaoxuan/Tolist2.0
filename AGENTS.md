# ToList2.0 项目代理说明

## 语言与沟通

- 默认使用中文回复。
- 输出保持简洁，优先给结论、改动、验证结果和下一步。
- 不编造命令输出、测试结果、路径、版本、URL 或外部状态。

## Shell 约束

- 按个人全局规则，所有 shell 命令优先加 `rtk` 前缀。
- 查询文件优先用 `rg` / `rg --files`。
- 不执行删除、重置、强推、发布、修改远程状态、使用凭据或付费资源等高风险动作，除非用户明确授权。

## 项目概况

- 应用：ToList Desktop，本地优先桌面待办应用。
- 前端：React 18、TypeScript、Vite 6、Tailwind CSS v4、lucide-react。
- 桌面端：Tauri v2、Rust。
- 数据库：本地 SQLite，通过 `@tauri-apps/plugin-sql` 访问，连接名为 `sqlite:tasks.db`。
- 主要入口：
  - 前端入口：`src/main.tsx`
  - 主应用：`src/app/App.tsx`
  - 数据访问：`src/app/database.ts`
  - 类型定义：`src/app/types.ts`
  - 业务组件：`src/app/components/`
  - Tauri/Rust 入口与迁移：`src-tauri/src/lib.rs`
  - Tauri 配置：`src-tauri/tauri.conf.json`

## 常用命令

```bash
rtk npm install
rtk npm run dev
rtk npm run build
rtk npm run tauri dev
rtk npm run tauri build
```

- 前端快速验证优先跑 `rtk npm run build`。
- 桌面能力、窗口、托盘、SQLite、更新器相关改动需要用 `rtk npm run tauri dev` 或 Tauri 构建验证。
- 发布脚本涉及 GitHub Release、安装包和更新清单，属于外部可见操作，执行前必须确认。

## 编码约定

- 保持最小正确改动，遵循现有 TypeScript、React 和 Rust 风格。
- 前端路径别名 `@/*` 指向 `src/*`。
- 业务数据类型优先维护在 `src/app/types.ts`。
- SQLite 查询和任务数据转换集中在 `src/app/database.ts`。
- Tauri 命令、插件初始化、托盘和数据库迁移集中在 `src-tauri/src/lib.rs`。
- UI 组件优先复用 `src/app/components/ui/` 中已有 shadcn 风格组件和 `lucide-react` 图标。
- 不为未来假设新增抽象，不做无关重构，不引入不必要依赖。

## 数据库与迁移

- 已发布或已应用过的迁移不要直接改内容。
- 表结构变化必须在 `src-tauri/src/lib.rs` 新增更高版本迁移。
- 修改任务字段时同步检查：
  - `src/app/types.ts`
  - `src/app/database.ts`
  - 相关视图组件和弹窗组件
  - Rust 侧迁移与 SQL 默认值

## UI 与体验

- 这是紧凑型桌面工具，不要做营销式落地页。
- 保持界面密度适中、操作直接、信息易扫读。
- UI 改动后尽量用浏览器或 Tauri dev 进行视觉验证；涉及窗口、浮窗、托盘或透明背景时必须做运行验证，无法验证要说明原因。
- 注意主窗口和浮窗两种窗口标签：`main` 与 `floating`。

## 发布与更新

- 当前版本号分别在 `package.json` 和 `src-tauri/tauri.conf.json`。
- 更新端点配置在 `src-tauri/tauri.conf.json`，指向 GitHub Releases 的 `latest.json`。
- 发布相关脚本位于 `scripts/`，执行前必须确认授权和目标版本。
- 不要擅自修改签名、公钥、更新地址或发布流程。

## 验证要求

- 改代码后能跑就跑：
  - `rtk npm run build`
  - Rust/Tauri 相关改动按需跑 `rtk npm run tauri dev` 或 `rtk npm run tauri build`
- 如果因为依赖、系统环境、网络或平台限制无法验证，最终回复中明确说明失败命令、错误信息和剩余风险。

