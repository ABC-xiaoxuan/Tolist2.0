# ToList Desktop

ToList Desktop 是一款本地优先的桌面待办事项应用，面向日常任务记录、快速查看和轻量统计场景。应用采用紧凑窗口设计，支持主窗口、系统托盘和待办浮窗，让当天任务可以一直以低打扰的方式停留在桌面上。

数据默认存储在本机 SQLite 数据库中，不依赖云端服务。软件也内置了 GitHub Releases 更新能力，后续发布新版本后，客户端可以通过更新入口检查并下载更新。

## 核心功能

- 本地待办管理：新增、编辑、删除、完成切换任务。
- 日 / 周 / 月视图：按日期查看任务，并支持切换不同周和月份。
- 延迟任务：当天未完成的任务会自动顺延到下一天，并标记为“延迟任务”。
- 统计概览：展示任务总数、待完成、延迟任务数和完成率。
- 每日一言：调用 `https://v1.hitokoto.cn/?c=f&encode=text` 获取纯文本句子并展示。
- 待办浮窗：独立小窗快速查看今日待办，支持收缩、展开、置顶和自定义颜色。
- 主题颜色：支持自定义主程序和浮窗颜色，任务圆圈等关键状态会同步使用主题色。
- Q 版电子角色：统计区域内置可互动虚拟角色，添加任务、完成任务等操作会触发反馈动作。
- 数据工具：支持导出任务、备份数据库、清空数据和检查更新。
- 系统托盘：主窗口可隐藏到托盘，保持应用后台运行。

## 技术栈

- 桌面框架：Tauri v2
- 后端语言：Rust
- 前端框架：React 18
- 开发语言：TypeScript
- 构建工具：Vite 6
- 本地数据库：SQLite，基于 `@tauri-apps/plugin-sql`
- 样式方案：Tailwind CSS v4
- 图标库：`lucide-react`
- 日期处理：`date-fns`
- 自动更新：`@tauri-apps/plugin-updater` + GitHub Releases
- 发布脚本：PowerShell + GitHub CLI

## 项目结构

```text
project/
  src/                  前端源码
  src/app/App.tsx       主应用入口
  src/app/database.ts   SQLite 数据访问层
  src/app/components/   业务组件与浮窗组件
  src-tauri/            Tauri / Rust 桌面端代码
  scripts/              Windows 打包、更新清单、GitHub Release 发布脚本
```

## 本地运行

安装依赖：

```bash
npm install
```

启动桌面开发模式：

```bash
npm run tauri dev
```

只构建前端：

```bash
npm run build
```

## 打包与发布

构建 Windows 安装包：

```bash
npm run tauri build
```

项目也提供了封装好的发布脚本：

```bash
npm run release:windows
```

生成更新清单：

```bash
npm run release:manifest
```

发布到 GitHub Releases：

```bash
npm run publish:github -- -SkipBuild
```

当前更新地址配置在 `src-tauri/tauri.conf.json`：

```text
https://github.com/ABC-xiaoxuan/Tolist2.0/releases/latest/download/latest.json
```

发布新版本时，需要同步更新 `package.json` 和 `src-tauri/tauri.conf.json` 中的版本号，并上传安装包、签名文件和 `latest.json`。

## 数据存储

应用使用 SQLite 本地数据库保存任务数据，数据库由 Tauri SQL 插件预加载：

```text
sqlite:tasks.db
```

数据库迁移在 `src-tauri/src/lib.rs` 中维护。已经发布或已经应用过的迁移不要直接修改内容，如需变更表结构，应新增迁移，避免出现 “migration was previously applied but has been modified” 的启动错误。

## 仓库地址

[ABC-xiaoxuan/Tolist2.0](https://github.com/ABC-xiaoxuan/Tolist2.0)
