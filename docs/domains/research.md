# 研究 Agent 模式

## 目标

不是生成流畅综述，而是把每个主张连接到版本化来源，并在来源冲突或不足时降级结论。

## 状态

Query、scope、source candidates、retrieved snapshots、claims、citations、conflicts、confidence/evidence、unresolved。搜索结果摘要不是已打开来源。

## Harness 重点

来源 allowlist/层级、抓取日期与 hash、逐项引用、去重、冲突保留、停止条件、refusal。模型不能凭记忆补发布日期、版本或数字。

## 指标

Citation precision/coverage、unsupported claim、来源时效、冲突识别、重复来源、拒答质量、成本与延迟。M5 用本地互相冲突的版本化文档，不调用搜索 API。
