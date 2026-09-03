# 兼容性与责任矩阵：把“支持”拆成可验证证据

## 为什么不能只写“支持”

“支持某模型/框架/Harness”可能只意味着：官方文档提到、配置能解析、离线接口长得像、一次真实请求成功，或者代表性任务达到门槛。这些证据强度完全不同。

本项目把兼容性定义为**具体组合在明确责任和证据边界下的状态**：

```text
object/version
  × surface/provider/adapter
  × responsibility/protocol feature
  × workload/config
  × evidence axis/date
```

只写产品名称而没有版本、surface、责任和证据，不能形成兼容结论。

## 五条证据轴

| 证据轴 | 回答的问题 | 合法表述 | 不能证明 |
| --- | --- | --- | --- |
| Source fact | 官方文档或维护仓库声明什么？ | `verified/conflict/pending` + 版本/日期 | 本机、账号或组合可用 |
| Local static | 配置、schema 或文档是否符合项目规则？ | E0 静态检查通过 | 产品已读取或执行配置 |
| Offline seam | 项目是否用 fake/replay 验证责任？ | E1 / `not-implemented` + fixture | 上游 package/API 行为 |
| Live evidence | 目标版本和 surface 是否真实可用？ | E2 / `untested` + run | 代表性质量优胜 |
| Workload study | 目标任务是否重复达到门槛？ | E3 + study/split/区间 | 跨任务/版本通用排名 |

Source status 与 experiment level 是两套坐标。官方来源 verified 不会自动产生 E2；离线 E1 也不会改变来源状态。

## 状态词怎样使用

| 状态 | 含义 | 写作要求 |
| --- | --- | --- |
| `verified` | 目标来源/版本在日期上实际核对 | 引用精确 source、version、checked |
| `pending` | 无法充分核对 | 相关字段保持 unknown，不抄旧值 |
| `conflict` | 来源或目标版本互相矛盾 | 保留冲突并限制结论 |
| `retired` | 不再用于当前正文 | 保留历史/兼容审计 |
| `untested` | 没有该组合的真实 run | 不写“可用”或“不可用” |
| `not-implemented` | 项目没有该离线 seam | 不用文件名/计划冒充实现 |

`pending` 不等于 false，`untested` 不等于不支持；它们都表示当前证据不足。

## Coding Harness 当前状态

| 对象 | Source fact | Local static | Offline seam | Live evidence | 阅读边界 |
| --- | --- | --- | --- | --- | --- |
| Codex | 官方滚动文档，2026-08-27 [FACT:codex-agents-md] [FACT:codex-config] [FACT:codex-sandbox-approval] | `examples/harnesses/codex`，E0 | Migration E1 | untested | AGENTS、config、sandbox、approval、network 分开 |
| Pi | 固定 commit `496185f`，2026-08-27 [FACT:pi-readme] | `examples/harnesses/pi`，E0 | Migration E1 | untested | Tool、session、context、trust、extension 与外部隔离 |
| Claude Code | Memory 2026-08-20；settings/permissions 2026-08-27 [FACT:claude-memory] [FACT:claude-settings] | `examples/harnesses/claude-code`，E0 | Migration E1 | untested | CLAUDE.md/memory、permissions、hooks、sandbox 分开 |

三套示例通过仓库静态检查，但没有启动产品。Migration fixture 只验证责任字段、gap、补偿和负例；不能把其 E1 写成三者真实兼容。

详细阅读：[Codex](/harnesses/codex)、[Pi](/harnesses/pi)、[Claude Code](/harnesses/claude-code)与[横向比较](/harnesses/comparison)。

## Harness 责任映射

| 责任 | Codex | Pi | Claude Code | 验证问题 |
| --- | --- | --- | --- | --- |
| 持久指令 | AGENTS chain | context/project files | CLAUDE.md / rules / memory | 目标 cwd 实际加载哪些内容？ |
| Model/Provider | config/profile/surface | models adapter/settings | model/settings/surface | Requested alias 解析成什么？ |
| 工具 | runtime tools / MCP / plugins | read/write/edit/bash / extensions | tools / MCP / plugins / hooks | Schema、error、timeout 是否等价？ |
| 技术隔离 | sandbox / permission profile | 外部 runtime/container 补偿 | sandbox，按目标版本核验 | 进程技术上能触达什么？ |
| 询问与授权 | approval policy | project trust + 自建 policy | permission rules / hooks | Gate 是否在 handler 前？ |
| 网络 | 独立策略 | runtime/extension egress | settings/sandbox/runtime | 实际出口和 destination 是什么？ |
| 状态 | task/session/worktree，因 surface 而异 | session tree/fork/import/compaction | conversation/context/session | 未决副作用能否恢复？ |
| 扩展 | skills/MCP/plugins | skills/templates/extensions | skills/hooks/plugins/subagents | 来源、权限、数据、卸载？ |
| 验证 | Tool/CI/人工组合 | 命令/extension/外部 CI | Tool/hook/外部 CI | 谁决定 Task acceptance？ |
| 回滚 | Git/worktree + 外部对账 | Session/Git + 外部对账 | Session/Git + 外部对账 | 能否恢复业务而非只恢复文本？ |

Codex 中 sandbox 限制技术可达范围，approval 决定何时询问，network 仍是独立控制。[FACT:codex-sandbox-approval] 迁移时要找目标语义与补偿，而不是复制字段名。

## 模型页面当前状态

| 页面 | Source 边界 | 项目证据 | Live/Workload |
| --- | --- | --- | --- |
| OpenAI | Function calling、reasoning 与 effort 的官方入口已登记 | 协议设计与共享 E1 runtime tests | 没有真实 API/model 结果 |
| Anthropic Claude | 官方模型/Claude Code 配置入口 | E0 适配方法 + 共享离线控制 | 没有 Anthropic/转售 API run |
| Google Gemini | 官方 models/ADK 入口 | E0 适配方法 + 共享离线控制 | 没有 Gemini/Vertex run |
| Qwen | 官方站 + 目标 model card/revision 要求 | E0 checkpoint/runtime/协议方法 | 没有 API/权重加载结果 |
| DeepSeek | API surface 的价格、alias、context、availability 为 pending [FACT:deepseek-api-surface] | E0 方法，pending 阻止费用结论 | 没有官方/第三方/本地 run |

“共享 TypeScript runtime test 通过”只证明公共 Task/Action 拒绝坏值；它不是任一 Provider 的 tool/stream/error 兼容测试。

模型适配必须同时固定 model、Provider、Adapter、Harness、surface、Task 和 budget。详见[模型适配方法](/models/adaptation)与[协议兼容性](/models/protocol-compatibility)。

## Framework 与领域职责接缝

| 名称 | Source fact | 本项目实际执行 | Offline seam | Live evidence |
| --- | --- | --- | --- | --- |
| LangGraph | 低层有状态 orchestration/runtime 已核对 [FACT:langgraph-overview] | Research 的确定性状态转换 | E1 离线职责接缝 | untested；未安装上游包 |
| Browser Use | 来源入口已列，版本未锁定 | Browser 的本地合成页面与注入拒绝 | E1 离线职责接缝 | untested；未安装上游包 |
| PydanticAI | 来源入口已列，版本未锁定 | Data 的 schema 漂移与敏感字段 | E1 离线职责接缝 | untested；未安装上游包 |
| LlamaIndex | 来源入口已列，版本未锁定 | Document 的版本化问答 | E1 离线职责接缝 | untested；未安装上游包 |
| OpenAI Agents SDK | 官方架构入口已核对 [FACT:openai-agents-sdk] | 只有职责说明 | not-implemented / E0 | untested；未安装上游包 |
| Google ADK | 官方架构入口已核对 [FACT:google-adk] | 只有职责说明 | not-implemented / E0 | untested；未安装上游包 |
| AutoGen | 官方分层入口已核对 [FACT:autogen-overview] | 只有职责说明 | not-implemented / E0 | untested；未安装上游包 |

`lab/src/about_harness/integrations/` 的同名文件不会 import 上游 Framework。它们只把领域责任标为 `offline-contract-seam`。文件存在、case 通过或名称相同都不能证明 API 兼容。

## “组合兼容”不能由单项拼出来

以下四项分别 verified，也不自动证明组合可用：

```text
Harness 能配置某 model
Provider 文档声明 tool calling
Framework 提供 Agent runtime
项目离线 Tool loop 通过
```

真实组合还需验证：

- Harness 如何把消息映射给 Provider；
- Model snapshot 是否支持目标参数；
- Framework/Adapter 如何映射 ToolCall/Result 和 streaming；
- Permission/sandbox/network 是否覆盖新增工具；
- Context、state、retry 和 cancel 是否连续；
- Validator 与 Task 是否适用于该 workload；
- 版本组合、身份和 budget 是否可追溯。

兼容性是组合属性，不是三个“支持”标签的逻辑与。

## Protocol 兼容至少拆哪些行

| Feature | 正例 | 负例 | 兼容条件 |
| --- | --- | --- | --- |
| Messages | 单/多轮、system | 空/未知 role | 顺序/内容无静默变化 |
| Tool schema | 合法单工具 | 未知字段/坏类型 | 错误可定位，handler 前拒绝 |
| Tool result | 单/连续调用 | 丢/重复 call ID | 结果关联稳定 |
| Streaming | 文本/arguments 增量 | 断流/重复/UTF-8 边界 | 不重不漏、终态唯一 |
| Stop/error | complete/tool/length | reject/rate-limit/cancel | 分类不混写 |
| Usage | 正常字段 | 缺失/负数/NaN | 单位和缺失语义明确 |
| Retry/cancel | 暂时失败/取消 | late completion | 预算、幂等、终态正确 |
| State | Checkpoint/resume | config drift/坏 state | 身份与副作用可恢复 |

HTTP 200、SDK 能发请求或一次 tool call 成功，只覆盖其中很小一部分。

## 一条兼容记录的主键

```text
object + version/revision
surface + provider/endpoint + region
adapter/SDK/runtime versions
feature/responsibility
Task/workload + fixture hash
config/tool/context hashes
evidence axis + run/ref + checked_at
status + limitations + owner
```

任一主键字段变化，都不应无条件复用旧结论。Alias、滚动文档和第三方 endpoint 尤其需要观察时间。

## 怎样写合法结论

不合格：

> 本项目支持 LangGraph、Claude 和 Pi。

合格：

> 在 commit X，Research 合成 fixture 通过项目内确定性状态转换，作为 LangGraph 责任映射的 E1 seam；上游包未安装，真实 LangGraph/model 组合保持 untested。

不合格：

> DeepSeek 成本更低。

合格：

> 当前 DeepSeek price source 为 pending，项目没有 live usage/billing；不能形成成本比较。[FACT:deepseek-api-surface]

不合格：

> 三个 Harness 都支持 sandbox。

合格：

> 源 Codex sandbox 责任在 Pi 迁移 fixture 中由外部无网络/只读 runtime 补偿；这只是 E1 mapping，目标 Pi 运行仍 untested。

## 证据怎样升级

```text
E0 source/design/static
  → 固定目标版本与配置
  → E1 offline seam + negative
  → 获授权 E2 live protocol probe
  → 真实 Task + validator + repeated holdout
  → E3 workload result
```

升级时保留原层级，不覆盖历史：E2 失败可能说明目标组合不合格，但不会让官方 source fact 变 false；新 E3 也不能证明旧/其他版本。

E2 至少保存 model/provider/Harness/Adapter、原始协议引用、Task、config、budget、trace、result 和失败分类。E3 再增加代表性任务、重复、holdout、区间和预注册晋级门槛。

## Drift 与复核

触发重新资格测试的变化：

- Product/CLI/SDK/Adapter/Framework 版本；
- Model alias、resolved snapshot、Provider 或 region；
- Tool schema、MCP/extension、permission 或 network；
- Context template、compaction、memory 或 Task；
- Validator、budget、retry 或 deployment environment；
- 官方滚动文档与来源状态。

高易变事实由 `facts:freshness` 检查日期，但日期新鲜不证明 live 行为仍一致。Version change 与 incident 触发的回归比固定日历更重要。

## 在当前仓库验证矩阵

前置条件是 Node.js 22+、Python 3.11+、`uv 0.11.16`，锁定依赖已准备：

```powershell
npm run facts:check
npm run compat:check
npm run examples:check
uv run --frozen --offline python scripts/run-labs.py all
```

预期：事实注册表结构/引用通过；兼容页面保留三条核心 evidence axis；三套静态示例通过；六个离线 case 为 `E1`、`offline=true`、`negative_rejected=true`。

这些命令不访问产品、Provider 或第三方 Framework。若它们请求网络/凭据、同名 integration 开始导入未锁定上游包，或 E1 被显示为 live/E2/E3，立即停止。

## 失败、清理与回滚

矩阵与产品页面冲突时，先回到事实注册表、目标版本和实际 run，不为保持表格绿色删除冲突。无法核对的 source 改为 pending；没有 run 的组合写 untested。

命令只产生终端输出和可再生 cache；发送 `Ctrl+C` 停止，用 `git status --short` 确认范围后只清理本轮生成物。矩阵修改使用独立 commit，失败时只回退自己的候选，不覆盖事实注册表或历史 run。

## 已知限制与使用方法

当前矩阵不是自动兼容数据库：它没有枚举所有 model/provider/version 组合，也没有实时查询账号、套餐和区域。它的价值是防止不同强度的证据被混写。

使用时：

1. 选一个具体 object/version/surface；
2. 拆成需要验证的 responsibility/feature；
3. 查 Source fact 与状态；
4. 查项目是否有 Local static/Offline seam；
5. 没有 Live evidence 就保持 untested；
6. 运行目标组合 probe，保存新 run；
7. 只有代表性 study 才写 workload 结论。

可执行负例见[跨 Harness 迁移](/labs/migration)，完整评测设计见[评测方法](/evaluation/method)。
