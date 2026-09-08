# KazooTTT Periodic Calendar Page

[中文](#简介) · [English](#english)

Obsidian 全屏周期性笔记日历。从 [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) 读取配置，在主编辑区展示日记、周报、月报、季报、年报，并提供记录统计视图。

![日历日视图](docs/screenshots/calendar-day-view.png)

![记录统计](docs/screenshots/stats-view.png)

## 简介

官方 Calendar 插件只完整支持日记和周报，且固定在侧边栏。本插件提供**主编辑区全屏**日历工作台，完整覆盖 Periodic Notes 的 5 类周期笔记，并支持缩放浏览与写作统计。

### 核心功能

| 功能 | 说明 |
|------|------|
| 三层缩放 | 日视图（月历）→ 年视图（季度块 + 月份格）→ 多年视图（12 年/页） |
| 5 类笔记 | 日记 / 周报 / 月报 / 季报 / 年报 索引、标记、创建与打开 |
| 周期面板 | 按当前月份展示月报，并在季度末、年末展示对应季报与年报 |
| 记录统计 | 按年柱状图：条笔记、字数、记录天数；展示全部有日记的年份 |
| 字数圆点 | 继承 Calendar 逻辑，可配置每点字数（默认 250） |
| 快捷交互 | 悬浮预览笔记内容；⌘/Ctrl+ 点击打开/创建；右键上下文菜单 |

### 与 Calendar 插件对比

| | 侧边栏 Calendar | Periodic Calendar Page |
|--|----------------|------------------------|
| 布局 | 右侧窄栏 | 主编辑区全屏 Tab |
| 月报/季报/年报 | ❌ | ✅ |
| 年/多年鸟瞰 | ❌ | ✅ |
| 写作统计 | ❌ | ✅ |
| 详情面板 | ❌ | ✅ |

## 安装

完整说明见 **[docs/INSTALL.md](docs/INSTALL.md)**。

### BRAT（推荐）

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. 添加 Beta 插件：`KazooTTT/obsidian-calendar-page`
3. 在 Obsidian 中启用 **Periodic Calendar Page**

### 手动安装

将 `manifest.json`、`main.js`、`styles.css` 复制到：

```
<Vault>/.obsidian/plugins/periodic-calendar-page/
```

### 从源码构建

```bash
git clone https://github.com/KazooTTT/obsidian-calendar-page.git
cd obsidian-calendar-page
npm install
npm run build
```

## 使用

| 入口 | 操作 |
|------|------|
| 命令面板 | `打开日记日历` |
| 命令面板 | `打开记录统计` |
| 左侧 Ribbon | 点击 `calendar-range` 图标 |

### 日历模式

- 点击月份标题进入**年视图**，点击年份标题进入**多年视图**
- 月份标题旁可快速打开/创建月报或年报
- 悬浮已有笔记入口或右侧报告卡片可预览 Markdown 内容
- 右侧周期面板跟随当前月份：默认显示本月月报，季度末增加季报，年末增加年报；可在插件设置中开启显示日历中的各周周报

### 统计模式

- 顶栏切换 `日历 | 统计`
- 每年 3 张指标卡，柱图 hover 显示当月数据
- 点击柱图月份 → 自动切回日历并定位该月

## 依赖

- [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes)（必需）
- Obsidian ≥ 1.5.0

## 开发

```bash
npm run dev          # watch 模式
npm run build        # 构建到仓库根目录（main.js）
npm run build:vault  # 同步到指定 vault 插件目录
```

更多文档：

- [安装指南](docs/INSTALL.md)
- [发布检查清单](docs/PUBLISH_CHECKLIST.md)
- [统计视图方案](docs/stats-view-plan.md)

## 路线图

- [x] Phase 1–3：日历核心、缩放、详情面板、统计 Phase 1
- [ ] GitHub 热力图
- [ ] 统计范围可配置、CSV 导出
- [ ] 缺失提醒、禁用旧 Calendar 插件
- [ ] Obsidian 官方社区插件市场上架

## 作者

[KazooTTT](https://kazoottt.top)

## License

MIT — see [LICENSE](LICENSE)

---

## English

**Periodic Calendar Page** is a full-page periodic notes calendar for Obsidian. It reads settings from Periodic Notes and surfaces all five note types—daily, weekly, monthly, quarterly, and yearly—in a dedicated workspace tab, plus a writing statistics view.

### Install

See [docs/INSTALL.md](docs/INSTALL.md). Quick option: install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) using `KazooTTT/obsidian-calendar-page`.

### Commands

- **打开日记日历** — Open calendar view
- **打开记录统计** — Open statistics view
