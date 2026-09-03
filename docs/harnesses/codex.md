# 在 Codex 中适配指定模型

## 来源与证据边界

本页把 Codex 视为 coding Harness，而不是某个模型的同义词。产品事实来自官方 OpenAI documentation：

- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)

事实注册表锁定的核对日期为 **2026-08-27**。[FACT:codex-agents-md] [FACT:codex-config] [FACT:codex-sandbox-approval] 滚动文档、账号可用模型、价格、默认值和不同 surface（使用界面/执行表面）仍可能变化，真实运行前必须按目标版本重新确认。

当前仓库只有 E0 静态配置和 E1 迁移职责 fixture；没有启动 Codex、调用模型或证明任何模型配置更好。

## 控制面心智模型

```text
Task prompt
  + effective AGENTS.md chain
  + model/profile/config
  + current cwd/worktree/context
        ↓
      Codex loop
        ↓
sandbox: 技术可达范围
approval: 何时暂停询问
network: 是否及向哪里出站
tools: 实际执行能力
validator: 任务是否真正完成
```

Task prompt 描述本次目标；`AGENTS.md` 提供项目知识；配置决定模型和运行策略；sandbox 限制技术可达范围；approval 决定何时询问；network 独立控制出口。它们不能互相替代。

例如在 `AGENTS.md` 写“不要联网”只是 instruction（指令）；只有执行环境的网络控制才能构成强制边界。把 approval 设得更频繁，也不会自动缩小进程可读取的文件。

## 先冻结一次运行身份

仅写“用 Codex 跑了”无法复现。运行卡至少记录：

```text
Codex surface / exact version / OS
model request / provider / resolved model identity
cwd / repository root / commit / dirty paths
effective AGENTS.md files + ordered hash
user/project config sources + profile + CLI overrides
sandbox mode / approval policy / network policy
tool and MCP inventory + schema/version hash
skills/plugins/subagents enabled state
Task / acceptance / validator / budget
session or task identity / checkpoint / compaction state
```

同一个 model 名在不同 provider、surface 或账号上不一定指向相同执行组合。CLI override、profile、cwd 或指令链变化也会建立新 config ID。

## AGENTS.md：项目知识，不是权限边界

官方文档描述了 `AGENTS.md` 的发现、作用域和覆盖行为。[FACT:codex-agents-md] 适配时应把信息按稳定性与作用域放置：

| 内容 | 推荐位置 | 原因 |
| --- | --- | --- |
| 仓库安装、验证、生成文件禁区 | 项目 root 指令 | 整个仓库共同适用 |
| 子目录测试、风格和架构入口 | 靠近目标目录的指令 | 避免污染无关任务 |
| 本次目标、允许范围与完成条件 | Task prompt / 结构化 Task | 每次任务独立 |
| 长篇背景、设计文档 | 给出路径，由需要时读取 | 节省上下文并减少过期复制 |
| Secret、账号、私人路径 | 不进入指令 | 防止上下文与 trace 泄漏 |

高质量指令写模型无法从代码可靠推断的事实：构建入口、必跑测试、生成文件、危险目录、报告要求。不要堆积“认真思考”“写好代码”等不可验证口号。

运行时需要确认**实际加载**的指令链，而不是只检查某个文件存在。Cwd、repository root 或嵌套目录错误，可能让正确文件完全不生效。

## 配置层：显式记录最终有效值

`.codex/config.toml` 示例：

```toml
# Static teaching example; verify fields against the target Codex version.
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

这个示例表达三项独立选择：

1. 工作区写入由 sandbox 模式约束；
2. 需要时由 approval 流程暂停；
3. workspace-write 环境中的 network 明确关闭。

它没有指定 model、provider、profile、MCP 或凭据。这样静态示例不会暗示账号可用性，也方便读者在真实实验中把模型作为独立变量。

配置可能来自不同层和启动参数。真实 run 保存所有有效来源、覆盖关系和最终值；只附项目文件不能证明用户级配置或 CLI override 没有改变结果。

## Sandbox、Approval 与 Network 分开验证

### Sandbox

验证技术边界，而不是询问模型“能否访问”。设计安全 canary（探针）：允许目录读取应成功，范围外合成路径的读取/写入应在副作用前失败。不要用真实私人文件做 canary。

### Approval

选择一个可逆、无外部影响的合成动作，确认它在 handler 前进入 ask；拒绝后终态应是 stopped/denied，而不是循环改写参数绕过。Approval 事件保存动作、参数摘要、决策人与时间。

### Network

网络关闭时，用受控目标验证出站失败，并从执行环境观察实际出口。模型声称“没有联网”不是证据。启用网络也不等于允许任意域名；destination allowlist、proxy 和目标身份仍要独立限制。

三项探针分别报告，不能用一次“任务没出错”同时证明它们。

## 静态示例的文件职责

仓库路径 `examples/harnesses/codex/` 包含：

```text
AGENTS.md            项目工作流、范围、验证与报告要求
.codex/config.toml   approval、sandbox、network 基线
README.md            前置、验证、失败、清理、回滚与证据说明
```

`AGENTS.md` 要求先读任务和相关文件、只在示例项目内工作、不使用网络/凭据/remote/destructive command，并报告退出码、改动、未决与回滚。它是行为指导；真正强制限制来自配置与运行环境。

## 输入与安全基线

静态教程的输入只有上述三份示例文件，不包含账号、模型请求、Secret 或真实仓库 trace。真实资格测试则使用一次性练习仓库、固定 commit、合成 canary 和可由本地测试判定的小改动；不得把私人仓库、生产凭据或外部写操作作为首次试用输入。

## 运行静态验证

前置条件是 Node.js 22+、锁定依赖已安装，并从仓库根目录执行：

```powershell
npm run examples:check
npm run examples:self-test
```

预期：

```text
Harness examples check passed ...
Harness examples negative tests passed ...
```

第一条确认三套示例结构完整；Codex 配置必须含 `approval_policy = "on-request"`、`sandbox_mode = "workspace-write"`、`network_access = false`，并扫描 credential、个人路径和危险命令。第二条在临时副本中删除回滚章节，确认 checker 会真实失败。

这是 E0 静态验证：只证明文件和项目规则满足 checker，不证明 Codex 已安装、字段在目标版本可用或 runtime 边界实际生效。

## 真实资格测试的最小顺序

真实试用需要另行选择无私人数据的隔离仓库，并冻结目标 Codex/version/model/provider。按以下顺序晋级：

### 1. Config discovery

确认 repository root、cwd、trust、有效 `AGENTS.md`、config/profile/CLI override。任一来源未知时不进入能力比较。

### 2. Read-only smoke

只开放 read/search/list，要求返回固定文件 hash 与引用。检查 context 是否来自目标 worktree，而不是其他 checkout。

### 3. Policy probes

分别执行允许读取、拒绝范围外读取、可逆 ask、网络拒绝。断言 gate 在工具 handler 前生效。

### 4. Local reversible edit

在隔离 worktree 修复一个有失败测试的小问题。验证实际 diff、允许路径、目标与回归测试；不允许 dependency、remote 或网络。

### 5. Resume/cancel

在工具完成后 checkpoint，取消下一步，再恢复。确认未决副作用、Task 与 config 身份没有丢失，迟到结果不能覆盖取消终态。

### 6. Model comparison

只有前五步合格后，才能在相同 Codex/Harness/Task/工具/预算下替换 model。协议或权限失败不计为模型能力失败。

## 模型适配卡

为每个候选记录：

```text
requested + resolved model / provider
Codex version + surface
reasoning/effort + sampling/output limits
AGENTS/config/profile/tool hashes
context construction + compaction state
sandbox/approval/network
Task set + split + repeats
acceptance + safety + duration + token/cost
failure types + human interventions
```

不要从聊天流畅度或一次完成得出“更适合 Codex”。结论必须限定 workload，例如“小修保持低预算，多文件调试使用更高档位”，并附版本和回退配置。

## 工具、MCP、Skill 与 Subagent

新增能力会改变上下文、权限和供应链：

- 工具/MCP：保存 server、transport、schema、身份、timeout 和数据目的地；
- Skill/plugin：保存来源、版本、触发、脚本、依赖和卸载；
- Subagent：保存子任务契约、工具范围、上下文、预算和父级验收；
- 自动上下文：保存选择/压缩规则，避免任务间污染。

先在只读合成任务中验证，再逐步开放写入。插件或 MCP 能被发现不等于已授权执行；子 Agent 返回完成不替代父级 validator。

## 状态、恢复与 Git

Codex task/session、Git worktree、模型上下文和外部系统状态是不同层。恢复时至少核对：

```text
Task/config/model identity
repository commit + current diff
last confirmed ToolResult
pending/unknown side effects
checkpoint/compaction lineage
remaining acceptance + budgets
```

Git 能恢复文件版本，但不能撤回已发送消息或远端写操作。Timeout 后先查询目标系统；不要因为切换分支或重新打开任务就自动重试。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| 指令未生效 | cwd、root、加载链、文件作用域 | 模型不服从 |
| 配置值异常 | user/project/profile/CLI precedence | 随机行为 |
| 文件不可写 | sandbox、路径、worktree、handler error | 模型不会编辑 |
| 未询问就执行 | approval 有效值、工具分级 | 指令不够强 |
| 网络意外可用 | network policy、proxy、执行环境 | 模型主动绕过 |
| 工具反复调用 | ToolResult、call ID、error/retry | 推理能力差 |
| Resume 重复操作 | checkpoint、幂等、外部对账 | 模型忘记了 |
| 测试绿但需求错 | Task acceptance 与 validator | Codex 已完成正确 |
| 换模型后整体变化 | provider、config、context、effort | model 唯一变量 |

修复后重跑原失败、相邻正例和安全负例。一次只改变一个主要变量。

## 失败、清理与回滚

静态验证不启动 Codex、模型或网络，只产生临时进程；负例自测使用系统临时目录并自动清理。若静态 checker 意外接受 `approval_policy="never"`、开放网络、credential 或缺失回滚，停止并修 checker/负例，不放宽示例。

真实试用发生以下情况立即停止：版本/字段不匹配、加载来源未知、范围外写入、网络越界、trace 泄密、模型身份不明或 validator 不可复现。

共享配置放在独立 commit，使用隔离 worktree。回退前审阅 diff，再用可追溯的 revert 恢复共享配置；个人 config、task/session 和外部副作用按各自记录处理，不假定 Git revert 能覆盖。

## 已知限制与检查题

示例不包含真实 model、skills、MCP、subagents、用户级配置或不同 surface 行为；官方来源是产品事实，静态配置为 E0，迁移 fixture 为 E1。二者都不证明账号可用性、Codex 运行质量或模型优胜。

1. `AGENTS.md`、sandbox、approval 和 network 分别承担什么？
2. 为什么项目配置正确仍不能证明最终有效配置相同？
3. Sandbox 探针为什么不能用模型自报作为证据？
4. Resume 时 Git 状态之外还要核对哪些副作用？
5. 换模型比较时为什么必须固定 Codex surface 和配置？

下一步运行[三个 Harness 对照](/harnesses/comparison)与[迁移案例](/labs/migration)，再用[模型—Harness 匹配](/optimization/model-fit)定义自己的任务矩阵。
