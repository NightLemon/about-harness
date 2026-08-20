# 在 Pi 中适配指定模型

核对来源为官方维护仓库固定 commit [`496185f`](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)，日期 2026-08-20。本机没有 `pi` CLI，因此没有本地版本探针。

## 最小核心

固定 README 将 Pi 描述为 minimal terminal coding harness，可用 TypeScript extensions、skills、prompt templates、themes 与 packages 扩展；默认向模型提供 `read`、`write`、`edit`、`bash` 四个工具。[FACT:pi-readme]

最小核心意味着更多责任落到使用者：模型/provider、项目 trust、context files、扩展来源、权限、验证和恢复都需主动设计。

## Session 与上下文

固定版本文档列出 session resume/new/tree/fork/export/import、compaction、context files、skills 与 extensions。迁移时保存 session branch、context usage、compaction 发生点和 extension 清单；长会话成功不能证明压缩没有丢失验收条件。

## 优化流程

1. 固定 Pi commit/release、model/provider 与 models adapter；
2. 以默认四工具和无扩展建立基线；
3. 用固定仓库任务探测 patch、shell、测试和恢复；
4. 只在具体失败需要时增加 skill/extension/provider；
5. 对 extension 做 schema、timeout、权限、来源和卸载测试；
6. 比较 session/compaction 与新会话策略；
7. 记录任务成功、工具错误、上下文、成本、延迟和人工介入。

## 风险

Extension 能改 UI/工具/循环，供应链和权限风险高；session 分享可能包含源代码、路径或凭据。公开前执行脱敏和许可检查。

## 当前证据

产品事实绑定固定 commit；未安装 Pi、未运行模型，操作与性能状态分别为 untested/E0。
