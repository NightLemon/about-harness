# Anthropic Claude 模型家族适配

## 核对入口与证据边界

- [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Claude Code model configuration](https://code.claude.com/docs/en/model-config)

核对日期：2026-08-20。模型名称、alias（别名）、上下文与价格以目标 provider（模型供应方）官方页面为准，不从旧 benchmark（基准测试）推断当前行为。本页只给出 E0 适配方法；项目没有调用 Anthropic 或云转售 API，也没有 Claude 模型质量证据。

## 先区分三种被混叫“Claude”的对象

| 对象 | 应固定什么 | 主要责任 | 不能互相证明 |
| --- | --- | --- | --- |
| Anthropic API model | provider、精确 model ID、endpoint、参数 | 模型协议与生成行为 | Claude Code 的工具/权限体验 |
| 云 provider 转售 surface（使用界面/执行表面） | 云服务、区域、部署/alias、认证、adapter | 托管协议、身份、配额、数据边界 | 第一方 API 的相同语义 |
| Claude Code | 产品版本、运行 surface、model 配置、settings、cwd、指令 | Coding Harness 的上下文、工具与控制循环 | 模型权重本身的质量 |

同一名称经不同 provider 或 Harness 运行，是不同实验配置。Claude Code 表现变化可能来自模型、项目指令、工具、sandbox、版本或上下文压缩；没有冻结这些变量就不能把差异归给模型。

## 最小配置身份

一张可复现适配卡至少记录：

```text
provider / account surface / region
resolved model ID / alias observed at
SDK + adapter + API version
Claude Code version + execution surface（若使用）
system/project instructions hash
tool schema / tool-result mapping / permissions
thinking or reasoning setting
sampling / output limit / stop configuration
context construction / compaction / memory version
retry / timeout / budget / checked_at
```

Alias、provider、区域、thinking 档位、Claude Code 版本或指令 hash 任一变化，都产生新 config ID；不能把新旧 run 当同一配置的重复样本。精确 model ID 应来自响应/运行时可验证元数据，而不是询问模型“你是谁”。

## 先过协议资格，再评任务能力

下面是要执行的 probe（探针），不是对当前 Claude API 行为的无条件声明：

| 探针 | 必须保存的观察 | 通过条件 |
| --- | --- | --- |
| system/message | 发出的 role/content 与响应包络 | 顺序、空内容、多轮映射无静默变化 |
| tool use | tool schema、call ID、arguments | 参数可解析、未知字段策略明确 |
| tool result | call/result 关联与下一轮请求 | 连续调用不丢 ID、结果不变成普通用户话语 |
| streaming | 原始事件、增量拼装、最终事件 | 不重复/漏拼 content 或 tool arguments |
| stop/error | stop reason、HTTP/provider error、retry | 完成、工具、截断、拒绝、取消可区分 |
| usage/cache | provider usage 与本地计量 | 单位和缺失语义明确，不能负数/NaN |
| cancel/timeout | 请求取消时刻与迟到事件 | 终态不可被迟到 completion 覆盖 |

任一协议探针失败，先修 Adapter 或固定 provider 版本，不进入 coding/长文质量比较。Tool call JSON 合法不等于本次执行已获授权；Harness policy 仍要在 handler 前检查 Task、资源和参数。

## Tool loop 的关键不变量

```text
model tool request
  → canonical ToolCall
  → schema + policy + approval
  → executor + idempotency
  → canonical ToolResult
  → provider-specific result mapping
  → next model action
```

Trace 应同时保留 provider 原始事件引用与规范化 Action/ToolResult，才能区分“模型参数错”“Adapter 丢 call ID”“工具失败”和“结果没有回送”。不要让模型文字直接执行 shell/API；也不要把 tool result 中的不可信网页或日志提升为 system instruction。

连续工具探针至少包含：一次成功、字段错误后的修正、工具返回错误、重复幂等键、取消，以及工具结果后正常完成。原样重试确定性参数错误没有意义；timeout 后写操作结果未知时先对账。

## Claude Code 是 Harness 变量

CLAUDE.md 与 auto memory 属于上下文，不是不可绕过的 policy。[FACT:claude-memory] 它们能指导模型，却不能技术上阻止进程访问某文件、网络或 Secret。硬边界仍由 sandbox、权限、工具 policy、运行身份和目标系统控制。

适配 Claude Code 时额外记录：当前 cwd/Git root、实际加载的 CLAUDE.md/rules、settings 来源与覆盖、允许工具、sandbox/approval 行为、Session/compaction 状态和验证命令。不要把“相同 prompt”当作相同上下文；项目文件与工具结果同样会改变模型输入。

如果比较 API 自建 Harness 与 Claude Code，应分别报告完整系统，而不是把一边的内置搜索、checkpoint 或 UI 人工介入藏在“模型相同”之下。

## 长上下文与 Prompt caching

Context window（上下文窗口）容量不等于任务能有效利用全部内容。长任务固定实际发送的 token、文件选择、顺序、重复、检索与 compaction（压缩）策略；设计关键事实位于开头/中间/结尾、冲突版本、超长工具结果和压缩后恢复的负例。

Prompt caching（提示缓存）首先是成本/延迟变量。记录命中口径、前缀字节身份、provider usage 和冷/热 run，不要因为缓存命中就推断答案质量相同。若为提高命中率而重排或合并上下文，质量实验也发生了变化，必须建立新 config。

## Thinking 与预算

Thinking/reasoning 设置属于 model/provider/config 组合。先用资格探针确认参数被接受、返回元数据能证明实际生效、无效值会失败而不是静默忽略；再在固定任务上做单变量比较。

同时记录成功、P50/P90、input/output token、provider usage、cost、tool errors、人工轮次和总墙钟时间。更高档位若减少重试，端到端成本可能下降；单次请求更贵也可能让简单任务不划算。结论按 workload（工作负载）路由，不写“更高 thinking 永远更好”。

## Coding 工作例

项目建议的最小实验，不是已运行的 Claude 结果：

```text
Task: 在固定 commit 修复一个边界错误
Allowed: read/search/edit/targeted-test
Forbidden: dependency/network/generated files
Acceptance: 失败测试先复现；目标+回归通过；diff 仅允许路径
Budget: model/tool calls、20 min、cost cap
```

先用相同 Harness 跑小修、多文件实现和调试的分层任务。每个 run 使用干净 worktree，保存模型/provider/Claude Code 身份、指令 hash、tool schema、实际 diff、测试和 stop reason。基础设施/Adapter 错误单独分类，不计成模型判断失败。

模型提出完成后由外部 validator 运行真实测试并审查 diff。流畅解释、`completed` 状态或工具调用成功都不能替代 acceptance。

## 失败归因

| 症状 | 首查 | 不要先做 |
| --- | --- | --- |
| Tool loop 中断 | call/result ID、stop reason、Adapter mapping | 提高 thinking |
| 参数反复无效 | 原始 tool request 与 schema | 放宽为任意字符串 |
| 长上下文漏约束 | 实际 request、裁剪、compaction、冲突 | 宣称模型“记忆差” |
| Claude Code 行为变化 | 版本、model、settings、cwd、指令 | 只比较最终文本 |
| Provider 用量/费用异常 | usage 单位、重试、cache、alias | 用旧价格估算补空 |
| Cancel 后仍完成 | event 顺序与 controller 终态 | 接受迟到输出 |
| 测试通过但任务错 | validator 覆盖与 Task acceptance | 把 CI 绿色当模型质量 |

修复后同时重跑原失败、相邻正例与协议负例。一次只改变一个主要变量；若同时换 provider、alias、thinking 和 prompt，只能评价整个 bundle，不能归因。

## 评测与晋级

按真实工作负载分层，保留 development、holdout 和 incident regression。安全违规为零门槛；质量、成本和延迟阈值预注册。报告 run-level 与 task-level 单位、Wilson/配对区间、缺失和失败分布，不以单次 demo 或旧 benchmark 排名。

晋级范围可以小于“全面替换”：例如只在内部只读任务 shadow（影子运行），复杂 coding 继续人工审查。回退配置固定上一个 provider/model/adapter/Harness 组合；alias 变化或官方退役触发重新资格测试。

## 在本项目验证离线边界

当前仓库没有 Anthropic provider client 或 credential reader，`LiveAdapter` 为 hard-disabled（硬禁用）。以下命令只验证统一离线协议和门禁，不验证 Claude API/Claude Code：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_replay_and_live.py
npm run lab:ts-runtime-test
npm run facts:check
```

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 和锁定依赖。预期 Python 显示 `5 passed`：replay 可完成固定 tool loop，未知字段/坏 checkpoint 被拒绝，live adapter 在任何 provider 动作前失败；TypeScript runtime 拒绝坏 Task/Action；事实检查确认正文引用的产品主张已登记来源状态、版本和日期。

这些是 E1 控制契约，不包含 Anthropic 请求、Claude Code 启动、真实 usage/cache、thinking 或模型任务。`facts:check` 只验证事实谱系，不是 Claude 兼容测试；身份、状态和工具流是否解释充分仍由内容审阅判断。

若 live adapter 不再硬拒绝、命令需要 API key/网络，或坏 Action 进入 metrics，停止任何 Claude 适配结论；不要配置真实凭据、产生费用或删除负例。命令只读固定 fixture，并可能产生 cache。误改时检查 `git diff -- lab docs/models/anthropic.md`，只恢复自己的变更；候选失败时回到 replay/live-disabled baseline。

## 检查题与下一步

1. Anthropic API model 与 Claude Code 为什么是两个实验变量集合？
2. Tool request JSON 合法后，为什么仍不能直接执行？
3. CLAUDE.md/auto memory 为什么不是权限边界？
4. Prompt caching 命中时，哪些质量变量仍可能变化？
5. 当前 `5 passed` 为什么不能证明 Claude 模型适合 coding？

先完成[Claude Code 教程](/harnesses/claude-code)，再用[协议兼容性](/models/protocol-compatibility)写资格探针，并按[推理预算](/models/reasoning-budget)设计配对任务。
