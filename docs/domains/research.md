# 研究 Agent 模式

## 目标

不是生成流畅综述，而是把每个主张连接到版本化来源，并在来源冲突或不足时降级结论。

## 状态

Query、scope、source candidates、retrieved snapshots、claims、citations、conflicts、confidence/evidence、unresolved。搜索结果摘要不是已打开来源。

## Harness 重点

来源 allowlist/层级、抓取日期与 hash、逐项引用、去重、冲突保留、停止条件、refusal。模型不能凭记忆补发布日期、版本或数字。

## 指标

Citation precision/coverage、unsupported claim、来源时效、冲突识别、重复来源、拒答质量、成本与延迟。离线案例使用互相冲突的版本化文档，不调用搜索 API。

## 最小工作例

问题是“当前保留期是多少”。来源 A 写 30 天，较新的来源 B 写 45 天，但没有规则证明新版自动废止旧版。Harness 为每条主张保存 source ID、版本、日期和引用位置，输出 `conflict`，而不是让模型挑一个更像答案的数字。搜索摘要只能生成候选，打开并固定的正文才进入证据表。

## 诊断顺序

无引用先检查检索和解析；引用存在但不支持结论，归为 claim extraction 错误；来源冲突未保留，检查去重与综合指令；反复搜索仍不足则触发停止条件。不要让语言流畅度或模型自信替代可定位出处。

## 自检与下一步

能否逐句指出结论由哪份版本支持？遇到冲突时停止还是降级，应由什么规则决定？运行[研究离线案例](/labs/research)，再用[评测报告](/evaluation/reporting)表达证据边界。
