# 回归集、Holdout 与持续评测

## 三个集合

- development：调工具、指令、上下文和预算；
- holdout：配置与晋级规则冻结后一次性打开；
- incident regression：由脱敏生产失败转成固定负例。

任务至少覆盖四类 workload；本模板覆盖六类。每配置每任务至少 3 次，任务而不是 run 才是主要独立样本。Provider 5xx、runner 崩溃等基础设施失败按预注册规则重跑，原失败仍保留。

## 漂移触发

模型 alias、harness/adapter、工具 schema、指令、依赖、fixture 或业务任务分布变化都触发受影响回归。只要 hash 变化，就不能把新 run 与旧配置无条件合并。

## 恢复

回归失败保留上一默认配置和结果，候选不晋级；不要删除失败 task 或移动阈值。若 holdout 泄漏，作废该轮并建立新的未见任务。

下一步：[报告](/evaluation/reporting)。
