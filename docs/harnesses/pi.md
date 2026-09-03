# 在 Pi 中适配指定模型

## 来源与证据边界

Pi 在这里指终端 coding Harness。产品事实固定到维护仓库 commit [`496185f`](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)，并于 **2026-08-27** 复核。[FACT:pi-readme]

固定源码说明该版本的核心工具、session、compaction（上下文压缩）、context files、skills、prompt templates 和 TypeScript extensions。真实执行前仍需核对安装 artifact、目标 model/provider、运行环境和本地 `--help`；仓库没有安装或启动 Pi。

本页示例为 E0 静态证据；跨 Harness migration fixture 为 E1 责任接缝。二者都不能证明 Pi 可用性、OS 隔离或模型质量。

## 控制面心智模型

```text
Task + context/project files + model/provider settings
        ↓
      Pi session tree
        ↓
read / write / edit / bash + reviewed extensions
        ↓
external runtime isolation + project trust + user policy
        ↓
tests / diff / result / checkpoint
```

Pi 的最小核心给使用者较大的组合空间，这意味着更多责任留给项目和运行环境：

- Context files 指导模型，但不是 OS policy；
- Project trust 决定是否信任项目资源，不等于细粒度批准系统；
- `read/write/edit/bash` 提供能力，Task 和外部 policy 决定是否允许；
- Session/compaction 管理对话状态，不自动证明外部副作用已恢复；
- Extension 可改变工具、UI 和循环，同时扩大供应链与权限面。

“可扩展”不是“默认安全”，“核心小”也不是“缺少能力”；应按 workload 判断需要哪些外部控制。

## 冻结运行身份

一条可复现 Pi run 至少记录：

```text
Pi source/build/package identity + exact version
OS / shell / terminal / cwd / repository commit
project trust decision + loaded project/user resources
model request / provider / resolved model identity
models adapter / endpoint / reasoning setting
effective context files + AGENTS + prompt template hashes
skills / packages / TypeScript extension inventory
core and extension tool schemas
session branch/tree / resume point / compaction events
runtime isolation / network / credential scope
Task / acceptance / validator / budgets
```

只固定 Pi commit 仍不足以复现模型 run；Provider、model、context、extension、session 和外部隔离都是 config 的一部分。

## 核心工具与工具边界

固定版本向模型提供 `read`、`write`、`edit`、`bash` 四个核心工具。[FACT:pi-readme] 这四个名字不能自动说明安全范围：

| 工具 | 学习时应验证 | 外部补充控制 |
| --- | --- | --- |
| `read` | 路径解析、大小/编码、范围外拒绝 | 受限用户、只挂载允许目录 |
| `write` | 新建/覆盖语义、原子性、失败状态 | 隔离 worktree、路径 allowlist |
| `edit` | 匹配歧义、重复文本、diff | 版本控制、目标测试 |
| `bash` | cwd、环境、timeout、退出码、子进程 | 无网络容器、命令/资源限制 |

模型提出调用后，仍需 Task allowlist、路径/命令 policy 和执行环境。即使项目指令写“不要访问凭据”，广泛 shell 权限仍可能技术上可达。

Extension 新增工具时保存 schema、错误、timeout、数据目的地、side effect 和卸载方式。不要把一个未经审查的 extension 当成“只是更方便的 prompt”。

## Project Trust 与配置来源

固定文档说明项目设置只在项目被信任后加载；`defaultProjectTrust` 是全局设置，不能放进本例项目文件。[FACT:pi-readme]

Trust 是对项目级配置、资源或扩展来源的决策，不代表项目内每段文字可信，也不替代 OS sandbox。首次打开不熟悉仓库时：

1. 先在不加载项目扩展的只读方式检查文件；
2. 查找 `.pi`、脚本、hook、package 和 credential 引用；
3. 记录 trust 决策者、时间和审阅 commit；
4. 信任后仍使用最小身份、无网络或隔离 worktree；
5. 仓库 commit 改变时重新评估高风险资源。

不要将用户级 trust 状态复制进项目或提交给他人。

## 静态设置示例

`examples/harnesses/pi/.pi/settings.json`：

```json
{
  "defaultThinkingLevel": "medium",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "provider": {
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

示例表达三个教学选择：

- 显式固定默认 thinking 档位，避免比较时依赖隐式值；
- 显式开启 compaction，并记录输出预留与最近上下文；
- 将 provider 隐藏 retry 设为 0，让 Harness/实验记录原始失败。

`maxRetries=0` 不是所有生产场景的通用建议。生产可做有界 retry，但必须保存原失败、重试 lineage、budget 与 idempotency；研究基线先消除隐藏重试有利于归因。

示例不指定 model/provider、不含 credential，也不安装 extension。真实运行时这些字段在独立配置卡中记录。

## Context、Template 与 Compaction

Context files、AGENTS 和 prompt templates 都会改变模型实际输入。适配时保存：发现路径、加载顺序、渲染结果 hash、变量、来源和 trust label。

Compaction 是有损状态转换，不是单纯节省 token。压缩前后至少验证：

```text
Task goal + acceptance
allowed/forbidden resources
current plan + completed steps
last confirmed ToolResult
pending/unknown side effects
test failures + unresolved
model/provider/config identity
```

设计一个负例：在长日志前写入“不得修改 generated/”，触发 compaction 后要求编辑相邻文件；如果禁区丢失，应停止并调整 state/summary，而不是归因模型不听话。

不同 compaction 参数会改变配置身份。比较 thinking 或 model 时应保持参数和触发位置一致。

## Session Tree 与恢复

Session、tree、fork、export/import 可以帮助探索和交接，但对话状态与工作树、工具 cache、外部系统不是一回事。恢复卡至少包含：

```text
session/fork identity
source commit + current diff
last confirmed action/result
idempotency keys + external resource IDs
pending approvals / unknown writes
compaction point + effective context hash
remaining acceptance + budgets
```

Fork 后两个分支如果共享同一外部账号，仍可能产生冲突副作用。写工具必须使用业务幂等或隔离目标；不能只依赖 session branch。

## 静态示例文件

`examples/harnesses/pi/` 包含：

```text
AGENTS.md         项目范围、禁网/凭据/remote/extension 与验证要求
.pi/settings.json thinking、compaction 与 provider retry 基线
README.md         前置、字段、失败、清理、回滚和证据边界
```

AGENTS 是指令层；容器、受限账户或隔离 worktree 才能补充技术边界。README 明确 project trust、session 和用户级设置不由项目 revert 自动恢复。

## 运行静态验证

前置条件是 Node.js 22+、锁定依赖已安装，从仓库根目录执行：

```powershell
npm run examples:check
npm run examples:self-test
```

预期输出包含：

```text
Harness examples check passed ...
Harness examples negative tests passed ...
```

Checker 会解析 JSON，拒绝项目中的 `defaultProjectTrust`、credential-shaped key、隐藏 provider retry 和缺失 compaction。负例自测向临时 Pi 设置加入合成 `apiKey`，确认 checker 非恒真。

静态通过不证明 Pi 能解析文件、模型可用或 compaction 行为与描述相同。它只证明项目示例满足 E0 教学契约。

## 静态断言

审阅实际文件并确认：项目设置不含 model、provider、credential 或 extension；`defaultProjectTrust` 没有被放进项目文件；compaction 被显式配置；provider `maxRetries` 为 0；AGENTS 同时说明范围、停止、验证与回滚。任一断言失败都应修正示例，不能只依赖命令退出码。

## 真实资格测试顺序

### 1. 安装与身份

从固定源码/构建 artifact 确认版本和 hash；记录 Pi、Node/runtime、model/provider 与 adapter。目标帮助或 schema 与固定文档不符时停止。

### 2. Trust 与 Context

在无私人数据仓库中确认何时加载项目设置、AGENTS/context/template。用合成冲突规则验证实际有效顺序，不让未知 extension 自动运行。

### 3. 核心工具

分别测试允许读取、范围外拒绝、隔离 worktree 编辑、失败命令、timeout 和输出截断。保存 ToolCall、退出码、diff 与副作用。

### 4. Session/Resume

完成一次读取和一次本地编辑后 checkpoint/fork/resume。核对工作树、工具结果、unresolved 与 budgets，不只检查聊天文本。

### 5. Compaction

用固定长上下文触发一次压缩，比较压缩前后必须保留的 Task/policy/state。丢失禁区或 pending write 时不进入模型能力评测。

### 6. Extension

只有无扩展基线合格后，才逐个增加 review 过的 extension，运行来源、schema、权限、网络、error、timeout 和卸载负例。

### 7. Model A/B

最后在相同 Pi/config/context/tool/isolation 下替换 model 或 thinking。基础设施、协议和 extension 失败单独分类。

## 模型适配卡与评测

```text
Pi version/build + model/provider/resolved identity
thinking/sampling/output limits
context/AGENTS/template/compaction hashes
core + extension tools
trust + OS isolation + network + credential scope
session/fork/resume strategy
Task split + repeats + validator
success/safety/duration/token-cost/human turns
failure distribution + rollback configuration
```

不要把更长 session、更多 extension 或更高 thinking 与模型一起变化后归因给模型。报告默认基线和合理调优后配置，结论限定 workload 与目标版本。

## OS 隔离与 Network

当前项目不假定 Pi 固定版本拥有与 Codex 或 Claude Code 同名、同语义的 OS sandbox。需要硬边界时使用：

- 只挂载必要目录的容器；
- 无网络或 destination allowlist；
- 非管理员/受限用户；
- 隔离 worktree 和临时输出目录；
- 独立、最小 scope 的 provider credential；
- 目标系统自身 authorization。

这些属于整体 Harness 配置，应进入 run identity。容器无网络不等于 host extension 没有网络；必须确认工具/extension 实际在哪个进程执行。

## Extension 供应链

每个 TypeScript extension、skill、template 或 package 至少审查：

```text
source / immutable revision / license
install/build scripts / dependencies
loaded code path / lifecycle / update policy
new tools and context / permissions / network
credential and data destinations
error/timeout/cancel behavior
disable/uninstall/rollback
```

项目被信任不代表其中第三方 dependency 已审计。Extension 更新后重新跑核心工具、compaction、session 和安全负例。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| 项目设置未生效 | trust、cwd、文件位置、目标版本 | 模型不服从 |
| Thinking 档位异常 | effective settings、model 支持、adapter | 模型随机性 |
| 长任务漏约束 | context set、compaction、summary | 模型记忆差 |
| 工具越界 | 外部 isolation、Task/policy、extension | 指令不够长 |
| Tool result 丢失 | session/event/extension mapping | 模型规划 |
| 重复副作用 | retry、idempotency、resume state | 模型重复请求 |
| Fork 相互影响 | worktree/账号/外部目标是否隔离 | session tree 本身 |
| 扩展后退化 | extension version/schema/context/network | 模型升级 |
| 测试绿色但任务错 | Task acceptance 与 validator | Pi 已正确完成 |

一次只改变一个主要变量；修复后重跑原失败、相邻正例与 trust/越权/compaction 负例。

## 失败、清理与回滚

静态验证不生成 Pi session，也不启动模型。真实试用中出现版本/字段不符、未知项目资源加载、范围外写入、网络越界、context/compaction 丢失硬约束或 trace 泄密时立即停止并回到无扩展基线。

项目设置用独立 commit；回退时审阅 diff 后生成可追溯 revert。用户级设置、project trust、session、extension cache 与外部资源不在项目 commit 内，按各自创建记录单独恢复/撤销。

不要把私人 session、用户级配置或 credential 复制进仓库。外部写状态未知时先对账，不因 resume/fork 自动重放。

## 检查题与下一步

1. Pi 的最小核心为什么让外部运行环境承担更多控制责任？
2. Project trust 与 OS sandbox 为什么不是一回事？
3. Compaction 前后必须保留哪些 Task 和副作用状态？
4. Session fork 为什么不能单独保证外部写入隔离？
5. 比较模型时为什么必须冻结 extension 与 context/template？

下一步阅读[扩展与供应链安全](/security/supply-chain)、[三个 Harness 对照](/harnesses/comparison)和[迁移案例](/labs/migration)。
