# 发布检查清单

独立 GitHub 仓库发布与 Obsidian 社区上架前的待办项。

## 已完成

- [x] 独立仓库目录结构（源码 + 构建配置）
- [x] `README.md`（含截图、中英文说明）
- [x] `docs/screenshots/` 效果图（相对路径，非 Obsidian 双向链接）
- [x] `docs/INSTALL.md` 安装文档（BRAT / 手动 / 源码构建）
- [x] `LICENSE`（MIT）
- [x] `versions.json`（当前版本 → minAppVersion 映射）
- [x] `.gitignore`
- [x] 仓库根目录提交 `main.js` 构建产物（供 BRAT / 手动安装）

## 发布到 GitHub 后建议立即做

- [ ] 创建首个 GitHub Release（tag `0.8.15`，附上 `manifest.json` / `main.js` / `styles.css`）
- [ ] 在 README 中将 `<repo-url>` 替换为正式仓库地址（若尚未替换）
- [ ] 测试 BRAT 从 `KazooTTT/obsidian-calendar-page` 安装

## 社区插件市场上架（可选，尚未完成）

参考 [Obsidian 插件发布流程](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)。

- [ ] 在 `obsidianmd/obsidian-releases` 提交 PR，添加插件条目
- [ ] 准备插件市场用简短描述（英文）与标签
- [ ] 确认 `manifest.json` 字段完整：`id`、`name`、`version`、`description`、`author`、`authorUrl`、`isDesktopOnly`
- [ ] 每个新版本更新 `versions.json` 并打 Git tag
- [ ] 考虑添加 GitHub Actions 自动构建 `main.js` 并发布 Release

## 文档 / 推广（可选）

- [ ] 写一篇简短介绍文章（博客 / 公众号）
- [ ] 在 README 添加 Obsidian 论坛/showcase 链接（发布后）
- [ ] 录制 GIF 演示缩放与统计切换

## 功能层面（产品待办，非发布阻塞）

- [ ] GitHub 热力图统计
- [ ] 统计范围可配置、CSV 导出
- [ ] 缺失提醒
- [ ] 正式停用旧 Calendar 插件的迁移说明

## 仓库文件说明

| 文件 | 用途 |
|------|------|
| `manifest.json` | Obsidian 插件元数据 |
| `main.js` | 构建产物，**安装必需** |
| `styles.css` | 插件样式 |
| `versions.json` | 社区插件版本兼容表 |
| `src/` | TypeScript 源码 |
| `docs/screenshots/` | README / 文档用图，随仓库分发 |