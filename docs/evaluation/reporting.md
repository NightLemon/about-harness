# 评测报告与公开结果

评测报告的任务不是把候选包装成赢家，而是让一个没有参与实验的人回答：比较了什么、漏了什么、证据支持哪一句话、是否值得采用、出错后怎样撤回。好的报告可以从结论反查到指标，从指标反查到 run（运行记录），再从 run 反查到锁定的 task（任务）、fixture（固定输入）和 config（配置）。

## 学习目标

完成本页后，你应该能够：

- 区分运行事实、派生指标、叙述结论、采用决定和发布记录；
- 为每个关键 claim（主张）绑定来源、范围、证据等级和反证条件；
- 报告矩阵流失、偏离、失败、安全事件和未知项，而不是只展示成功均值；
- 设计可复算的报告 manifest、公开结果包和完整性校验；
- 在隐私限制下说明哪些证据可公开、哪些结论因此无法独立复核；
- 通过 supersede（取代）或 retract（撤回）更正报告，不覆盖历史版本。

## 先分离五个层次

报告系统不应把原始事实、分析和业务决定写进同一份可变 JSON：

| 层次 | 回答的问题 | 权威输入 | 允许变化 |
| --- | --- | --- | --- |
| Run facts（运行事实） | 某次尝试实际发生了什么 | append-only（只追加）run/trace/receipt（回执） | 只追加更正关系，不改原字节 |
| Derived summary（派生汇总） | 按冻结公式算出什么 | 锁定 run + evaluator（评测器）版本 | 输入或算法变化就生成新版本 |
| Evaluation report（评测报告） | 证据支持哪些有边界的解释 | summary + failures + deviations | 新证据产生新报告版本 |
| Decision record（决策记录） | 谁基于什么选择采用/否决 | report + 风险/预算/责任人 | 决策可改变，但保留理由和时间 |
| Publication result（发布记录） | 哪一版被公开到哪里 | report/decision hash + 发布回执 | 新发布追加记录，不改历史候选 |

模型或 runner 返回 `completed` 属于运行事实的一部分，不等于 validator 通过；summary 的 `promotion_eligible=true` 也不等于负责人已经采用。把层次分开，才能在聚合器修复后重算指标，却不伪造“当时就是这样决定的”。

## 先写结论，再限定边界

首段用一条可证伪的决策句说明采用、否决或证据不足。至少包含 workload（工作负载）、精确配置、样本、主要指标、安全/成本门槛和证据等级：

> 在 20 个锁定任务、每任务 3 次、预算相同的测试中，候选相对基线的任务级通过率差异为……；安全违规为……，p90 成本变化为……。在这些任务和配置范围内，候选满足/不满足预注册门槛。证据为 E3，不外推到其他模型、工具或任务分布。

如果矩阵不完整、身份漂移、证据低于目标、holdout（留出集）未运行或出现安全违规，结论应直接写“不能晋级”，而不是只在附录加一行限制。不要使用“全面领先”“最佳模型”“生产可用”这类超出研究边界的词。

同一个结果可以有三种诚实表达：

| 证据状态 | 可以写 | 不能写 |
| --- | --- | --- |
| E1 固定 fake/replay | schema、runner、门禁在固定样例上通过 | 某模型更强或真实集成可用 |
| E2 锁定真实组合 | 该版本和场景下完成了有限验证 | 对其他版本、环境或业务普遍有效 |
| E3 正式比较 | 在预注册任务、预算和门槛内候选较优/不劣 | 脱离 workload 的通用排行榜 |

### 用动词控制结论强度

不同证据状态使用不同动词：

| 表达 | 需要的证据 | 常见误用 |
| --- | --- | --- |
| “记录显示/观察到” | 可定位的 run、事件或产物 | 把观察写成因果 |
| “按公式估计” | 冻结分母、聚合器和区间 | 省略缺失与抽样范围 |
| “与……一致” | 证据没有冲突但可能有替代解释 | 写成“证明了” |
| “支持在范围 S 采用” | 预注册门槛、护栏、回退均满足 | 省略版本和 workload |
| “未发现” | 明确检查器、样本和检测能力 | 写成“不存在” |
| “不能判断” | 证据缺失、区间宽或身份不明 | 被迫二选一后假装确定 |

“检查器未在本次扫描范围内匹配已知 Secret 模式”比“仓库绝对没有秘密”准确；“六个固定离线样例全部通过”也比“集成已可用于生产”准确。报告不是把语气写弱，而是让句子与证据强度相等。

### 当前样例应该怎样开头

对本仓库现有数据，一段合格摘要可以是：

> **结论：不能晋级，当前结果仅供 E1 管道教学。** Study 设计要求 20 tasks × 2 configs × 3 repeats，共 120 个 cell；当前只有 12/120（10%）个 development cell，holdout 为 0，且 run 证据 E1 低于目标 E3。观察到 `offline-engineering` 为 6/6、`offline-default` 为 1/6，配对为 5 win、0 loss、1 tie；这些是作者构造的离线样例，不是 task-level 正式比较或真实模型成绩。样例未发生 `safety_violation=true`，但没有真实 provider、费用、外部副作用或完整安全机会覆盖。

这段话把有利数字保留下来，也把覆盖、split、证据等级和未测范围放在同一屏。不能把前两句删掉，只在附录注明“样本略少”。

## 报告与证据如何对应

结论不应直接来自一张截图。保留以下追溯链：

```text
结论与决策
  └─ 指标表、区间、门槛与阻断项
      └─ 按 split/config/workload 聚合的数据
          └─ 不可变 run、失败分类与排除记录
              └─ task + fixture + config + environment 的版本/hash
```

报告头部应给出 `study_id`、报告版本、生成时间、证据截止时间、代码 commit、数据文件 hash 和生成命令。修改任何源数据或聚合逻辑都产生新报告版本；不要覆盖旧报告并保持相同版本号。

### 建立 claim ledger

Claim ledger（主张账本）让 reviewer 不必从 prose（叙述文字）猜证据。每个影响决定的主张至少记录：

| 字段 | 含义 |
| --- | --- |
| `claim_id` | 稳定标识，供正文和更正记录引用 |
| `statement` | 精确句子，不把多个结论揉在一起 |
| `scope` | workload、版本、split、时间和环境 |
| `evidence_refs` | summary 字段、run IDs、来源或 artifact hash |
| `evidence_level` | E0/E1/E2/E3，不因命令成功自动升级 |
| `status` | supported/conflicted/pending/retired |
| `counterevidence` | 已知反例、失败与不一致来源 |
| `decision_impact` | 该主张错误会改变哪项决定 |

示例：

| claim | 证据 | 可写结论 | 不可写结论 |
| --- | --- | --- | --- |
| `COV-01` | matrix 12 observed / 120 expected | 当前样例覆盖率 10% | 其余 108 个 cell 失败 |
| `PAIR-01` | 6 个 development pairs | 固定样例中 5/0/1 | 候选对真实任务普遍更强 |
| `SAFE-01` | 12 行均 `safety_violation=false` | 这些行未记录实际违规 | 系统已证明安全 |
| `RED-01` | 当前 redactor + 两个公开 JSON | 已知模式扫描通过 | 任意自由文本都无法重识别 |

正文可以更流畅，但关键句引用 `claim_id` 或能解析的表格行。若同一主张既有支持又有冲突，状态为 `conflicted` 并并列证据，不要只保留较新的有利结果。

### 机器可读的报告 Manifest

Manifest（清单）负责身份和谱系，Markdown 负责解释。一个概念结构可以是：

```json
{
  "schema_version": "evaluation-report-v1",
  "report_id": "study-a/report-003",
  "supersedes": "study-a/report-002",
  "study_id": "study-a",
  "generated_at": "<ISO-8601>",
  "evidence_cutoff": "<ISO-8601>",
  "code_commit": "<full-commit>",
  "evaluator": {"version": "summary-v2", "command": "npm run eval:summary"},
  "inputs": [
    {"path": "runs.redacted.jsonl", "sha256": "<digest>", "rows": 120}
  ],
  "claims": ["COV-01", "PAIR-01", "SAFE-01"],
  "decision": "adopt|reject|inconclusive",
  "blockers": [],
  "evidence": "E0|E1|E2|E3"
}
```

`generated_at` 说明报告何时产生，`evidence_cutoff` 说明纳入到何时的数据，两者不能混用。`supersedes` 表示新版本替代旧解释，不表示旧文件应删除。命令字段保存可复现入口；若命令依赖参数、环境或容器，还要保存 config/hash，而不是把 Secret 写进命令行。

## 最小报告结构

同一事实可按受众分层呈现，但各层不能给出不同结论：第一页是 decision summary（决策摘要），正文解释方法、结果与风险，附录或结果包提供逐项证据。高层摘要中的 `adopt` 不能在正文变成“区间跨越门槛”；附录里的安全违规也不能因为管理层页面空间有限而省略。

### 1. 研究问题与决策规则

写清 baseline（基线）、candidate（候选）、唯一主要指标、最小有意义差异、硬护栏和采用规则。说明规则在何时冻结；若是探索性分析，应明确标为探索性，不能事后伪装成预注册结果。

### 2. 任务与抽样

按 workload 列出任务数量、来源、时间范围、难度或风险分层、development/holdout/incident split，以及纳入和排除规则。公开任务 ID 清单或可校验 hash。合成数据、脱敏生产样本和人工编写题要分开计数。

抽样说明回答“这些任务代表谁”：目标用户、真实频率、长尾风险和未覆盖区域。方便收集的任务不自动代表生产分布。

### 3. 系统身份与运行条件

至少记录：

- model/provider/adapter/harness 的精确版本或 commit；
- API surface（接口形态）、region、采样参数、推理设置和并发；
- system instruction、工具 schema、policy、config 与 fixture hash；
- 操作系统、运行镜像或依赖锁、runner/Judge 版本；
- 每任务预算、超时、最大步骤、重试和停止规则。

如果供应方只提供可漂移 alias，写明 alias、实际返回的模型身份、核验日期和不可固定的风险。同名 alias 不足以证明两轮可比较。

### 4. 矩阵覆盖与数据质量

先报告预期矩阵，再报告观察矩阵。公式和数字都要可重建：

```text
expected cells = tasks × configs × repeats
coverage = observed unique cells / expected cells
```

缺失 run 单独列出 `task_id/config_id/repeat` 和原因，不能静默当失败、当成功或从分母删除。重复 cell、未知任务、split 不一致、身份漂移和坏 hash 是数据无效，不是普通候选失败。Infrastructure failure（基础设施失败）与产品失败分开报告；即使按预注册规则重跑，原尝试仍保留。

推荐先给一张覆盖表：

| split | 预期 task | 预期 cell | 已观察 | 基础设施失败 | 排除 | 缺失 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| development | … | … | … | … | … | … |
| holdout | … | … | … | … | … | … |

排除记录必须包含原始 ID、排除规则、决定时间和决定者。看过结果后新增的排除只能作为敏感性分析，不能改写主分析。

同时列出 protocol deviations（协议偏离）：实际顺序、重试、预算、并发、数据源或 Judge 与预注册方案有何不同，何时发现、影响哪些 cell、是否改变主分析。没有偏离时写“未观察到已知偏离”，并说明检查范围；不要用空白表示已确认没有。

### 5. 主指标、区间与配对

每个比例同时给分子/分母、点估计和区间，例如 `17/20 = 85%，95% Wilson interval […]`。比较同一任务上的两个配置时，以 task 为分析单位，报告 win/loss/tie、配对差异和每个 workload 的方向；不要把同一任务的重复运行当成互相独立的任务扩大样本量。

主指标放在最前。次要指标、切片和事后发现分开标记，避免从很多指标里只挑好看的一个。区间跨过预注册的无差异或不劣界限时写“证据不足”，不要把 `p > 0.05` 写成“两者相同”。具体计算见[指标、区间与效应量](/evaluation/metrics)。

### 6. 失败、安全与人工介入

总通过率会掩盖失败机制。按 `contract/context/planning/tool/execution/verification/safety/budget/infrastructure` 报告数量、任务 ID 和典型脱敏样例；展示 baseline 与 candidate 是否把失败从一种类型转移到另一种。

安全是硬门槛，不与平均质量互相抵消。单列未授权工具调用、越权写入、提示注入服从、敏感数据暴露和停止失败。人工介入要报告触发次数、所处步骤与结局；“人工接管后成功”不等于自治完成。

### 7. 延迟、token 与费用

至少报告 p50/p90、总量和 task 级分布，并说明是否包含失败、重试、缓存、Judge、工具和人工成本。零费用需要解释是离线 replay、免费额度还是确实未计费，不能让读者误以为真实调用免费。

质量与资源一起决策：如果候选只在高预算路由上有收益，应报告适用路由，而不是把高成本配置设为全局默认。均值相同也可能隐藏尾延迟恶化，因此不能只报平均值。

### 8. 决策、回退与未解决项

最后逐项对照预注册门槛，标记 `pass/fail/not evaluated`，给出 `adopt/reject/inconclusive` 决策、负责人和生效范围。`not evaluated` 不能算通过。写明上一默认配置、回退触发条件、回退命令或操作入口、验证 smoke（冒烟检查），以及仍需 E2/E3 验证的开放问题。

推荐用 decision table（决策表）强迫逐项核对：

| 条件 | 阈值 | 观察/区间 | 状态 | 证据引用 |
| --- | --- | --- | --- | --- |
| 数据与身份有效 | 无漂移/坏 hash | … | pass/fail | … |
| 安全 hard gate | 0 实际违规 | … | pass/fail | … |
| Primary effect | 下界 ≥ 预注册改善 | … | pass/fail/not evaluated | … |
| Cost guardrail | 上界 ≤ 预算 | … | pass/fail/not evaluated | … |
| Rollback | 演练通过 | … | pass/fail | … |

最终 decision 由这些条件按预注册逻辑产生，而不是作者凭总体印象填写。自动生成的 decision 仍需负责人确认适用范围；人工覆盖自动结果时记录覆盖人、理由、时间和风险接受，不修改原计算。

开放项区分三类：会阻断当前决定的 blocker、允许有限采用但需监控的 residual risk（剩余风险）、只影响未来扩展的 follow-up。把所有问题都写成“未来优化”会隐藏真正阻断项；把非关键建议都叫 blocker 又会让报告无法使用。

## 图表怎样不误导

表格优先于装饰性图表。图的坐标从哪里开始、误差线表示什么、样本单位是什么，都写进标题或注释。不同分母不能只画等宽柱；缺失值不能画成 0；颜色之外再用文字或形状表达状态，保证灰度和色觉差异下仍能读懂。

每张图都附源数据、生成脚本/命令和版本。若图表与机器可读 summary 不一致，以锁定源数据重新生成并暂停传播旧图，不能手工改图片数字。

### 图表也要能被复核和无障碍读取

每张图提供相邻数据表或可下载表格，标题写清分析单位、split 和分母。误差线注明是 Wilson、bootstrap interval、标准差还是其他量；P90 标明分位算法、样本数和 timeout 处理。截断 y 轴时显式标记，堆叠图各层之和能回到总分母。

不要只用红/绿表示 pass/fail，增加文字、形状或纹理；阅读顺序、alt text（替代文本）和表头应能让屏幕阅读器理解。Alt text 描述结论与异常，不必逐点复述所有数字；完整数值留在数据表。

先让脚本从 summary 生成图与表，再让报告引用生成 artifact。手工把数字复制到幻灯片很容易产生双重事实来源；确需重排版时也保留 source hash 和生成时间。

## 公开结果包

一个可复核的公开包建议包含：

```text
report.md                  # 有边界的结论与决策
study.json                 # 任务、配置、重复、split、门槛
summary.json               # 机器生成的聚合结果
runs.redacted.jsonl        # 脱敏后的运行记录或可核验子集
exclusions.json            # 排除与缺失原因
checksums.txt               # 文件 hash
README.md                  # 生成、验证、限制与联系入口
```

若许可证、隐私或安全边界不允许公开 run，应发布字段 schema、聚合规则、hash、缺失说明和可共享的合成样例，并明确“无法独立复算”这一限制。不要用不可公开作为省略失败分布的理由。

### 完整性与复算路径

`checksums.txt` 至少覆盖 manifest、study、summary、公开 runs、exclusions 和报告正文，并规定路径规范化与 hash 算法。校验通过只证明下载字节与发布清单一致，不证明数据真实或分析正确；还需要 evaluator 自测、来源谱系和独立复算。

README 给出从空目录开始的最短复算路径：运行时/容器版本、依赖锁、输入 hash、命令、预期退出码和关键断言。若只能复算 summary、不能重跑真实模型，就明确写“analysis reproducible, execution not independently reproducible”（分析可复算、执行不可独立重现），不要笼统称“完全可复现”。

公开包可使用内容 hash 或不可变 release/version 定位。`latest` 页面适合导航，不适合作为审计引用；报告和决策应引用固定版本。对象存储、Pages 或附件更新后，重新下载并校验发布字节，记录 publication receipt（发布回执），不能只因上传命令退出 0 就宣称公开成功。

建议由另一环境执行一次 clean-room replay（干净环境复算）：只根据 README 与公开包重建 summary，比较机器字段与图表。失败应记录在 report blockers 或 reproducibility status，不要由原作者在原工作目录手工修到相同。

## 脱敏不是字符串替换

`lab/results/public/` 只放聚合结果与精选合成/脱敏 trace（轨迹）。禁止提交原始 prompt、`raw_trace`、credential、authorization、secret、cookie、个人路径、真实账号、内部域名、未授权源代码或可反推出个人身份的组合字段。

自动扫描只能发现已知键名和模式，还需人工检查：自由文本中是否含客户内容；时间、稀有任务与错误堆栈能否重识别；引用和 URL 是否暴露内部资源；截图、二进制和压缩包是否绕过扫描。无法确认许可时停止公开，先保留在访问受控位置。

若公开后发现污染：立即隔离文件和派生页面，保留取证 hash 与访问范围，撤销受影响凭据，检查 Git 历史、缓存、Pages artifact 和下游副本，再发布带新版本号的清理结果及更正说明。不要覆盖同名文件来制造“从未发生”。

### 内部证据与公开证据分层

内部 reviewer 可能有权读取原始 trace，公开读者只能看到脱敏记录。报告应列一张 disclosure matrix（披露矩阵）：每类字段的权威存储、访问角色、公开变换、保留期和无法公开的原因。公开 summary 中的每个聚合仍需能由某个受控 reviewer 核对到原始事实。

脱敏可能改变可复算性。例如删除自由文本后，外部读者无法复核 Judge 的 quote 是否存在；这时可公开候选内容的受许可合成替代、受控审计证明或明确的不可复核声明。不能一边删除必要证据，一边声称任何人都能独立验证全部结论。

Small-cell suppression（小单元格抑制）用于防止稀有组合重识别时，要说明哪些 cell 被合并/隐藏、阈值和对总数的影响。被抑制数据仍进入受控主分析还是仅从公开表隐藏，必须区分；公开表的合计不能因隐藏而悄悄变化。

## 更正、取代与撤回

报告发布后仍可能发现聚合 bug、坏 run、身份漂移、错误脱敏或结论越界。按影响处理：

1. **Contain（控制）**：暂停传播或采用，固定受影响版本、URL、hash 和下游使用范围；涉及 Secret 时同时走事故响应。
2. **Assess（评估）**：定位第一处错误属于源事实、evaluator、叙述、决策还是发布层，列出受影响 claim IDs。
3. **Regenerate（重生成）**：修复输入或 evaluator，保留旧字节，生成新 report ID、summary 和 checksums。
4. **Classify（分类）**：数字不变的文字澄清可发 correction；结论或关键数字改变则 supersede；证据无效或有安全/隐私风险则 retract。
5. **Propagate（传播）**：更新导航页和 decision record，通知已知使用者，旧页面显著链接新状态，不能只在新报告脚注说明。
6. **Prevent（防复发）**：把最小坏输入加入 evaluator 负例或事故回归，并记录为何旧检查没有发现。

更正记录至少包含：旧/新 report ID 与 hash、发现时间、发现者角色、错误范围、受影响主张、旧/新数字、决策是否改变、处理人和验证命令。不要删除旧发布或复用同一 tag；历史可见性是学习和审计的一部分。

如果原报告已被外部引用，无法保证所有副本撤回，就明确列出已知传播边界。新结果也不能声称“问题从未发生”；正确说法是“版本 N 因原因 R 于时间 T 被版本 N+1 取代/撤回”。

## 发布前的独立复核

作者自检之后，reviewer 按相反方向走一遍：

1. 从结论中的每个数字和动词定位 claim ledger；
2. 从 claim 定位 summary 字段、失败、偏离和原始 run；
3. 随机抽取成功、失败、排除、timeout 和安全相关样本复算；
4. 在干净环境执行 manifest 中的命令并核对 hash；
5. 检查摘要、正文、图表、机器 JSON 和 decision record 是否一致；
6. 尝试构造会推翻结论的合理替代解释或缺失处理；
7. 验证回退入口和旧默认配置仍可解析。

Reviewer 不是重新写报告，而是寻找能改变决定的第一处分歧。无法访问必要证据时，结论应标为“未独立复核”并说明原因，不能把批准按钮当成验证证据。

## 在本项目生成和核对报告

### 前置条件与输入

要求 Node.js 22+、依赖已按 `package-lock.json` 安装，并从仓库根目录执行。输入为 `evals/study.example.json`、`tasks.example.jsonl`、`fixture-refs.example.json`、`runs.example.jsonl`，公开样例位于 `lab/results/public/`。这些是 E1 离线数据，不需要凭据、网络或真实模型。

### 命令

```powershell
npm run eval:validate
npm run eval:summary
npm run results:redact
```

### 预期输出与人工断言

`eval:validate` 应报告 20 tasks、6 workloads、2 configs、3 repeats、120 个预期 cell、12 个已观察 cell 和 108 个缺失 cell。`eval:summary` 应报告 `matrix.complete=false`、`promotion_eligible=false`、没有 holdout run，并列出 `incomplete_matrix`、`evidence_below_target` 两个阻断项。`results:redact` 应确认两个 JSON 文件通过当前键名、路径和凭据模式扫描。

然后用 `Get-ChildItem lab/results/public/*.json` 枚举并人工打开汇总与轨迹两个样例，断言它们标记 `evidence=E1`、`offline=true`，没有声称真实 framework 或模型质量，trace 序号连续且不含真实页面内容。

### 失败、停止、清理与回退

若 validator 报告 identity/hash/split 错误，停止生成结论并修复数据生产路径；若 redactor 报告敏感内容，先隔离结果和撤销可能的凭据，不要为了过门禁只改字段名。机器扫描通过但人工发现可重识别信息时同样停止公开。

命令只读评测输入与公开 JSON，并向终端输出，不创建需要清理的实验结果。若本轮误改公开样例，用 `git diff -- lab/results/public/` 精确确认，只恢复自己改动的文件；不要覆盖他人的未提交工作。正式报告更新应保留旧版本，新版本验证失败时继续引用上一份已验证报告和默认配置。

## 当前证据边界

本项目样例只有 12 行 development E1 数据；它展示 schema、fixture lineage、聚合、失败分类和脱敏门禁，没有完整重复、holdout、真实 provider、真实费用或任务级正式晋级计算。即使 `offline-engineering` 在这 6 个配对样例里是 5 win、0 loss、1 tie，也不能据此宣称模型更强或配置应上线。

继续阅读[回归与晋级](/evaluation/regression)，或进入[评测实验室](/practice/evaluation)运行样例。隐私处理见[Secret 与隐私](/security/secrets-privacy)。

## 检查题

1. 为什么只报告“准确率 85%”不足以复核结论？
2. 一个 holdout cell 缺失时，能否从分母删除后继续晋级？
3. 自动脱敏脚本通过后，仍需要检查哪些重识别风险？
4. `promotion_eligible=true` 为什么仍不能代替完整的采用决定？
