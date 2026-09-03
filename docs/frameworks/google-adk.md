# Google Agent Development Kit：把 Agent、Session 与部署责任分开

官方来源：[Google ADK](https://google.github.io/adk-docs/)，核对日期：2026-08-20。

官方 ADK 文档（核对 2026-08-20）提供 agents、models、tools、sessions、runtime、deployment、observability、evaluation 与 safety/security 导航。[FACT:google-adk] 这条已登记事实是 E0；本页不会把导航中的能力名称写成本项目已经安装、配置或验证的功能。

## 学习目标与选择问题

读完本页，你应能把业务 Task 映射到 ADK 的责任域，同时保留自己的 model/provider 身份、工具授权、Session 生命周期、业务 validator 和发布边界。采用前先问：需要的是一套 Agent/runtime 组合，还是只需要一个简单模型调用、确定性 workflow 或现有 Harness 的 Adapter？

Framework 带来一致抽象，也引入版本、状态、部署和可观测性耦合。PoC（概念验证）的目标不是尽快跑通 hello world，而是尽早验证最难恢复、最可能越权和最影响迁移的路径。

## 从业务契约映射，不从类名反推

| ADK 导航域 | 应先定义的应用契约 | 不能自动推断 |
| --- | --- | --- |
| Agent | goal、input、output、owner、termination | 角色描述就是业务验收 |
| Model | provider、精确 model ID、参数、响应语义 | “支持某模型家族”就是该组合可用 |
| Tool | schema、资源 scope、授权、幂等、错误 | 可注册就已获权或安全 |
| Session | 主体、任务、状态版本、保留与删除 | 对话历史等于完整业务状态 |
| Runtime | event、cancel、resume、并发与预算 | 运行结束等于业务成功 |
| Deployment | 环境、身份、网络、artifact、rollback | 可部署目标已满足合规与 SLO |
| Observability | event schema、关联 ID、脱敏、访问 | 默认 trace 可直接公开 |
| Evaluation | task set、oracle、metric、promotion | framework score 等于业务决策 |
| Safety/security | threat model、policy、sandbox、approval | 单个 guardrail 覆盖所有边界 |

实际 API、语言支持和字段属于版本敏感产品行为，必须以目标 ADK 版本的官方文档、锁文件和可执行探针为准。

## ADK 仍位于 Harness 的一部分

推荐把控制边界画在集成之前：

```text
Application Task / acceptance / identity
                 │
                 ▼
          ADK agent + runtime
                 │ proposes actions/events
                 ▼
    policy / approval / sandbox / tool executor
                 │
                 ▼
 business state / validator / audit / rollback
```

ADK 可以承载 Agent 与 runtime，不应成为所有业务状态和权限的唯一来源。用户身份、tenant（租户）、数据分类、目标资源和批准范围由应用控制面传入并独立校验；模型文字、ToolResult 或 Session metadata 不能自行扩大权限。

## Model 身份先于能力判断

“ADK 能连接某模型”不足以形成实验身份。每个 run 至少记录：ADK 版本与语言、模型 provider、精确 model ID/alias 解析、区域或 endpoint、Adapter/connector 版本、generation/reasoning 设置、tool schema hash 和运行 surface（使用界面/执行表面）。

认证失败、区域不可用、alias 漂移、内容 part 映射错误和模型任务判断失败属于不同层。先用最小文本、结构化输出、单/连续工具调用、stream 取消和 usage 探针验证协议，再进入真实任务评测。协议失败不应计为模型质量失败。

## Session 不等于对话存档

Session（会话状态）至少要绑定主体、Task ID/version、config、当前 step、累计预算和数据保留策略。消息历史只是其中一部分；工具幂等键、外部回执、待批准 Action、业务对象版本和删除状态通常还需要应用存储。

恢复时回答：最后一个可证明事件是什么？外部写入是否已经发生？Model/Adapter position 能否继续？预算是否仍有效？若 Session 有“工具请求已发送”却没有结果，不能直接重发；先查询目标系统或幂等台账。

Session 生命周期至少覆盖 create、read/update、resume、expire/delete 和 subject access（主体访问）。删除会话不能只移除 UI 列表，还要处理 trace、cache、artifact 和下游存储；具体保留义务由应用政策决定。

## Tool 与授权是两条链

工具可被 Agent 发现只说明 schema 可见。执行前仍要经过：

```text
Tool request
  → schema validation
  → normalize resource/parameters
  → Task allowlist
  → identity + scope + policy
  → optional approval bound to action hash
  → executor / idempotency / timeout
  → structured ToolResult
```

Action confirmation（动作确认）应绑定工具、规范化参数、目标资源、环境、有效期和批准主体。参数或目标改变后旧确认失效。读、写、删除、发送与支付使用不同工具/权限；不要把任意 HTTP/SQL/shell 字符串作为一个“万能工具”绕过 policy。

MCP、OpenAPI 或带认证工具会把新服务、schema 和 credential flow（凭据流）带入信任边界。记录 server/spec 版本、授权主体、数据目的地、刷新/撤销方式和工具清单 diff；Secret 由执行层注入，不进入 model context、fixture 或 trace。

## Runtime：取消、预算与并发

Runtime（运行时）需要显式状态机：created、running、waiting-approval、completed、failed、cancelled/stopped。模型可以建议完成，只有 controller/validator 能写终态。

Budget（预算）至少覆盖 model/tool calls、steps、tokens、cost、deadline、retry 和子 Agent。取消要传播到 model stream、tool、等待批准和子任务；迟到结果只记录，不能覆盖终态。并行分支需要 owner、合并规则与版本条件，不能让最后写入者静默赢得业务状态。

框架支持 resume 不证明 exactly-once（恰好一次）。写工具仍需幂等键与外部对账；checkpoint 保存控制/Adapter 状态，不替代订单、文件或消息系统的业务回执。

## Deployment 是新的证据边界

从本地迁移到托管、容器或其他 deployment target（部署目标）时，重新绘制：执行身份、网络出口、Secret 注入、数据区域、日志接收方、artifact、伸缩、并发和 rollback。相同 Python/TypeScript 代码在不同目标上可能使用不同身份与存储，不能沿用本地“已授权”的假设。

发布记录至少固定 source commit、ADK 与依赖锁、镜像 digest、配置 hash、迁移步骤、健康检查和上一个可恢复版本。先 shadow（影子流量）或只读 canary（小流量探针），再扩大副作用范围。部署命令成功只是基础设施事件，不是任务质量或数据合规证明。

## Observability 与 Evaluation 不互相替代

Trace（轨迹）回答一次 run 发生了什么；evaluation（评测）比较一组预注册任务上的结果。Trace 事件至少关联 run/session/task/config、Agent、model request、tool call/result、policy/approval、状态转换与 validator。敏感 prompt、ToolResult 和业务数据按访问/保留策略处理。

Evaluation criteria（评测标准）必须映射到业务 oracle：schema、测试、引用、对账或人工 rubric。固定 ADK、model/provider、Task、工具与预算后，才比较一个主要变量。安全违规是硬门槛；报告 run/task 单位、缺失、区间、失败类型和未测试范围。

## 工作例：合成订单解释

下面是项目建议，不是已运行的 ADK API 示例：

```text
Task: 读取固定订单 → 校验 schema → 计算摘要 → 解释异常

read_fixture tool   只读，返回 fixture hash
validate_order      确定性 schema/金额检查
explain_agent       只接收已验证字段，不见 credential
business_validator 独立复算 row count / totals / citations
```

Session 保存 Task/config、fixture hash、步骤、预算与结果引用；不把订单原文无限复制到历史。验证失败走 `invalid_input`，不让模型猜补缺失金额。解释生成后，validator 复算确定性字段；模型文本不能修改计算结果。

先用纯函数 + FakeAdapter 建立离线 baseline。只有职责和 oracle 清楚后，才映射到目标 ADK API；否则 framework 类型会反过来绑架业务 schema，使迁移和测试困难。

## 失败归因与恢复

| 症状 | 首查责任层 | 安全回退 |
| --- | --- | --- |
| 认证或区域错误 | provider/identity/deployment | 回到已验证 endpoint，不换模型掩盖 |
| Tool 参数错误 | Agent output、Adapter、schema | 返回字段级错误，修新 Action |
| Session 恢复丢状态 | runtime/store/version | 停止写操作，从已对账 checkpoint 恢复 |
| 恢复后重复写入 | idempotency/business receipt | 查询目标系统，不盲重试 |
| Run completed 但答案错误 | acceptance/validator | 标记未通过，保留 trace |
| 部署后数据流改变 | target config/network/logging | 回滚目标版本，重新审查边界 |
| Trace 含敏感字段 | observability/redaction | 限制访问、撤销公开产物、修采集 |

修复后同时跑原失败、相邻正例和安全负例。不要为了兼容 Framework 放宽业务 schema、关闭 safety 或把 `untested` 改为 `supported`。

## 采用前检查

- ADK 语言/版本、model/provider、deployment target 和工具 schema 是否固定？
- Agent、Tool、Session、Runtime 与应用分别拥有哪段状态？
- Action confirmation 是否绑定精确资源和参数？
- Session expire/delete 是否覆盖 trace、cache 与 artifact？
- Cancel/resume/retry 是否共享预算并避免重复副作用？
- Deployment 改变时是否重新核对身份、网络、Secret 与数据区域？
- Framework evaluation 是否映射到独立业务 validator？
- 当前 baseline、候选与 rollback 配置能否重建？

## 在本项目验证证据边界

当前 `pyproject.toml`/`uv.lock` 未安装 Google ADK，本仓库也没有 Gemini/Vertex provider client、ADK Session、deployment 或 credential reader。下面只验证“上游未安装 + 三条证据轴分离”。

前置条件是 Python 3.11+、`uv 0.11.16`、Node.js 22+ 和锁定依赖。在仓库根目录离线运行：

```powershell
uv run --frozen --offline python -c "import importlib.util as u; assert u.find_spec('google') is None or u.find_spec('google.adk') is None"
npm run compat:check
npm run compat:self-test
```

预期三条命令退出码均为 0：当前环境没有可导入的 `google.adk`；兼容性矩阵把官方 Source fact、项目 Offline seam 和 Live evidence 分开，并将 Google ADK 标为只有职责说明；自测拒绝把 E0 架构入口写成 live support 的坏样例。

这不是 ADK runtime 测试，没有创建 Agent/Session、调用 Gemini/Vertex、部署服务或验证官方 API。因此不能声称目标版本兼容、恢复可靠、线上可用或模型质量较好。

若包意外可导入、命令请求凭据/网络，或 checker 把 ADK 写成已运行，停止结论并审计依赖和证据。不要运行 quickstart、配置真实 key 或放宽矩阵。命令只读仓库；误改时先检查：

```powershell
git diff -- pyproject.toml uv.lock package.json package-lock.json docs/frameworks/google-adk.md docs/references/compatibility.md
```

只恢复自己的变更；候选接入失败时回到当前无 ADK、无 provider、E0-only 的 baseline。

## 检查题与下一步

1. Session 可恢复为什么不代表外部写入幂等？
2. Tool 可注册、schema 合法和本次执行获权分别由谁证明？
3. Deployment target 改变时，哪些边界必须重新核对？
4. ADK evaluation 与业务 acceptance 之间还缺什么映射？
5. 当前离线命令为什么不能证明 Gemini/Vertex 可用？

先看[Framework 对照](/frameworks/comparison)，再用[Adapter 契约](/implementation/adapter-contract)固定 model/provider 边界，以[状态与可靠执行](/foundations/state-reliability)设计 Session 恢复。
