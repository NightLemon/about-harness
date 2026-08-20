# 迭代与交付状态

## 当前里程碑

| 里程碑 | 状态 | 证据 |
| --- | --- | --- |
| M0 | 完成 | 批准计划 SHA256 `8FEB03…F2964` |
| M1 | 完成 | commit `2847afc…3639`；annotated tag `legacy-baseline-v1` |
| M2 | 完成 | 55 个页面通过 root/project base 构建；legacy hash、事实与负例门禁通过 |
| M3 | 完成 | 20 项 Python 测试、Ruff、Pyright、TypeScript 与无网络容器 smoke 通过 |
| M4 | 进行中 | 模型、harness、framework、领域与安全内容 |
| M5–M8 | 未开始 | 不提前声称完成 |
| M9 | 未授权 | 无 remote、push、PR、Pages 或发布 |

权威进度与恢复点记录在仓库根目录的 `EXECUTION_PLAN.md`。

## Legacy 审阅记录

以下文件是 baseline 前已存在的历史材料，**状态为 legacy/未验收，不计入 v1 十轮**：

| 记录 | 历史主题 | 原件 | 旧路由说明 |
| --- | --- | --- | --- |
| 01 | 术语与范围 | [legacy 01](/reviews/legacy/round-01) | [旧路由](/reviews/round-01) |
| 02 | 信息架构 | [legacy 02](/reviews/legacy/round-02) | [旧路由](/reviews/round-02) |
| 03 | 事实与来源 | [legacy 03](/reviews/legacy/round-03) | [旧路由](/reviews/round-03) |
| 04 | 模型优化方法 | [legacy 04](/reviews/legacy/round-04) | [旧路由](/reviews/round-04) |
| 05 | 跨 Harness 对照 | [legacy 05](/reviews/legacy/round-05) | [旧路由](/reviews/round-05) |
| 06 | 安全 | [legacy 06](/reviews/legacy/round-06) | [旧路由](/reviews/round-06) |
| 07 | 评测 | [legacy 07](/reviews/legacy/round-07) | [旧路由](/reviews/round-07) |
| 08 | 可读性 | [legacy 08](/reviews/legacy/round-08) | [旧路由](/reviews/round-08) |
| 09 | 静态质量 | [legacy 09](/reviews/legacy/round-09) | [旧路由](/reviews/round-09) |
| 10 | 构建与一致性 | [legacy 10](/reviews/legacy/round-10) | [旧路由](/reviews/round-10) |

原件在 M2 迁移时保持 SHA256 不变。为何不能计数见[审阅方法](/meta/review-method)。

## V1 新十轮

| 轮次 | 状态 | 记录 |
| --- | --- | --- |
| 01–05 | 未开始 | M7 创建 |
| 06–10 | 未开始 | M8 创建 |

只有文档记录、artifact 证据、result commit 与 annotated tag 同时存在，状态才改为完成。
