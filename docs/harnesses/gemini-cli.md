# Gemini CLI：终端 Harness 的配置、上下文与可回退动作

官方文档于 2026-09-21 核对。[FACT:gemini-cli-overview] 文档首页把 configuration、`GEMINI.md`、trusted folders、extensions、MCP、session management、checkpointing、sandbox、subagents 和 rewind 分列为独立主题。这说明它们不是一句 prompt 的不同写法，而是影响一次运行身份的不同控制面。本仓库没有安装 Gemini CLI、登录账号或调用 Gemini；下文是 E0 阅读与资格设计，不是产品运行结果。

## 先处理当前生命周期

同一官方站点对未付费层和 Google One 用户显示：Gemini CLI 已在 2026-06-18 被 Antigravity CLI 替代。这个公告限定的是该用户层，不能扩展为“所有 Gemini CLI 都已停止”，也不能据此推断某个账号能使用哪个产品。运行前先记录账号计划、CLI 实际版本、surface 与官方公告；无法确认时停止产品选择，保留 `unknown`。[FACT:gemini-cli-lifecycle]

## 四个可教学的控制面

### 配置与 `GEMINI.md`：有效输入不是一份文件

官方导航分别列出 configuration、settings、`GEMINI.md`、system prompt、model routing 与 model steering。教学上应把它们当作不同来源：项目知识放在指令文件，模型路由和生成值记为配置，最终送往模型的系统/任务内容记录 hash。例子是“修复固定测试”：`GEMINI.md` 只描述允许路径和验收，配置才记录模型选择；不要用项目指令承担凭据、网络或写入限制。

失败取舍：若不知道哪个来源生效，不能比较模型或归因给 Agent；先用目标版本的诊断方式发现有效配置，而不是不断追加 prompt。

### 扩展、Skills 与 MCP：可发现不等于已获权

官方导航把 extensions、Skills、MCP setup/server/resources、hooks 与 custom commands 分开。它们都可能让模型看见新工具或流程，但 transport、schema、credential flow、数据目的地和 handler 权限仍需单独记录。例子是为只读文档检索接入 MCP：固定 server revision 和工具清单，要求每个 ToolResult 回到原 action；不要因为 server 成功连接而允许写入或外发。

失败取舍：extension 安装脚本、MCP 返回文本和 Skill 内容都是不可信输入。来源或作用范围不明时禁用该能力，保留本地只读基线，而不是把它放进宽泛 shell 工具。

### 会话、checkpoint 与 rewind：对话恢复不是副作用恢复

官方把 session management、checkpointing 和 rewind 单列。它们适合教学“状态位置”和“回退点”不同：session 可延续上下文，checkpoint 可标记已知位置，rewind 可能改变本地工作状态；它们都不能替代外部系统的 receipt 或幂等键。例子是工具 timeout 后：先查询目标系统、保存 action hash 与回执，再决定 resume，不能只因会话可恢复而重发。

### Sandbox、trusted folders 与确认：三者不互相证明

官方导航同时列出 sandbox、trusted folders、plan mode 和 policy engine。trusted folder 是项目来源/加载决策；sandbox 是执行环境可达范围；plan/confirmation 是流程暂停或策略决定。例子是陌生仓库：先在未信任、只读、无网络的隔离环境检查扩展，再决定是否扩大范围。不要用“已 trust”推断文件、网络或命令已被技术隔离。

### 把控制面写进运行记录

| 观察项 | 记录什么 | 不能由它证明什么 |
| --- | --- | --- |
| Configuration | 文件来源、覆盖关系和有效值 hash | 项目指令已经被加载 |
| `GEMINI.md` | 发现路径、内容 hash、适用目录 | 能限制 shell 或网络 |
| Extension/MCP | 版本、server/transport、工具 schema | handler 已获业务授权 |
| Session/checkpoint | session ID、恢复点、最后 ToolResult | 远端写入未发生或可回滚 |
| Sandbox/trust | 运行环境、目录信任决定、拒绝事件 | approval 绑定了精确参数 |

这张记录也避免一类常见误判：某个命令没有弹窗，可能是确认策略、操作分类、已有信任或执行 surface 不同；它不能单独说明 sandbox 被绕过或策略失效。

## 两个适合教学的负例

**扩展负例**：一个 extension 的说明文本要求读取环境变量并上传“诊断包”。合格配置应把说明当不可信数据，拒绝超出 Task allowlist 的读取/网络动作，并留下 policy event；不要把它交给模型自行判断。

**恢复负例**：checkpoint 前工具请求已经发出，checkpoint 后没有 receipt。恢复时不应重新发送相同请求，而是进入 `unknown_side_effect` 并对账。若产品 session 层没有足够状态，应用 ledger 仍是唯一可判定的来源。

## 何时值得比较 Gemini CLI

只有目标工作负载确实需要终端中的项目上下文、工具或可恢复任务，且能冻结 CLI/version、account/surface、有效配置/指令 hash、extension/MCP 清单、文件/网络边界、session/checkpoint、Task/validator/budget 时才进入比较。一次确定性脚本或当前 Harness 已通过验收时，先保留更小的基线。

## 无账号的 E0 资格卡

前置条件是隔离练习仓库、固定 commit、无个人数据或 credential、一个失败测试与本地 validator。输入为允许路径、禁止网络/依赖/remote 的 Task，以及合成 allow/deny canary。运行目标版本时按下面顺序记录，而不是在本仓库执行：

```text
1. 记录 CLI/version/account tier/surface、有效 configuration 与 GEMINI.md；
2. 只读读取固定文件，校验引用和 hash；
3. 分别验证 trusted-folder、sandbox、确认和网络的边界；
4. 在隔离 worktree 修复一个可回退失败；
5. checkpoint、取消、resume 后对账最后 action 和外部 receipt。
```

预期 artifact 是 config hash、动作与确认事件、测试退出码、session/checkpoint ID 和 failure class。断言是 gate 在 handler 前生效、拒绝无副作用、diff 仅在允许路径并由 validator 通过。加载来源不明、范围外访问、网络越界、确认后参数漂移或 timeout 写状态未知时立即停止。

清理练习 worktree、临时 session/trace 和合成产物；外部状态未知先按幂等键对账。回退到启动前 commit 和已验证 Harness。该资格卡不证明 Gemini CLI/Antigravity 的账号可用性、MCP 兼容、模型质量、费用或生产安全；这些需要单独授权的 E2/E3 记录。

## 采用前自检

- 是否记录了公告适用的 account tier，而非把迁移公告泛化为全部 surface？
- `GEMINI.md`、settings、model routing 和实际 system input 是否各有来源和 hash？
- extension、Skill、MCP、hook 与 custom command 是否分别有版本、权限和卸载记录？
- trusted folder、sandbox、confirmation、network 是否以独立 canary 验证？
- session/checkpoint/rewind 是否没有被拿来替代外部 receipt 和幂等键？
- 任务完成是否仍由测试、diff、schema 或业务 validator 判定？
