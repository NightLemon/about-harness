# 评测报告与公开结果

评测报告的任务不是把候选包装成赢家，而是让一个没有参与实验的人回答：比较了什么、漏了什么、证据支持哪一句话、是否值得采用、出错后怎样撤回。好的报告可以从结论反查到指标，从指标反查到 run（运行记录），再从 run 反查到锁定的 task（任务）、fixture（固定输入）和 config（配置）。

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

## 最小报告结构

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

## 图表怎样不误导

表格优先于装饰性图表。图的坐标从哪里开始、误差线表示什么、样本单位是什么，都写进标题或注释。不同分母不能只画等宽柱；缺失值不能画成 0；颜色之外再用文字或形状表达状态，保证灰度和色觉差异下仍能读懂。

每张图都附源数据、生成脚本/命令和版本。若图表与机器可读 summary 不一致，以锁定源数据重新生成并暂停传播旧图，不能手工改图片数字。

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

## 脱敏不是字符串替换

`lab/results/public/` 只放聚合结果与精选合成/脱敏 trace（轨迹）。禁止提交原始 prompt、`raw_trace`、credential、authorization、secret、cookie、个人路径、真实账号、内部域名、未授权源代码或可反推出个人身份的组合字段。

自动扫描只能发现已知键名和模式，还需人工检查：自由文本中是否含客户内容；时间、稀有任务与错误堆栈能否重识别；引用和 URL 是否暴露内部资源；截图、二进制和压缩包是否绕过扫描。无法确认许可时停止公开，先保留在访问受控位置。

若公开后发现污染：立即隔离文件和派生页面，保留取证 hash 与访问范围，撤销受影响凭据，检查 Git 历史、缓存、Pages artifact 和下游副本，再发布带新版本号的清理结果及更正说明。不要覆盖同名文件来制造“从未发生”。

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
