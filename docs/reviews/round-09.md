# 第 9 轮：静态质量

日期：2026-08-20

## 审阅目标

让本地检查能阻止常见文档回归，而不是只依靠 VitePress 能否渲染。

## 检查方式

- 阅读 `scripts/check-docs.mjs` 的覆盖范围。
- 对照侧栏、首页 action、Markdown 链接、锚点和全部页面路由。
- 检查“迭代记录已完成”与 review 文件是否一致。

## 发现与修正

| 严重性 | 发现 | 修正 |
| --- | --- | --- |
| P1 | 原检查器不读取 VitePress 侧栏/首页 action，导航可以指向不存在页面但检查仍通过 | 解析 `link:` 路由并与 Markdown 路由表核对 |
| P1 | 只检查链接目标文件，不检查 `#锚点` | 建立标题 slug 表并验证页内/跨页锚点 |
| P2 | 新页面可能未加入任何导航或正文链接 | 增加入链统计，除首页外零入链直接失败 |
| P2 | 同页重复标题会产生冲突 URL | 检查 H2–H6 的重复 slug |
| P2 | changelog 可标“完成”但缺少对应审阅记录 | 校验轮次编号、链接与 review 文件存在性 |
| P3 | GitHub Pages 构建所需 lockfile/workflow 可能被误删 | 将 package、lockfile 和 deploy workflow 纳入必需文件 |

## 验证

- `npm run docs:check` 通过，报告 35 个 Markdown/路由。
- 已存在的 `/foundations/security#数据流与隐私` 锚点通过检查。
- 全部非首页页面至少有一个正文或导航入链。

## 未决项

外部 URL 状态不纳入每次本地检查，避免网络抖动让构建不确定；事实刷新轮次应单独打开官方页面。自制 slug 规则覆盖本项目当前中英标题，若未来引入自定义锚点或复杂 Markdown 标题，应改用 VitePress 同源解析器。

