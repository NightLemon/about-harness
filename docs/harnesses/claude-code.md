# 在 Claude Code 中适配指定模型

## 来源与证据边界

产品事实来自：

- [Memory](https://code.claude.com/docs/en/memory)
- [Settings](https://code.claude.com/docs/en/settings)
- [Permissions](https://code.claude.com/docs/en/permissions)

Settings 与 permissions 于 **2026-08-27** 实际核对；memory 页面沿用 **2026-08-20** 的注册记录。[FACT:claude-memory] [FACT:claude-settings] 模型、套餐、默认值、managed policy 和不同 surface 行为仍须在目标版本确认。

仓库只提供 E0 静态配置；没有安装 Claude Code、调用 Claude 模型或验证真实 permission/sandbox/hook。跨 Harness fixture 的 E1 只证明迁移责任可执行，不证明产品兼容性。

## 控制面心智模型

```text
Task
  + effective CLAUDE.md / rules / memory
  + model + active settings
        ↓
  Claude Code agent loop
        ↓
permissions / hooks / sandbox / execution identity
        ↓
tools / MCP / plugins / subagents
        ↓
diff / tests / trace / human review / recovery
```

`CLAUDE.md`、rules 和 auto memory 属于 conversation context（对话上下文），不是不可绕过的 policy。[FACT:claude-memory] Shared settings、permission rules、sandbox、hooks 和 managed controls 承担更硬的控制，但其实际语义必须由目标版本与探针确认。[FACT:claude-settings]

指令说明“应该怎样做”；permission/policy 决定“是否允许”；sandbox/身份决定“技术上能触达什么”；validator 决定“任务是否完成”。

## 冻结运行身份

一条可复现 Claude Code run 至少记录：

```text
Claude Code exact version / surface / OS
model request / provider surface / resolved model identity
cwd / repository root / commit / dirty paths / trust state
effective CLAUDE.md + rules + memory identities/hashes
all active settings sources + CLI flags + managed controls
permission allow/ask/deny + rule match observations
sandbox / network / execution identity
hooks / tools / MCP / plugins / subagents inventory
context/compaction/session state
Task / acceptance / validator / budgets
```

只附 `.claude/settings.json` 不足以证明最终配置，因为个人 local、CLI、managed 或其他有效来源可能改变行为。无法解释有效来源时标记 `unknown`，不进入能力比较。

## CLAUDE.md、Rules 与 Memory

适合放入 context 的信息：

- 仓库安装、测试、架构入口；
- 生成文件和目录作用域；
- 代码风格中无法从 formatter/linter 自动判断的部分；
- 完成时必须报告的 diff、命令和未决项；
- 子目录特有规则与来源。

不应放入：Secret、账号 ID、私人路径、临时事故详情、可由测试强制的权限边界，以及未经核验的旧产品行为。

Memory 中的旧结论、网页内容或工具结果可能过期或受污染。使用时保存来源、时间、作用域与 trust label；当前代码和 validator 与 memory 冲突时，不让旧摘要覆盖事实。

设计一条负例：memory 写“测试已通过”，但当前固定测试应失败。合格系统必须运行 validator 并报告失败，而不是复述 memory。

## Settings 与 Permission 分层

示例共享配置 `examples/harnesses/claude-code/.claude/settings.json`：

```json
{
  "permissions": {
    "allow": [
      "Read(./docs/**)",
      "Glob(./docs/**)",
      "Grep(./docs/**)",
      "Bash(npm run examples:check)"
    ],
    "ask": ["Edit(./docs/**)"],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "WebFetch",
      "Bash(git push *)"
    ]
  }
}
```

它表达：

- 只读范围限定在 `docs`；
- 只允许一条确定性本地检查命令；
- 编辑 `docs` 进入 ask；
- 环境文件、WebFetch 和 push 进入 deny；
- 没有 `Bash(*)`、credential、model 或 provider。

官方文档说明 permission rule 的匹配与优先行为；真实运行仍需对目标版本做 allow、ask、deny 探针。[FACT:claude-settings] 不要因为 JSON 能解析就断言实际 gate 生效。

## Allow、Ask、Deny 怎么验证

### Allow

选择一个合成、无敏感内容的 `docs` 文件，读取并验证 hash。允许动作失败时检查 cwd、pattern、active settings 和 sandbox，不先扩大成全局读取。

### Ask

在隔离 worktree 中编辑一个可恢复的练习文件。确认 prompt 在 handler 前出现；拒绝后文件 hash 不变，终态明确为 denied/stopped。不要使用真实生产写操作测试 ask。

### Deny

使用合成 `.env.example-denied` 或受控命令 canary，不触碰真实 Secret/remote。断言调用在副作用前失败。若 deny 与 allow 冲突，以目标版本实测和官方文档为准，保存匹配规则和 event。

### Sandbox / Network

Permission rule 是工具层决策，不自动证明 OS 文件和网络不可达。另用执行环境探针验证范围外路径、子进程和出站；必要时使用容器、受限用户与 destination allowlist 补偿。

## Hook 的正确位置

Hook 可以在工具生命周期执行确定性检查、记录或阻止行为，但不应成为隐藏的第二个 Agent。适合：

- 在 ToolCall 前验证路径、命令或资源；
- 注入稳定的 lint/test validator；
- 记录脱敏 audit event；
- 对外部写操作执行批准与幂等检查；
- 在 session 结束时生成结构化未决项。

每个 hook 保存触发点、输入/输出 schema、timeout、exit code、失败默认值和脚本 hash。Hook crash 时应 fail open 还是 fail closed 必须按风险明确，不能让未知错误静默放行。

不要把网络调用、长时模型调用或未经审查的仓库脚本藏在高频 hook；这会引入延迟、递归和供应链风险。

## 静态示例文件

`examples/harnesses/claude-code/` 包含：

```text
CLAUDE.md              项目工作流、范围、验证和报告
.claude/settings.json  最小 allow/ask/deny 基线
README.md              前置、配置、负例、清理、回滚和证据边界
```

`CLAUDE.md` 明确仓库文本与 ToolResult 是不可信数据；设置层才承担工具 gate。示例没有 local settings、managed policy、hook、plugin 或真实 model。

## 运行静态验证

前置条件是 Node.js 22+、锁定依赖已安装，并从仓库根目录执行：

```powershell
npm run examples:check
npm run examples:self-test
```

预期输出包含：

```text
Harness examples check passed ...
Harness examples negative tests passed ...
```

Checker 解析 permission 数组，拒绝 `Bash(*)`、缺失 `WebFetch`/`git push` deny、credential、个人路径和危险命令。负例自测在系统临时副本中加入 `Bash(*)`，确认静态门禁真实失败。

这只是 E0：没有启动 Claude Code，也没有证明 permission pattern、sandbox 或模型在目标版本可用。

## 真实资格测试顺序

### 1. 版本与配置发现

记录 Claude Code version、surface、cwd、trust、model/provider 和所有 active settings。用目标 CLI 的诊断方式确认有效来源，而不是从单个文件推断。

### 2. Context 资格

用合成规则确认 CLAUDE.md/rules 的作用域、冲突和实际加载。记录 context hash；memory 不得覆盖当前 validator。

### 3. Permission 资格

分别运行一个 allow、ask-deny、explicit deny canary。断言 ask/deny 发生在工具前，拒绝后无副作用。

### 4. Sandbox / Network

从执行环境验证范围外文件、子进程和出站。Permission 和 sandbox 各自记录，不用一条结果证明另一条。

### 5. Tool / Hook

验证 ToolCall/result ID、schema、error、timeout、cancel 和 hook failure。未知 write 状态先对账。

### 6. Resume / Compaction

在一次本地编辑后保存 session/checkpoint，取消并恢复。检查 diff、last ToolResult、pending approval、unknown side effect、Task 和剩余 budget。

### 7. Model A/B

只有上述层合格后，才在相同 Claude Code/config/context/tool/policy 下替换 model 或 reasoning。协议/permission/hook 失败单独分类。

## 模型适配卡

```text
Claude Code version/surface
requested + resolved model / provider
reasoning/thinking / sampling / output limit
effective context + memory + settings hashes
permissions / sandbox / network / identity
tools / hooks / MCP / plugins / subagents
session/compaction/recovery strategy
Task split / repeats / validator / budgets
success / safety / latency / token-cost / human turns
failure distribution / rollback config
```

Claude Code 是 Harness 变量。比较 API 自建 Agent 与 Claude Code，必须报告两边完整系统，不能把一边的工具、hook、memory 或人工批准隐藏在“模型相同”之下。

## Tool、MCP、Plugin 与 Subagent

新增扩展时逐项审查：

- 来源、固定 revision、license 与依赖脚本；
- 新增 context、ToolCall schema 和 permission；
- credential scope、network 和数据目的地；
- timeout、cancel、retry、idempotency 与 error；
- subagent 的 Task、工具、预算和父级验收；
- disable、uninstall、旧 session/checkpoint 兼容。

Tool/Plugin 被发现不等于已授权；Subagent 完成不等于父 Task 完成。第三方输出仍按不可信数据处理。

## 状态、恢复与外部副作用

Conversation、context/memory、Claude Code session、Git worktree 和外部系统状态分别保存。恢复清单：

```text
Task/model/config/context identity
repository commit + current diff
last confirmed ToolCall/ToolResult
pending approvals
unknown/committed external writes + resource IDs
compaction/checkpoint lineage
remaining acceptance and budgets
```

如果 hook 或工具 timeout，不能根据对话里没有成功文本推断“未执行”。先查询目标系统，再决定复用、补偿或停止。

## 失败归因

| 症状 | 首查 | 不要先归因给 |
| --- | --- | --- |
| CLAUDE.md 未生效 | cwd、作用域、加载链、active context | 模型不服从 |
| Permission 与预期不同 | active settings、rule pattern、版本 | 模型绕过 |
| Ask 后仍修改 | handler 顺序、hook、外部进程 | 指令太弱 |
| Deny 后仍可访问 | sandbox/OS identity 与其他工具路径 | 单个规则语法 |
| Hook 结果丢失 | trigger、exit、timeout、event mapping | 模型规划 |
| Memory 覆盖事实 | trust/expiry/context/validator | 模型记忆能力 |
| Resume 重复写 | checkpoint、幂等、目标对账 | 模型忘记 |
| 工具循环 | call/result ID、error、stop reason | reasoning 档位 |
| 测试绿色但任务错 | Task acceptance、diff、validator | Claude Code 已正确完成 |

修复后重跑原失败、相邻正例和 permission/sandbox/injection 负例。一次只改变一个主要变量。

## 失败、清理与回滚

静态验证不创建 Claude Code session。真实试用中出现版本/语法不符、配置来源未知、deny/ask 在副作用后触发、范围外读写、网络越界、trace 泄密或 model 身份不明时立即停止，不切换 bypass 模式。

共享 settings/CLAUDE.md 放在独立 commit，审阅 diff 后用可追溯 revert 恢复。个人 `.claude/settings.local.json`、managed settings、session、memory、plugin cache 和外部资源不随项目 revert 恢复，按各自记录单独处理。

私人 conversation、memory 和原始 trace 不进入公开结果。外部写状态未知时先对账。

## 已知限制与检查题

本例未验证 managed settings、hooks、plugins、subagents、云 surface、真实 model 或 Provider。官方页面支持产品事实；静态示例为 E0，迁移 fixture 为 E1，都不能支持 Claude Code 可用性或模型质量结论。

1. CLAUDE.md/memory 与 permission/sandbox 的边界是什么？
2. 为什么共享 settings 正确仍不能证明 active settings 相同？
3. Allow、ask、deny 应怎样在无真实 Secret/remote 下验证？
4. Hook timeout 后为什么要判断副作用状态？
5. 比较模型时为何必须冻结 Claude Code 的 context、tool 和 policy？

下一步对照[人在循环中](/foundations/human-control)、[三个 Harness 对照](/harnesses/comparison)与[迁移案例](/labs/migration)。
