# 跨 Harness 迁移：保留职责而非文件名

## 前置条件与固定版本

使用 Python 3.11+、`uv 0.11.16` 和仓库锁定 fixture，保持离线。产品配置只按页面列明的来源版本解释，实验不会启动三个 harness。

## 目标、版本与输入

把一个受约束的 coding 工作流从 Codex 分别映射到 Pi 和 Claude Code。案例固定六类职责：instructions（指令）、tools（工具）、sandbox（技术隔离）、approval（人工批准）、network（网络出口）和 state（恢复状态）。从这里开始正文使用中文简称，配置键仍保留英文。

产品事实以 2026-08-21 的[事实注册表](/references/fact-registry)和[兼容矩阵](/references/compatibility)为边界；容器与三平台本地入口见[实验环境](/labs/setup)。输入 fixture 不写真实产品配置，只保存可审计的职责语义。

## 一条映射必须回答什么

| 字段 | 中文问题 | 不合格示例 |
| --- | --- | --- |
| `source_semantics` | 源环境真正保证什么？ | 只写“有权限控制” |
| `target_semantics` | 目标环境用什么机制承担同一职责？ | 只改文件名 |
| `gap` | 哪些语义并不等价？ | 把 approval 当 sandbox |
| `compensating_control` | 缺口由什么外部控制补偿？ | 缺口存在但写 `none` |
| `evidence_axis` | 结论来自 source、local、seam 还是 live？ | 用 E1 seam 冒充 live |
| `preserves_boundary` | 目标边界是否不宽于源边界？ | 默认开放 network |

Pi 没有被假定拥有与 Codex 同名的 OS sandbox；案例要求用无网络、只读容器或受限账户补偿。Claude Code 的 permission/hook/sandbox 也必须按目标版本探测，不能因为名称相似就宣布等价。

## 运行、预期与断言

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
```

预期 `paths_checked=2`、`mapped_responsibilities=12`、`domains_checked=5`，并且 `missing`、`uncompensated_gaps`、`boundary_violations`、`verbatim_targets` 都为空。`control_boundaries_preserved=true` 且 `config_copied_verbatim=false` 才算通过。

Runner 会拒绝未知 harness、缺少六类职责、空语义、无补偿 gap、边界扩大和整条目标路径逐字复制。负例同时覆盖：

1. 把 Claude Code 每项目标语义都改成 Codex 源语义；
2. 把 Pi 网络改成 unrestricted，且补偿控制为 `none`。

## 迁移到不同领域时再检查一层

Harness 职责相同，不代表领域状态相同。迁移报告还要逐项保留：

| 领域 | 必须随迁移验证的状态 |
| --- | --- |
| Coding | cwd/worktree、测试与 diff、checkpoint/回滚 |
| 浏览器 | profile 与 origin allowlist、页面注入边界、副作用批准 |
| 研究 | 来源快照、主张—引用连接、冲突与拒答状态 |
| 数据 | schema/单位、PII masking、只读与行数上限 |
| 文档 | parser/chunk hash、版本过滤、索引权限与删除 |

这些清单只证明迁移契约可执行，不证明真实产品或模型已经通过。迁移后必须在目标环境重跑领域验收。

## 失败、清理与回滚

任何职责缺失、目标权限扩大、未补偿 gap、输入 checkpoint 丢失或目标验证未运行都要停止迁移。当前案例不写产品配置；真实迁移应保留 source 配置，在隔离目录生成 target 配置，失败时删除候选并恢复 source checkpoint。

## 已知限制

没有真实三 harness 运行，也未固定同一模型/provider，结果只能作为 E1 迁移契约证据，不能用于性能排名。后续 E2/E3 必须记录精确版本、surface、模型、指令 hash、工具、权限和预算。

下一步：[评测方法](/evaluation/method)。
