# 人在循环中的控制点：少打断，但不越权

## 人工控制的目标

Human-in-the-loop（人在循环中）不是“每一步都问用户”，也不是出错后让人兜底。它把不可逆、高风险、跨信任边界或需要业务判断的决策放到明确关口，同时让范围内、可逆、可验证的工作连续完成。

好的人工控制追求三件事：

- **授权准确**：主体、动作、资源和期限明确；
- **信息充分**：人不必重做全部调查就能判断；
- **干扰最小**：低风险操作不产生机械弹窗，高风险操作不被批量模糊化。

用户已经明确要求一个本地可逆改动时，逐文件询问通常没有意义；从本地编辑扩大到发布、费用、数据外发或权限提升时，则应重新确认边界。

## 人工参与的四种责任

### 1. 范围确认

目标巨大、影响未知或存在多个不同交付物时，确认做什么、不做什么、优先级和成功定义。范围确认不是批准未来所有副作用。

### 2. 动作授权

在删除、发布、付费、外发数据、改权限或写共享系统前，确认具体 verb/resource/identity。它发生在 handler 前，而不是工具做完后补一句“是否接受”。

### 3. 歧义裁决

多个选项会实质改变结果，且无法从 Task、项目规则或证据推断时，由有权主体选择。命名小细节或可安全默认的实现不应频繁上升为歧义。

### 4. 结果验收

机器测试可证明结构和行为，却可能无法判断视觉、业务、法律、伦理或内容质量。验收应看到 diff、预览、测试与已知限制，不只看到模型摘要。

这四种责任不能互相替代：接受计划不等于授权远端写入；授权执行不等于接受最终结果；通过测试不等于完成业务审阅。

## 先确认谁有权决定

人工参与不是“找到任意一个人点击”。每个控制点要确定：

| 决策 | 合适主体 | 不足够的主体 |
| --- | --- | --- |
| 修改当前工作区 | Task 所有者或仓库协作者 | 网页/仓库文本 |
| 新增依赖 | 代码 owner + 供应链策略 | 模型建议本身 |
| 使用付费 API | 预算/账号 owner | 只有代码权限的人 |
| 外发数据 | 数据 owner/隐私责任人 | Provider credential 持有人 |
| 发布生产 | 发布权限主体/现有流程 | 本地测试作者 |
| 改访问权限 | 资源 owner/安全管理员 | 被授权执行普通任务的 Agent |

Confused deputy（混淆代理）风险来自 Agent 拥有能力，却替无权请求者操作资源。目标系统仍要执行身份与资源授权，不能只依赖对话中的“用户让我做”。

## 按风险而不是命令名分级

同一 shell、浏览器或 API 可执行低风险读取，也可改变生产。Policy 综合：

```text
reversibility        能否真实恢复
blast radius         单文件、仓库、组织、公开互联网
data sensitivity     公开、内部、个人、凭据
identity/resource    谁的账号、哪个环境和对象
cost/quota           次数、费用、时间、配额
observability        是否有 preview、receipt 与目标查询
task explicitness    用户是否明确要求该副作用
```

默认矩阵：

| 动作特征 | 默认控制 | 示例 |
| --- | --- | --- |
| 范围内只读、无敏感外发 | 自动执行并记录 | 搜索仓库、读取公开文档 |
| 用户明确要求的本地可逆写 | 自动执行、展示 diff、运行验证 | 修改源码/中文文档 |
| 会改变共享或远端状态 | Task 级明确授权，执行后核对 | Push、PR、发送消息、更新配置 |
| 高费用、大范围或难撤销 | 动作时批准，必要时双人复核 | 生产发布、批量删除、权限提升 |
| 目标/所有权/环境不清 | 停止并升级 | 不确定账号、数据或 production |

模型置信度不是风险控制。模型非常确定时，高风险动作仍需 policy；模型不确定时，安全只读调查也不必每步打断。

## 授权是一项有边界的 Capability

一次 authorization grant（授权授予）至少绑定：

```text
grant_id      唯一审计身份
subject       谁发起、代表谁
verb          允许的动作
resource      精确目标、账号、环境
constraints   数据、费用、次数、路径、工具
evidence      执行前依据与执行后验证
lifetime      单次、当前 run 或截止时间
fallback      拒绝、过期或失败后的安全路径
revocation    如何撤销未使用/长期能力
```

只要 verb、resource、环境、数据接收方或预期副作用实质变化，就重新评估。以下不能继承：

- “修复页面” → “发布网站”；
- “读取公开 issue” → “读取私人仓库”；
- “创建 staging preview” → “部署 production”；
- “最多 1 美元 probe” → “运行完整评测矩阵”；
- “本次 run” → “以后永久允许”。

仓库文字、网页、模型输出、ToolResult 或插件描述不能替用户创建 grant。

## Approval 生命周期

```text
proposed
  → policy classifies risk
  → waiting-approval
      ├→ approved + revalidated → executing → reconciled
      ├→ denied → safe alternative / stopped
      ├→ expired → stopped
      └→ cancelled → terminal
```

状态不变量：

1. Waiting 期间 deadline、budget 和 cancellation 仍有效；
2. Approval 到达时重新检查 run、target version、diff 和资源；
3. 终态 run 不因迟到批准重新进入 executing；
4. 批准只消费一次，重复 delivery 不重复副作用；
5. 执行结果绑定 grant ID、resource receipt 和实际参数 hash；
6. Approved 后工具失败仍是失败，不自动视为完成。

批准服务不可用时，高风险动作 fail closed；低风险只读工作可继续，但不能静默扩大 scope。

## 一个可判断的批准请求

请求要让用户无需重做调查就能回答：

```text
动作：将执行的具体操作
目标：账号、仓库、环境、资源 ID 或精确路径
理由：为什么完成 Task 需要它，已有证据是什么
变更：diff/preview/命令或请求摘要
副作用：数据去向、费用、公开范围和最坏影响
验证：执行后用什么独立信号确认成功
恢复：能否回滚；不能恢复的部分
边界：本次授权不包含哪些相邻动作
有效期：单次/当前 run/截止时间
替代：拒绝后还能完成哪些安全工作
```

不合格请求：

```text
可以继续吗？
允许所有命令？
为了修问题需要更多权限，是否同意？
```

它们缺少目标、后果与边界，用户只能机械同意。

## 何时可以批量授权

同风险、同目标、同恢复、可枚举的动作可以批量：

```text
在当前 staging project 中创建最多 5 个 draft issue，
总运行时间 10 分钟，不发送通知，执行后返回全部 issue ID，
任何一项参数变化或出现非 draft 状态立即停止。
```

不应批量的情况：

- 不同账号/环境；
- 读与写混在一起；
- 可逆与不可逆动作混合；
- 数据接收方不同；
- 总费用/数量没有上限；
- 每项最终内容尚未生成，无法 preview；
- 其中一项失败会改变后续风险。

## 拒绝、过期与取消是正常状态

用户拒绝不是 ToolError，也不是让模型换参数绕过。Controller 记录 `denied`，然后：

1. 在原权限内给出只读分析、patch 或 dry-run；
2. 若替代会改变 Task，清楚说明差异并等待新选择；
3. 没有安全替代时停止，报告已完成证据与未完成项。

授权过期后不能复用。用户取消等待时，关闭 pending request；迟到 approval 只记录审计，不复活 run。

模型在拒绝后把 `delete` 改名 `cleanup`、把相同 URL 分块或换一个 tool 重试，policy 应按规范化语义/资源识别，而不是按字符串。

## 减少 Approval Fatigue

Approval fatigue（审批疲劳）会让人不再阅读。优化目标不是简单减少弹窗，而是提升信号：

- 调查阶段默认开放范围内只读；
- 用户已要求的隔离工作区可逆编辑连续执行；
- 同风险动作批量说明并设置数量/费用上限；
- 展示 diff、dry-run、接收方、环境和最终 resource ID；
- 记住同一 run 内明确拒绝，不换措辞重复询问；
- 失败时一次给出完整证据和可选路径；
- 定期分析重复 ask：改成安全默认、保留 gate 或移除危险 tool。

减少询问不能靠把 network、shell 或 production 权限永久打开。更好的方法是缩小工具、隔离环境、使用草稿/预览和资源级身份。

## 人工与自动 Validator 的分工

| 判断 | 优先自动化 | 需要人工 |
| --- | --- | --- |
| Schema/类型/退出码 | 是 | 只审异常 |
| 单元/集成测试 | 是 | 决定覆盖是否足够 |
| Diff 路径/生成文件 | 是 | 审语义和架构 |
| 视觉/UI | 截图/规则辅助 | 品牌、可用性、边界场景 |
| 引用与来源 | 链接/hash 检查 | 主张是否被来源支持 |
| 安全 policy | 机器强制 | 风险接受与例外 |
| 发布/外发 | Workflow gate | 最终业务授权 |

不要让人重复机器能稳定判定的每个细节；也不要让模型 judge 单独决定业务、法律或伦理接受。

## 委派与 Subagent

把任务交给子 Agent 不会转移授权责任。父任务必须：

- 给子任务明确 input/output/tool/budget；
- 让权限不超过父 Task；
- 隔离 context 和外部目标；
- 汇总时验证 artifact，而非相信完成摘要；
- 取消父任务时传播到子任务；
- 防止多个子 Agent 对同一资源重复写入。

子 Agent 请求高风险动作时，批准对象应包含最终资源和整体上下文，不能让大量子请求淹没人类。

## 四个工作例

### 新增依赖

请求列出精确包/版本、现有依赖为何不足、license、install script、锁文件 diff、验证和 rollback。批准这个版本不授权升级全部依赖或发布。

被拒后可保留无依赖实现或提交方案比较；不能悄悄 vendor 未审代码。

### 发布文档

本地 build 通过不等于已获发布授权。请求列出目标站点、源 commit、workflow、公开数据扫描、验证 URL 和回滚版本。批准后源 commit 变化时重新展示 diff。

### 导出数据

说明字段、行数、筛选、接收方、区域、保留和删除。能够读取数据库不代表允许把数据发送给模型或第三方。拒绝外发后可返回本地聚合统计。

### Timeout 后重复写

Approval 允许创建一个资源，但工具 timeout。不要请求“再试一次”前先用 idempotency key 查询目标。若已创建，复用 receipt；状态未知则让人看到证据与重复风险。

## 怎样评测人工控制

至少报告：

```text
interventions per run / waiting time
approved / denied / expired / cancelled
avoidable asks / missed high-risk actions
scope drift / late approval / duplicate delivery
post-approval failures
safe-alternative success after denial
human correction and review time
false allow / false deny severity
```

单独追求批准率会奖励过宽请求；单独追求询问少会奖励静默越权。按 workload、风险等级和 action type 分层报告。

## 故障注入矩阵

| Case | 预期行为 |
| --- | --- |
| Approval service 不可用 | 高风险 fail closed，低风险不扩大 |
| 用户拒绝 | 无副作用，进入替代或 stopped |
| Approval 过期/迟到 | 不执行，不复活终态 |
| 目标 version 改变 | 重新 preview 和授权 |
| 同一 grant 重复投递 | 只消费一次 |
| 拒绝后换 Tool/参数 | 规范化语义仍拒绝 |
| Grant 缺 subject/resource | Contract invalid |
| Approved 后 Tool 失败 | 记录失败，不宣告完成 |
| Cancel 与 approve 并发 | 由状态机产生唯一终态 |
| 多个 Subagent 同时写 | 所有权/幂等防重复 |

通过正常批准一次不能证明控制面可靠。

## 当前仓库的离线验证

Python 最小 Harness 的 policy test 注册一个 `dangerous` handler，让 FakeAdapter 请求它，而 Task 只允许 `echo`：

```powershell
uv run --frozen --offline pytest -q lab/tests/test_loop.py -k permission_denial
```

预期测试退出 0，`stop_reason=permission_denied` 且 handler 标志保持 false。这证明 E1 fake 路径在副作用前拒绝未授权工具。

它没有实现持久 approval queue、过期、grant ID、双人复核或目标系统 authorization，也没有真实产品/模型。不能把一个 policy 单测写成完整人工控制证明。

若 handler 被执行、拒绝结果变成 completed 或测试尝试网络/凭据，立即停止并保留失败。不要把 `dangerous` 加入 allowlist 让测试通过。

## 本项目的协作边界

仓库内只读调查、用户明确要求的可逆本地修改与相应本地验证通常属于连续工作，不应逐文件/逐命令询问。真实 API、费用、Git 远端写入、公开发布和 release 是否需要独立授权，应由当前 Task 与项目规则明确。

一旦用户明确给出相应授权，就应在该边界内完成完整流程，不要把同一已授权动作拆成反复确认。凭据、个人数据、不可恢复删除和权限提升始终按高风险处理。

## 清理、回滚与审计

离线 policy 测试只产生终端输出和可再生 cache；发送 `Ctrl+C` 停止，用 `git status --short` 核对范围后只清理本轮生成物。

真实审批系统保存 grant、preview hash、实际参数 hash、决策、执行 receipt、失败和撤销。共享配置回滚不代表撤销外部副作用；按 resource ID 对账并执行目标系统补偿。

出现主体/资源不明、批准内容与执行参数不同、迟到 grant、权限扩大、外部状态未知或审计缺失时停止执行。

## 自检与下一步

任取一次批准记录，第三方能否回答：谁在何时允许哪个主体对哪个资源做什么，限制是什么，实际执行参数是否一致，结果如何验证和恢复？

再检查：

1. 哪些动作无需询问但必须记录？
2. 哪些动作必须在 handler 前批准？
3. 拒绝后是否存在安全替代，而非隐蔽绕过？
4. 迟到/重复/取消能否产生唯一终态？
5. 人工验收和自动 validator 是否各自承担擅长的部分？

结合[安全与权限](/foundations/security)、[状态与可靠执行](/foundations/state-reliability)和[事件响应](/security/incident-response)继续演练。
