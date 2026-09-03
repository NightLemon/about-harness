# Agent 事件响应

Incident response（事件响应）的目标不是让模型“自行修复”，而是在证据仍可信时停止扩散、恢复人的控制，确认真实世界发生了什么，并建立可验证的防回归措施。Agent 的最终摘要、一个 `cancelled` 状态或一条失败响应都不能单独证明副作用已经停止。

## Event、Near Miss 与 Incident

- **Event（安全事件记录）**：值得观察的动作或异常，例如 policy 拒绝一次外域请求；
- **Near miss（险情）**：控制及时阻断、没有已知损害，但若少一层控制就可能成事故；
- **Incident（安全事故）**：机密性、完整性、可用性、授权或隐私目标已经或可能受到实质影响。

被 policy 正确拒绝的 Prompt Injection 通常是 event；模型反复尝试绕过拒绝可能是 near miss；工具已经向外域发送数据则是 incident。分类取决于影响和不确定性，不取决于模型是否“有恶意”。未知高影响状态先按较严重情况遏制，查清后再降级。

触发人工接管的典型条件包括：Secret 或个人数据可能泄漏、未授权副作用、破坏性写入、跨租户访问、供应链异常、费用/资源失控、公开结果污染、无法解释的权限提升、取消失效或审计链不完整。

## 响应前先准备什么

事故发生时才寻找 owner、停止开关和凭据入口会浪费最宝贵的时间。每种自动化在启用前准备：

| 准备项 | 必须能回答 |
| --- | --- |
| 系统/数据 owner | 谁能决定停止、恢复和风险接受 |
| 运行清单 | task、run、子任务、队列、scheduler、部署和外部工具在哪里 |
| Kill switch（停止开关） | 如何停止新任务、当前执行、重试、外发与高风险写入 |
| 身份清单 | 哪些 token/session/role 被使用，如何单独撤销 |
| 证据来源 | Trace、policy、外部审计、费用、Git、artifact 在哪里、保留多久 |
| 恢复点 | 已知良好 config、commit、checkpoint、备份和回退步骤 |
| 联络路径 | 安全、隐私、运维、法务/合规、用户沟通由谁决定 |
| 练习案例 | 上次 tabletop（桌面演练）与恢复测试何时通过 |

停止开关需要独立于被怀疑的模型和工具。例如 MCP server 可能被攻陷时，不能依靠它自己的“已停止”响应；从 controller、网络、身份或队列侧切断并在外部核对。

Break-glass access（应急高权限）只用于已定义事故操作，使用短期身份、双人或等价审计、最小范围和自动到期。它不能成为 agent 在普通失败后自动扩权的后门。

## 角色可以兼任，责任不能消失

小项目中一个人可能兼任多个角色，但记录中仍区分：

- **Incident commander（事件负责人）**：确定优先级、范围和恢复条件；
- **Operator（处置执行者）**：停止服务、撤销身份、隔离资源、实施回退；
- **Evidence owner（证据负责人）**：维护时间线、hash、访问范围和假设/事实分离；
- **Communications owner（沟通负责人）**：决定对用户、组织和外部方发送什么；
- **System/data owner**：验证业务与数据恢复，并接受残余风险。

模型可以帮助整理脱敏日志或生成待审草稿，但不能担任事件负责人、决定通知范围、撤销取证数据或自行宣布恢复。

## 用影响维度分级

不要只按报错文本分级。至少看：

1. **数据**：是否涉及 Secret、个人/多租户数据或业务机密；
2. **权限**：使用了哪个身份，能否横向访问其他资源；
3. **副作用**：只提出、已尝试、部分成功还是确认完成；
4. **范围**：单个 run、多个用户、共享 memory、供应链或 production；
5. **持续性**：攻击/自动化是否仍在运行，凭据是否仍有效；
6. **可恢复性**：是否有备份、幂等记录、撤销路径和外部回执；
7. **可见性**：日志是否完整，未知部分有多大。

团队可以定义自己的 severity（严重级别）。一种起点是：持续外发、production 破坏、高权限 Secret、跨租户暴露为最高优先；已隔离但影响未明为高；控制成功阻断且确认无副作用为 near miss。响应时限和通知义务由组织政策决定，不照抄本页。

## 固定生命周期

```text
Prepared → Detected → Triaged → Contained → Eradicated → Recovered → Closed
              │            │          │             │
              └─证据保全───┴─范围复核─┴─恢复验证────┘
```

状态转换要有可观察准入条件。`Contained` 不是“点了停止”，而是确认新执行停止、出口受限、凭据失效且影响不再扩大；`Recovered` 不是“测试绿了”，而是业务状态、权限和监控都回到已知安全边界。

## 第一阶段：检测与初始分诊

收到告警后立即生成 incident ID，记录首次观察时间、报告者、系统、run/task、初始证据和当前 owner。将内容分为：

- **已确认事实**：外部审计显示请求已到达某资源；
- **工作假设**：请求可能包含某类数据；
- **未知**：是否有重定向、下游复制或并发 run；
- **已否定**：通过独立证据排除的路径。

初始问题：动作仍在继续吗？哪个身份和环境？可能触及哪些数据/资源？是否存在其他使用同一凭据、config、fixture、memory 或扩展的 run？最近一次已知良好状态是什么？

优先查询外部系统真实状态：Git ref、消息记录、数据库 audit、云资源、网络出口和 provider usage。Agent trace 说明 controller 看见了什么，不一定证明远端提交成功或失败；timeout 也可能发生在远端已经完成之后。

## 第二阶段：停止传播

按由外到内的边界停止，避免只取消界面会话：

1. 阻止新任务进入 scheduler/queue；
2. 取消父 run、子 agent、并行 worker 和自动重试；
3. 禁用相关工具、MCP、hook、extension 和 browser profile；
4. 关闭网络出口或高风险资源的写权限；
5. 暂停部署、发布、同步和自动恢复；
6. 对每一层读取状态或审计，确认它真的停止。

Cancellation（取消）通常是协作式信号：组件必须再次检查才能退出。为模型请求、工具进程和子任务分别定义超时与强制终止；阻塞调用如果不能中断，就先在外层撤销凭据/网络并持续监视。不要因 controller 返回 `cancelled` 就关闭事件。

自动重试是常见放大器。先关重试再处置原失败；否则撤销凭据或断网会触发更多请求，幂等性不足时还可能复制副作用。

## 第三阶段：隔离与身份处置

Containment（遏制）保留必要状态但切断传播：将 artifact、机器、日志、memory namespace 或扩展版本标为隔离；禁止后续 run 读取。隔离不是把文件移动到同一个公开目录，也不是只改文件名。

Secret 可能暴露时先撤销/轮换，再调查是否被使用。分别处理 access token、refresh token、browser session、SSH key、cloud role、webhook 和 derived credential；撤销父凭据后验证已签发子会话是否也失效。

跨租户或个人数据事件暂停相关索引、缓存和导出，保存 subject/tenant 范围，不扩大读取“看看还有什么”。供应链事件固定可疑包、镜像、Action、MCP 或 skill 的精确 hash，并在干净环境中禁用，不从可疑环境生成新的可信构建。

## 第四阶段：证据保全但不复制秘密

证据目标是重建“何时、谁、基于什么输入、通过什么控制、改变了什么”。保存：

```text
incident_id / timeline / reporter
task_id / run_id / parent-child IDs
model-provider-adapter-harness / config-policy-tool versions
source/fixture/artifact hashes
proposed action / policy decision / approval reference
normalized target / external request or resource ID
exit code / retry / checkpoint / cancellation events
credential IDs and scopes（不保存 secret value）
known impact / unknowns / containment evidence
```

使用 UTC 或明确时区和单调序号；原始证据只读保存，分析副本脱敏并记录 hash。每次访问和转换记录操作者、时间、输入/输出 hash。不要把真实 Secret、客户正文或完整攻击载荷复制到 issue、聊天和复盘文档。

过早删除会破坏取证，但继续公开又扩大泄漏。先限制访问、吊销加密/分享能力、保存最小必要证据，再按数据与法律流程删除。证据保留和隐私删除发生冲突时由授权负责人决定，不能交给 agent 猜。

## 第五阶段：确认实际影响

按资源逐项核对，而不是使用一句“没有发现异常”：

| 问题 | 证据例子 |
| --- | --- |
| 工具 handler 是否执行 | controller 事件 + handler/server audit |
| 外部请求是否到达 | egress/proxy/server request ID |
| 写入是否完成 | 目标资源版本、事务或消息 ID |
| 是否重试/重复 | idempotency key、attempt、资源计数 |
| 数据包含什么 | 受控请求 hash、字段清单、最小脱敏样本 |
| 谁可能访问 | ACL、下载/查看日志、token scope |
| 是否持久化 | memory/index/cache/artifact/Git/backup 查询 |

`HTTP timeout`、进程异常和模型声称“我没有发送”都不能排除远端成功。反过来，模型提出了坏 action 但 policy 在 handler 前拒绝，且网络/目标系统没有记录，可以归类为 near miss，仍需修软控制和回归。

## 按事件类型执行 Runbook

### Secret 或数据外发

停止外发与重试；撤销相关身份；隔离 prompt/trace/result；从网络和接收方确认目标、时间和字段；检查日志、memory、cache、Git、artifact 和备份副本；由隐私/安全 owner 决定通知和删除。回归使用相同字段形状的合成 canary，不复制真实值。

### 未授权写入或破坏性动作

冻结继续写入，记录资源 ID/版本和所有重复尝试。优先使用服务提供的撤销、软删除、版本恢复或补偿事务；执行恢复前先确认不会覆盖事件之后的合法修改。Git 中不要随意 force push 或整库 reset；remote 历史、PR、Pages 与通知需要单独决策。

### 费用或资源失控

关闭新调度、递归委派和自动重试；降低并发/额度，必要时撤销计费身份；从 provider usage 与本地 run 对账。保留造成循环的最小 trace，修复 steps/model calls/cost/timeout/cancellation 上限，再用 fake adapter 注入无限循环验证。

### Prompt Injection 或 Memory 污染

隔离攻击来源和受影响 session；禁用可外发工具；清除/封锁关联 memory、索引和 checkpoint，并检查后续 run 是否读取过。修复来源/权限/数据流边界，新增直接、间接和跨 run 负例；不能只把攻击句加入关键词黑名单。

### 供应链异常

停止使用可疑版本与其生成的 artifact，固定 lock/digest/hash 和安装日志；轮换它可能读取的凭据；从已知良好源码和干净 runner 重建。比较工具 schema、权限、网络与行为 diff，未解释前不自动升级或降级到另一个未知版本。

### 公开结果或 Git 污染

先下线/限制访问和撤销其中的 Secret，再判断 clone、cache、CI log、release、Pages 和镜像是否含副本。历史重写可能影响协作者与签名，需要专门计划和授权；覆盖同名文件不能让旧对象消失。发布新版本和更正说明，并验证从公开入口下载的最终字节。

## 第六阶段：根除原因，不只修表象

Eradication（根除）回答“哪条控制为什么允许事件发生”。沿路径检查：

```text
source → context → model proposal → parser/schema → policy/approval
       → tool/identity/network → external state → trace/memory/artifact
```

把原因区分为 trigger（触发输入）、vulnerability（可被利用的缺口）、control gap（控制缺失/位置错误）、detection gap（为何未及时发现）和 recovery gap（为何难以恢复）。只删除触发文本，漏洞仍在；只增加告警，预防边界仍在失效。

修复优先顺序是减少能力、在执行前增加确定性边界、缩小身份/数据、改善检测与恢复，最后才是提示词优化。每项修复绑定 owner、目标日期、验收命令和能复现旧失败的合成负例。

## 第七阶段：从已知良好状态恢复

Recovery（恢复）从干净环境和明确基线开始，不直接复用受影响 session、memory、checkpoint、browser profile 或构建 cache。恢复前确认：

- 根因控制和负例已通过，旧危险路径默认拒绝；
- 新凭据最小权限可用，旧凭据与派生会话失效；
- 数据/代码/外部资源与预期版本一致，重复副作用已处理；
- 上游队列和下游同步不会重新注入污染；
- 监控覆盖原 detection gap，停止开关已演练；
- rollback（回退）路径和责任人在恢复窗口内可用。

采用分阶段恢复：先离线 replay，再隔离测试环境，再小范围真实探针，最后恢复自动化；每阶段定义停止阈值。对高影响动作保持只读或人工批准，直到观察窗口结束。

Checkpoint 只有在绑定的 task/config/policy/fixture 未受污染、计数器和副作用可对账时才能恢复。否则从已知良好起点重建比“继续上次进度”更安全。

## 沟通要分开事实、影响和行动

状态更新包含：发生/可能发生什么、受影响范围、已采取的遏制、用户当前应做什么、哪些仍未知、下一次更新时间。不要转发原始 Secret、攻击载荷或未经确认的归因；也不要用“问题已解决”代替恢复证据。

向用户、客户、provider、监管或开源协作者的通知由相应 owner 按政策决定。Agent 可以生成草稿，但发送对象、内容和时间需要人工确认。事故编号和公开更正应能关联内部证据，又不暴露敏感细节。

## 关闭与复盘

关闭条件是：传播停止、影响范围已合理确认、身份/数据/资源恢复、修复和负例通过、监控生效、残余风险由明确 owner 接受。仅因为告警安静或 CI 变绿不能关闭。

Postmortem（复盘）至少包含：

- 有边界的影响摘要与证据置信度；
- 从首次触发到检测、遏制、恢复的时间线；
- trigger、control/detection/recovery gaps；
- 哪些控制有效，避免修复时误删它们；
- 用户/业务影响和沟通；
- 可测试 action items、owner、优先级和截止条件；
- 残余风险、未回答问题和重新开放条件。

复盘目标是改进系统，不把“模型犯错”或“用户点了批准”当根因终点。问为什么模型拥有这项能力、审批为何不清楚、policy 为何没绑定资源、检测为何没看到实际副作用。

修复后将最小化、脱敏失败转成 incident regression（事故回归），并添加邻近反例。真实事故只证明某条路径发生过，不能用一次修复宣称所有同类攻击都已消除。

## 演练而不是等真实事故

Tabletop 让参与者按假设时间线说出动作和所需证据；technical drill（技术演练）在隔离环境实际触发停止、撤销、回退和验证。演练不使用真实客户数据、production Secret 或不可逆外部动作。

推荐场景：外域发送被 policy 拒绝；token 出现在合成 trace；递归 agent 消耗预算；MCP schema 意外扩大；公开结果含个人路径；timeout 后远端资源可能已创建。每次至少验证 owner 可联系、停止开关可用、外部状态能核对、证据可脱敏、恢复不会重复写入。

衡量 detection time（检测时间）、containment time（遏制时间）、recovery time（恢复时间）、影响范围、重复事故和 action item 完成率；不要用“事件数量越少”奖励不报告 near miss。

## 在本项目做一次无副作用演练

### 前置条件与输入

要求 Python 3.11+ 与 uv 0.11，依赖已按 `uv.lock` 安装，并从仓库根目录执行。测试使用 fake adapter、内存工具和合成 token/path；不会启动真实模型、网络、浏览器、子进程树或外部写入。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py::test_permission_denial_stops_before_tool_execution lab/tests/test_loop.py::test_concurrent_cancellation_propagates_after_adapter_returns lab/tests/test_memory_context_trace.py::test_trace_redacts_secret_values_paths_and_tool_results
uv run --frozen --offline python scripts/run-labs.py browser
```

### 预期输出与断言

Pytest 应有 3 项通过，并证明：未授权 handler 没有执行；adapter 返回控制后取消被观察为 `cancelled`；合成 token、Authorization 和个人路径未进入序列化结果。浏览器案例应为 `E1/offline`，外域负例被拒绝、`side_effects=0`。

把结果按事件响应解释：permission test 是 near miss 控制证据；cancellation test 只证明协作式检查点，不证明能强制中断阻塞 adapter 或进程树；redaction test 只证明固定模式，不证明数据从未外发。浏览器案例也没有真实模型或浏览器。

### 失败、停止、清理与回退

若危险 handler 执行、取消后仍被标为完成、合成值出现在 Result、外域负例通过，停止后续自动化；保留脱敏测试输出，修 controller/policy/redaction，不删除负例或扩大允许范围。

命令只创建内存状态和可忽略测试缓存；需要时只清理 `.pytest_cache/`。误改实现时用 `git diff -- lab/` 精确定位并只恢复自己修改。修复未验证前继续使用上一已知良好 policy/config，不把当前 lab 当成 production 恢复证明。

当前项目没有进程级 kill、远端凭据撤销、真实网络审计、队列/子 agent 停止、备份恢复或通知演练，因此不能宣称完整事件响应已实现。这里的 E1 证据只是最小 controller 控制与脱敏路径。

下一步回到[威胁模型](/security/threat-model)更新场景与残余风险，用[Secret 与隐私](/security/secrets-privacy)补删除映射，并在[供应链安全](/security/supply-chain)修复受影响版本。

## 检查题

1. Runner 返回 `cancelled` 后，为什么还要核对网络、子任务和外部资源？
2. Secret 可能泄漏时，为什么通常先撤销再完成取证？
3. Timeout 后远端可能已经成功写入，应查哪些独立证据？
4. 为什么删除触发攻击的网页文本不等于根除漏洞？
5. 哪些条件满足后，才能把事件从 `Recovered` 转为 `Closed`？
