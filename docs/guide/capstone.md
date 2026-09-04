# 综合项目：从 Starter 到可复核作品集

## 这不是填写表格比赛

Capstone（综合项目）的目标，是用同一个小 Task 串起知识地图、最小 Harness、模型适配、配对评测、安全评审和跨 Harness 迁移。另一位读者应能只看版本、输入、命令、Trace、Result 和失败记录，就判断你的结论是否成立。

仓库提供 `examples/portfolio-starter/`。它是 E0 脚手架，不是答案：

- Task/Config 满足当前公共 JSON Schema，但输入身份仍需替换；
- 所有模型协议、运行、评测和安全结果默认是 `untested`；
- 不提供伪造的 `trace.jsonl`、`result.json` 或 `runs.jsonl`；
- 不含真实凭据、个人路径、业务数据、网络或费用；
- 每个模板都要求保留停止、清理、回退和证据边界。

完成综合项目不要求调用真实模型。只要 E1 fake/replay 证据完整、结论诚实，仍然能证明你理解 Harness 的核心责任。需要 E2/E3 时再取得明确授权。

## 最终交付

```text
Question / decision
  → Task + immutable input identity
  → Harness responsibility map + Config
  → Baseline + negative cases
  → Run + Trace + artifact + Result
  → Model adaptation card
  → Evaluation study/report
  → Security review + incident drill
  → Migration responsibility map
  → Evidence boundary + decision + rollback
```

六份产物应引用同一个 Task 和输入，不要为每章重新编一个不相干案例。复用背景可以减少工作量，也能暴露一项设计改变怎样影响协议、权限、状态、评测和迁移。

## 第一步：复制 Starter

先确认当前工作区没有需要保护的同名目录。PowerShell：

```powershell
Test-Path my-harness-portfolio
Copy-Item -Recurse examples/portfolio-starter my-harness-portfolio
```

bash/zsh：

```bash
test ! -e my-harness-portfolio
cp -R examples/portfolio-starter my-harness-portfolio
```

第一条预期为 PowerShell `False`，或 POSIX 命令退出 0。若目标已存在，停止并换一个明确目录；不要用覆盖或递归删除清场。

复制后先读 `README.md`。不要立刻把所有 `待填写` 改成 `passed`；先建立真实证据，再更新对应状态。

### 目录怎样映射六项作品

| 作品 | Starter 路径 | 首要问题 |
| --- | --- | --- |
| 知识地图 | `knowledge-map.md` | 谁拥有目标、动作、授权、状态和验收？ |
| 最小 Harness | `harness/` | 坏 Action 和越权 Tool 在哪里失败关闭？ |
| 模型适配卡 | `model-card/` | 精确 model/provider/adapter/surface 是否合格？ |
| 配对实验 | `evaluation/` | baseline/candidate 是否同条件且矩阵完整？ |
| 安全边界 | `security/` | 不可信输入怎样借能力造成具体损害？ |
| 跨 Harness 迁移 | `migration/` | 责任语义、gap 和补偿控制是什么？ |
| 证据索引 | `environment.md`、`evidence/` | 命令、失败、未知和回退能否追溯？ |

## 第二步：选择一条贯穿 Task

Starter 的 Task 是“修复固定合成工作区中的边界错误，并生成可独立验收的结果”。它只是形状，不是已冻结输入。你可以：

1. 使用本站 Coding fixture 熟悉流程；
2. 制作自己的合成小仓库；
3. 使用已获授权且可公开的最小真实案例。

Task 应足够小，能在一次学习会话中反复运行；又要包含至少一个真实边界，例如路径限制、失败测试、注入文本、重复 Action、timeout 或 checkpoint 恢复。

### 固定输入身份

`harness/task.json` 中的 `replace-with-immutable-commit-path-hash` 必须替换为：

```text
repository/fixture commit
repository-relative path
content or manifest hash
task revision
schema / instruction / tool versions
```

只写“当前文件”或“最新版”不能复现。若输入有 license、隐私或公开限制，也在 `environment.md` 记录。

### 写出可判定的验收

至少包含：

- 原失败在 baseline 可重复；
- 目标行为与相邻回归通过；
- changed path、Tool、network 和费用不越界；
- completed 由独立 Validator 支持；
- timeout、取消或结果未知时安全停止；
- cleanup 和 rollback 可执行。

不要把标准答案藏进 Prompt，也不要把“模型说完成”写成 acceptance。

## 第三步：先运行现有 E1 种子

在修改 Starter 前，运行当前 Coding 案例，学习一份证据需要哪些字段：

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

它应显示固定 fixture hash、`baseline_failures=["single","multiple"]`、受限 patch、三个测试通过、`negative_rejected=true`、`offline=true` 和 `evidence=E1`。

这条结果属于本站 Coding fixture。可以借用记录方式，不能复制 hash/输出后声称自己的 Task 已运行。自己的作品集必须生成新的输入身份、Run 和 Result。

## 第四步：完成知识地图与 Harness 设计

在 `knowledge-map.md` 标出：

- Task ingress、Context、Adapter、Action validator；
- Policy/approval、Tool executor、State/checkpoint；
- Acceptance validator、Trace、Artifact 和 Result；
- Data、Control、Evidence 三个平面；
- 一条成功路径和一条失败/取消路径。

再更新 `harness/config.json`。默认 `model_id=not-applicable`、`adapter=replace-before-running`、`evidence=E0` 是诚实的初始状态。只有实际运行对应组合后，才修改身份和证据等级。

### 最小 Harness 验证矩阵

| Case | 要证明什么 | 不能只看什么 |
| --- | --- | --- |
| Baseline failure | 原问题存在且输入固定 | 旧截图 |
| Fixed positive | 业务 acceptance 通过 | 模型文本 |
| Adjacent positive | 修复没有破坏近邻行为 | 目标测试一个点 |
| Invalid Action | Runtime contract fail closed | TypeScript/Python 静态类型 |
| Permission denial | Handler 未执行 | 最终没有看到副作用 |
| Budget/timeout/cancel | 迟到结果不覆盖终态 | UI 显示停止 |
| Resume/idempotency | 不重复已确认副作用 | Checkpoint 中没有结果 |

每项写入 `harness/verification.md`，包括实际命令、退出码、事件、handler count、Result 和当前不能证明什么。

## 第五步：写模型适配卡，但不急着调用模型

在 `model-card/adaptation.md` 先完成：

- requested alias 与 resolved identity；
- Provider、surface、Adapter、Harness 和 Config；
- messages、tool/result、stream、stop/error、usage、cancel/retry probe；
- Context、Instruction、Tool、Policy、Memory 和 Reasoning 设置；
- 资格失败、fallback 和重测触发。

没有真实调用授权时，协议结果保持 `untested/E0`。官方文档可以支持产品事实，却不能代替 E2 runtime probe；离线 Replay 能支持 Harness 行为，却不能支持真实模型质量。

模型卡应服务于决定：“这个精确组合能否进入当前 workload 评测？”它不是模型功能宣传页。

## 第六步：预注册配对评测

在看候选结果前填写 `evaluation/study.md`：

1. 决策问题、baseline 与唯一主要变量；
2. Workload、不同 Task、development/holdout；
3. Repeats、Task 成功规则和缺失 cell 处理；
4. Task acceptance、安全、时间、token/费用、Tool error 与人工轮次；
5. 晋级、停止和回退阈值。

Starter 的 `report.md` 默认：

```text
promotion_eligible: false
decision: defer
blocker: no runs collected
```

这是正确起点。只有矩阵完整、证据等级足够且预注册门槛通过，才改变晋级决定。不要把未运行写成零失败或 100% 成功。

### 避免三种分母错误

- 同一 Task 的重复 run 不能当作更多独立 Task；
- 基础设施失败可以分层报告，不能无声删除；
- 缺失矩阵 cell 不能用成功样本补齐。

报告至少保留 task-level 配对差异、失败分布、最差案例、区间、替代解释和适用范围。

## 第七步：攻击自己的设计

`security/threat-model.md` 已放入两个种子场景：不可信文件诱导外发，以及 timeout 后重复写入。把它们改写成自己的完整攻击链：

```text
主体 → 入口 → 可控数据
  → 信任/权限边界
  → 身份/Tool/组合
  → 具体动作与损害
  → 控制失效条件
```

为每个高优先级场景提供 Prevent、Detect、Contain、Recover 和实际测试。至少运行一个 Prompt Injection 或权限扩大负例，并断言危险 handler 次数、外域连接、敏感值和副作用，而不只检查最终文字。

### 人工控制不要两极化

- 已在 Task 内授权、低风险、可逆的动作可以 `auto`；
- 工具、目标、数据、环境或影响面变化时 `ask`；
- Task 外能力、凭据读取、未知目标或无法解释的高影响动作 `deny`。

Approval 绑定 subject、规范化资源、参数 hash、数据来源、环境、费用、有效期和可撤销性。拒绝后不能换 Tool 名绕过。

事件演练应走完检测、停止传播、隔离/撤销、影响对账、根因、恢复和回归；只改 Prompt 不算闭环。

## 第八步：迁移责任，不翻译文件名

在 `migration/responsibility-map.md` 对 instructions、tools、sandbox、approval、network 和 state 逐项填写：

```text
source semantics
target semantics
gap
compensating control
evidence axis
preserves boundary
```

目标产品未运行时写 `untested`。先设计 read-only、deny、ask、network、resume 与 Validator probe，再做 shadow/cutover。目标边界更宽、状态无法迁移或外部写入无法对账时停止。

## 第九步：建立证据索引

`evidence/commands.md` 不是命令备忘录，而是实际运行台账：

| 必需字段 | 为什么 |
| --- | --- |
| started/ended、commit、dirty paths | 证明运行起点 |
| exact command + exit code | 区分计划与实际执行 |
| Task/Config/fixture identity | 防止条件漂移 |
| artifact/hash | 让结果可重读 |
| key observation | 连接业务验收 |
| evidence level | 限制结论 |

`evidence/unresolved.md` 保留未知、所需证据、owner、期限和当前决定。未知不是失败数字，也不能因为时间过去自动关闭。

不要删除不利 run。发现证据与结论冲突时，先撤回结论，再修实现或研究设计。

## 第十步：独立复核与评分

先按[作品集评分规则](/guide/portfolio)检查六项硬门槛：

1. 安全边界；
2. 可复现性；
3. 证据诚实；
4. 外部验收；
5. 恢复能力；
6. 公开卫生。

任一失败先修，不计算总分。门槛通过后，再按正确性、因果证据、迁移性、效率成本评分。

作者和第二位审阅者应独立打分。任一维度分差超过 10，回到具体 artifact 对齐；保存两份原始评分和差异理由，不只保留平均数。

## 在当前仓库验证 Starter

### 前置条件与固定输入

- Python 3.11+、Node.js 22+、`uv 0.11.16`；
- 锁定依赖已在本地 cache，从仓库根目录运行；
- Starter 保持 E0、`live_enabled=false`、`network=none`；
- 不使用 API key、真实 Provider、外部副作用或费用。

### 命令

```powershell
uv run --frozen --offline pytest -q lab/tests/test_contracts_and_schema.py::test_portfolio_starter_task_and_config_match_public_schemas
uv run --frozen --offline python scripts/run-labs.py coding
npm run secrets:check
```

### 预期与人工断言

第一条应通过，证明 Starter 的 `task.json` 同时通过 JSON Schema 与 Python runtime parser，`config.json` 通过公共 Config schema；还应断言 Config 为 E0、禁用 live、network 为 none。

Coding 案例应退出 0，并证明固定 baseline 在单值/多值失败，patch 只修改 `src/collect.py`，空/单/多值三个测试通过，坏 patch 被拒绝。`secrets:check` 应扫描 Starter，且不命中凭据或个人路径。

这些检查不验证 Markdown 内容已经填写，也不把 Starter 升级为 E1。真正的完成证据只能来自你复制后的 Task、Run、Trace、Result 和独立复核。

### 失败、停止、清理与回滚

若 schema 测试失败，不要放宽公共 schema；修 Starter 的具体字段。若 Coding 案例输入 hash 漂移、patch 越界或负例通过，停止使用它作种子，先恢复 fixture/evaluator 一致性。若 Secret 扫描命中，隔离文件并删除/轮换真实敏感值，不能新增忽略规则掩盖。

复制目录是本地学习产物。放弃练习前先保留仍需取证的脱敏失败记录，再移动到明确归档位置；不要用递归删除处理路径不明的目录。仓库模板修改失败时审核：

```powershell
git diff -- examples/portfolio-starter docs/guide/capstone.md lab/tests/test_contracts_and_schema.py
```

只回滚本轮候选，不覆盖自己的作品集结果或其他工作树改动。真实外部副作用仍需在目标系统对账。

## 当前证据边界

Starter 本身是 E0。公共 schema 测试只证明两个 JSON 模板结构合法；Coding runner 是独立的 E1 种子案例。它们不证明：

- 你复制后的 Task、Config 或 Validator 已正确填写；
- 真实模型/Provider/Adapter 协议和质量；
- 生产 sandbox、网络、身份、状态和事件响应；
- 评测样本、重复或 holdout 足以支持采用；
- 跨 Harness 迁移已经运行。

完整作品集的价值不在于所有状态都变成 `passed`，而在于每个决定都能追到可靠证据，未知项被准确保留，失败时能安全停止和恢复。

## 最终答辩

完成后，用自己的 artifact 回答：

1. 谁拥有 completed，模型能否绕过？
2. 哪个负例改变了你的设计？
3. 哪条结论仍只有 E0/E1，升级缺什么？
4. Timeout 后怎样判断外部动作是否发生？
5. 哪项权限是强制边界，哪项只是指令？
6. 迁移时哪项责任不能逐字复制？
7. 候选退步或泄漏时如何停止、对账和回退？

如果答案只能引用本文，而不能引用自己的 Task、Trace、Result、命令或失败记录，综合项目还没有完成。
