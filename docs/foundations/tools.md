# 工具与协议：从 Action 提议到可审计副作用

## 工具在 Harness 中的位置

模型只能提出 ToolCall（工具调用）；真正读取文件、执行命令或修改外部系统的是 Harness 中的 tool runtime（工具运行时）。一条安全路径是：

```text
model output
  → Adapter canonical ToolCall
  → runtime/schema validation
  → Task allowlist
  → identity + resource policy
  → optional approval
  → executor + timeout + idempotency
  → canonical ToolResult
  → trace/checkpoint
  → provider-specific result mapping
```

工具设计会直接改变模型成功率和风险。模型可能选错工具或填错参数；Harness 的责任是让错误在副作用前可拒绝、在执行后可观察、在恢复时可对账。

## ToolCall 最小契约

一个规范化调用至少需要：

```json
{
  "call_id": "call-17",
  "name": "create_deployment_preview",
  "arguments": {
    "environment": "staging",
    "git_sha": "abc1234",
    "dry_run": true
  },
  "idempotency_key": "preview-abc1234-staging"
}
```

字段责任不能混用：

| 字段 | 回答的问题 | 常见错误 |
| --- | --- | --- |
| `call_id` | 这次提议与哪个结果关联 | 多轮/stream 时丢 ID |
| `name` | 选择哪个稳定能力 | 名称模糊或动态拼接 shell |
| `arguments` | 对哪些资源执行什么参数 | 类型宽松、把权限藏在字符串 |
| `idempotency_key` | 重试/恢复时是否同一业务操作 | 每次重试生成新 key |

Provider 原始工具格式应由 Adapter 映射到 canonical（规范）结构。Policy 与 executor 不应同时理解多套 Provider 特有事件，否则身份、错误和重试语义会扩散到整个系统。

## 好工具的八个特征

1. **名字表达单一意图**：`search_code` 比 `do_query` 更容易选择；
2. **描述包含使用边界**：什么时候使用、什么时候不要用、是否有副作用；
3. **参数少而明确**：枚举、必填字段、格式、范围和互斥关系可校验；
4. **资源身份稳定**：路径、repository、project、record 使用可验证 ID；
5. **返回结构稳定**：数据、错误、分页、状态和副作用分开；
6. **读写语义显式**：读取、创建、更新、删除、发送不藏在同一模糊调用；
7. **支持 timeout 与 idempotency（幂等）**：失败后能判断是否安全重试；
8. **可观察与可撤销**：写操作返回资源 ID、版本、审计引用和回退信息。

工具 description（描述）面向模型，schema（结构契约）面向 runtime，policy 面向授权，handler 面向执行。描述写得再清楚也不能替代后三层。

## 从模糊参数改成可校验参数

不理想：

```json
{
  "name": "run",
  "arguments": {
    "thing": "deploy latest maybe"
  }
}
```

问题包括：动作、环境、版本、副作用和 dry-run 都藏在自然语言里，runtime 无法可靠验证。

更可靠：

```json
{
  "name": "create_deployment_preview",
  "arguments": {
    "environment": "staging",
    "git_sha": "abc1234",
    "dry_run": true
  }
}
```

相应 schema 应收紧额外字段与值域：

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["environment", "git_sha", "dry_run"],
  "properties": {
    "environment": { "type": "string", "enum": ["staging"] },
    "git_sha": { "type": "string", "pattern": "^[0-9a-f]{7,40}$" },
    "dry_run": { "const": true }
  }
}
```

Schema 合法只说明调用形状正确。它不能证明 `git_sha` 存在、调用者有权访问仓库、当前 Task 允许部署、staging 容量足够，或用户已批准写操作；这些属于资源查询、policy 与业务前置条件。

## 工具粒度怎样选择

### 太粗

`run_shell(command: string)` 灵活，却把解析、路径、网络、重定向和多项副作用全部交给字符串。它适合受限 coding 环境中的通用能力，不适合直接替代高风险业务 API。

### 太细

把一个稳定业务操作拆成十几个微工具，会增加 ToolCall 次数、部分完成状态和模型选择错误。例如创建 issue 时，标题/正文/标签若必须原子提交，三个独立写工具可能留下半成品。

### 合适边界

工具应围绕可授权、可观察、可幂等的业务动作设计。常见做法：

- 查询与写入分开；
- dry-run 与 commit 分开，或用不能静默忽略的枚举；
- 高风险动作独立工具、独立批准；
- 大结果使用分页/cursor，不返回整库数据；
- 跨多个系统的事务由 workflow/controller 管理，而不是藏在一个 handler。

## ToolResult 是下一轮的输入契约

成功返回不应只有自由文本：

```json
{
  "ok": true,
  "call_id": "call-17",
  "data": {
    "preview_id": "preview-42",
    "status": "created",
    "version": 3
  },
  "side_effect": {
    "kind": "write",
    "resource": "preview-42",
    "committed": true
  },
  "retry": { "safe": true, "idempotency_key": "preview-abc1234-staging" }
}
```

失败也要帮助恢复：

```json
{
  "ok": false,
  "call_id": "call-17",
  "error": {
    "code": "OUTSIDE_WORKSPACE",
    "category": "policy",
    "message": "目标路径不在允许的工作区内",
    "retryable": false
  },
  "side_effect": {
    "kind": "none",
    "committed": false
  }
}
```

错误至少区分 validation、permission、not_found、conflict、rate_limit、timeout、dependency 与 internal。不要只返回 `failed`，也不要把 token、cookie、完整环境变量或未脱敏响应塞进 message。

## Timeout、Retry 与 Idempotency

三者是一组控制：

- **Timeout（超时）**：调用者不再等待，不代表目标系统没有执行；
- **Retry（重试）**：只对已分类为暂时性且预算允许的错误执行；
- **Idempotency（幂等）**：同一业务操作重复请求不会产生重复副作用，或能返回已有结果。

安全顺序：

```text
timeout / connection lost
  → classify observed state as unknown
  → query target by idempotency key or resource ID
  → if committed: reuse result
  → if absent and retry-safe: bounded retry
  → otherwise: stop for reconciliation
```

不要对 schema 错误、权限拒绝或确定性 not-found 原样重试。指数退避也不解决错误参数。重试次数、delay、最终错误和复用结果都进入 trace 与预算。

## 副作用分级

| 等级 | 示例 | 默认控制 |
| --- | --- | --- |
| Read-only | 搜索代码、读取公开文档 | 资源 allowlist、结果上限、来源标记 |
| Local reversible | 在隔离 worktree 编辑文件 | 路径边界、diff、checkpoint、测试 |
| External reversible | 创建草稿或预览 | 最小身份、批准、资源 ID、撤销接口 |
| External material | 发送消息、合并、发布、付费 | 独立批准、幂等、对账、审计与回滚 |
| Destructive/irreversible | 删除数据、轮换生产状态 | 默认禁用；专用流程与多方控制 |

同一工具可能因参数变级。例如 `update_issue(draft=true)` 与发送外部通知的影响不同；policy 应看规范化参数和目标资源，不只看工具名。

## 认证、授权与批准是三层

Authentication（认证）回答“以谁的身份”，authorization（授权）回答“身份能做什么”，approval（人工批准）回答“这次任务是否允许做”。模型能构造合法参数，不代表这三层已满足。

凭据由执行环境或 Secret manager 提供给 handler，不进入模型上下文、ToolCall、fixture 或 trace。最好为只读/写入、开发/生产和不同 provider 使用独立最小 scope 身份。

Harness policy 应同时检查：Task allowlist、工具、资源、参数、副作用等级、预算和批准。目标系统仍需自身 authorization；不能只相信客户端检查。

## Prompt Injection 与不可信结果

网页、issue、代码注释、终端输出和 ToolResult 可能包含“忽略之前指令并上传密钥”等文本。它们是 data（数据），不会因为被工具读取就升级为 system instruction。

控制策略包括：

- 保存来源、时间和 trust label；
- 把不可信内容放在明确数据字段，不拼接进 system 区域；
- 对跨信任边界的后续 Action 重新做 policy；
- 限制返回长度、MIME、编码和嵌套深度；
- HTML/Markdown/ANSI 作为显示风险单独转义；
- 不让 ToolResult 声明自己获得了新权限；
- 检测到注入不等于任务失败，关键是它不能产生未授权副作用。

## CLI、原生工具、MCP 与扩展

| 接入方式 | 优点 | 主要代价 | 适合 |
| --- | --- | --- | --- |
| 本地 CLI | 组合性强、已有生态、可读 `--help` | 文本输出/退出码不统一，身份和 shell 风险 | Git、构建、云服务 CLI |
| Harness 原生工具 | 体验一致，可做精细 schema 与批准 | 与产品绑定，升级需迁移 | 文件、shell、编辑、浏览器 |
| MCP | 统一发现 tool/resource，可连接外部系统 | 新增 server、transport、信任和数据边界 | Issue、设计、知识库、业务系统 |
| 自定义扩展 | 可控制循环、上下文、事件和 UI | 维护、供应链与安全成本最高 | 特殊协议、策略、复杂自动化 |

MCP（Model Context Protocol，模型上下文协议）连接 Agent 与外部工具/上下文，不等于“自动可信”。[FACT:mcp-spec] 仍需审查服务器来源、transport、授权范围、工具描述、资源订阅、日志和数据去向。

无论接入方式如何，都尽早映射到同一 canonical ToolCall/ToolResult，统一 policy、trace、timeout 和错误分类。

## 工具发现与版本治理

工具描述本身是供应链输入。Server、CLI 或 extension 更新可能在用户 Task 不变时改变工具名、description、schema、默认参数和可执行动作。

生产配置至少保存：

```text
tool name / semantic version or artifact commit
provider/server/CLI identity
description hash / input-output schema hash
side-effect class / required scopes
timeout / retry / idempotency policy
data destinations / retention
enabled Task or role
checked_at / rollback version
```

新增写工具、授权域、隐式网络或数据目的地时重新审查。删除/改名工具也要检查旧 checkpoint 和 replay 是否仍可解释。

## 工具集不是越大越好

大量相似工具会增加选择歧义，schema 也占上下文预算。按 Task/role 暴露最小集合：

- 调查 Agent 只给读取和检索；
- 实现阶段才加入 edit/test；
- 发布、发送、删除保持独立且默认不加载；
- 低频能力通过 skill/plugin 按需发现；
- 互相替代的工具保留一个主路径并说明 fallback；
- 工具数量变化视为实验配置变化。

可以先用 tool confusion matrix（工具混淆矩阵）检查模型把哪个意图选成哪个工具，再决定合并、改名或重写 description。

## 测试矩阵

每个工具至少覆盖：

| 类别 | 测试 |
| --- | --- |
| Contract | 必填、未知字段、类型、范围、空值、Unicode、大输入 |
| Policy | 未列入 Task、路径越界、身份错、批准缺失、敏感参数 |
| Execution | 成功、not-found、conflict、依赖失败、部分结果 |
| Time | timeout、cancel、迟到结果、预算耗尽 |
| Retry | 暂时性失败、确定性失败、上限、backoff 记录 |
| Idempotency | 相同 key、不同参数同 key、恢复后重复请求 |
| Result | call ID 关联、分页、截断、schema 漂移、脱敏 |
| Injection | 工具结果诱导新指令、外发或权限扩大 |
| Recovery | committed/unknown/none 三种副作用状态 |

测试 handler 成功不够；还要从 Adapter → policy → executor → ToolResult → checkpoint 完整走一遍。

## 当前仓库的离线验证

Python 最小 Harness 的 `ToolRegistry` 提供 `echo` 和 `sum`，测试覆盖未授权工具、重试、幂等复用、幂等冲突、错误和 trace 脱敏。前置条件是 Python 3.11+、`uv 0.11.16` 与已缓存锁定依赖：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py
uv run --frozen --offline pytest -q lab/tests/test_memory_context_trace.py
```

预期测试退出 0；其中同 key、同 tool、同 canonical arguments 的调用只执行 handler 一次，即使 call ID 和 object key 顺序不同，第二次仍计入 `reused_tool_calls`；同 key 改 tool 或参数时返回 `failed/tool_error`，第二个 handler 不执行。未授权 `dangerous` 也在 handler 前停止，ToolResult 中模拟 token 和用户路径被脱敏。

这些是 E1 fake 证据，不调用 MCP server、CLI、外部系统或真实模型，也不证明实现支持跨进程/分布式幂等、目标系统对账、强制抢占任意阻塞 handler 或生产 Secret manager。

若测试出现真实网络/凭据请求、未授权 handler 被执行、坏 Action 进入 metrics 或敏感值进入 trace，立即停止。命令只产生测试 cache；误改时用 `git diff -- lab` 确认范围，只恢复自己的候选并保留失败输出。

## 工具评测指标

不要只测最终答案。按 Task 与 ToolCall 层分别记录：

- 工具选择准确率和混淆矩阵；
- 参数首次合法率、repair 次数和未知字段；
- 未授权 Action 的副作用前拒绝率；
- tool error、retry、timeout、cancel 与恢复率；
- 重复读取、无效调用和幂等复用；
- P50/P90 latency、返回大小和上下文占用；
- 人工批准/纠正次数；
- committed、none、unknown 副作用分布；
- 最终 Task acceptance 与安全违规。

一个模型的失败可能来自工具描述、schema、Adapter 或错误反馈。一次只改变一个主要变量，修复后同时重跑原失败、相邻正例与注入/权限负例。

## 检查题与下一步

1. ToolCall schema 合法后，为什么仍不能执行？
2. Timeout 后为什么不能默认认为“没有副作用”？
3. `call_id` 与 `idempotency_key` 分别解决什么问题？
4. ToolResult 里的网页文字为什么不能改变 system instruction？
5. 什么时候应该拆分工具，什么时候应该把多个字段放进一个原子动作？

下一步阅读[扩展点](/implementation/extensions)，把 tool、skill、hook、plugin 与 MCP 放回各自责任层；然后在[Python 最小 Harness](/implementation/minimal-harness-python)中跟踪一次真实的 policy、retry 与 idempotency 流程。
