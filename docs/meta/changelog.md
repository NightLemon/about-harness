# 迭代与交付状态

## 当前里程碑

| 里程碑 | 状态 | 证据 |
| --- | --- | --- |
| M0 | 完成 | 批准计划与本地执行证据 |
| M1 | 完成 | commit `2847afc…3639`；annotated tag `legacy-baseline-v1` |
| M2 | 完成 | annotated tag `m2-complete-v1`；知识地图、站点骨架、事实与作品集门禁 |
| M3 | 完成并修正 | annotated tag `m3-corrected-v1`；最小 harness、容器与离线 runner |
| M4 | 完成 | annotated tag `m4-complete-v1`；模型、harness、framework、领域与安全内容 |
| M5 | 完成 | annotated tag `m5-complete-v1`；六案例、正式 schema、评测与公开 E1 结果 |
| M6 | 完成 | `m6-complete-v1`；来源、许可、隐私、CI、视觉和发布自动化，本地全量门禁通过 |
| M7 | 完成 | Round 01–05 的 findings、修正、验证、result commit 与 annotated tags |
| M8 | 进行中 | Round 06–09 完成；Round 10 与 release candidate 待执行 |
| M9 | 未授权 | 无 remote、push、PR、Pages 或发布 |

权威进度与恢复点记录在仓库根目录的 `EXECUTION_PLAN.md`。

## Legacy 审阅记录

以下文件是 baseline 前已存在的历史材料，**状态为 legacy/未验收，不计入 v1 十轮**。[FACT:review-legacy]

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
| [01](/reviews/v1/round-01) | 完成 | 知识地图覆盖与 stale milestone 防回归 |
| [02](/reviews/v1/round-02) | 完成 | 正式学习路线、环境基线与评分锚点防回归 |
| [03](/reviews/v1/round-03) | 完成 | 控制面契约、真实退避与 timeout 边界防回归 |
| [04](/reviews/v1/round-04) | 完成 | Responses 工具循环、reasoning state 与 effort 证据防回归 |
| [05](/reviews/v1/round-05) | 完成 | 四轴兼容证据与 sandbox/approval/network 职责防回归 |
| [06](/reviews/v1/round-06) | 完成 | 临时 fixture CLI、六案例容器与跨平台教程防回归 |
| [07](/reviews/v1/round-07) | 完成 | 逻辑矩阵唯一性、split/token 汇总与晋级阻断防回归 |
| [08](/reviews/v1/round-08) | 完成 | JSON/JSONL 脱敏 fail-closed、镜像 digest 与 workflow 权限 scope 防回归 |
| [09](/reviews/v1/round-09) | 完成 | 两条迁移路径、六类职责、边界负例与三视口迁移视觉防回归 |
| [10](/reviews/v1/round-10) | 验证中 | 发布证据链、事实逐项锚点与 Node.js 22+ 基线防回归；complete tag 待创建 |

只有文档记录、artifact 证据、result commit 与 annotated tag 同时存在，状态才改为完成。
