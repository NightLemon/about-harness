# 回归集、Holdout 与持续评测

## 三个集合

- development：调工具、指令、上下文和预算；
- holdout：配置与晋级规则冻结后一次性打开；
- incident regression：由脱敏生产失败转成固定负例。

任务至少覆盖四类 workload；本模板覆盖六类。每配置每任务至少 3 次，任务而不是 run 才是主要独立样本。Provider 5xx、runner 崩溃等基础设施失败按预注册规则重跑，原失败仍保留。

## 漂移触发

模型 alias、harness/adapter、工具 schema、指令、依赖、fixture 或业务任务分布变化都触发受影响回归。同一 `config_id` 内的 config version、model、harness、instruction hash 与 evidence 必须一致；任一身份字段变化就建立新 config ID，不能把新 run 与旧配置合并。

## 恢复

回归失败保留上一默认配置和结果，候选不晋级；不要删除失败 task 或移动阈值。若 holdout 泄漏，作废该轮并建立新的未见任务。

下一步：[报告](/evaluation/reporting)。

## 工作例

十个开发任务用于调 context，五个未见 holdout 只在候选冻结后打开。候选在开发集提升，但 holdout 的安全拒绝漏掉一例，因此不采用；失败任务脱敏后进入 incident regression，不能从 holdout 移到开发集再宣称通过。下一次模型或指令 hash 改变时重新运行受影响集合。

## 失败诊断

回归数量下降先检查任务是否被删除；重复 run 缺失检查矩阵完整性；alias 漂移检查 model identity；基础设施失败按预注册规则重跑但保留原行。阈值不能在看到候选结果后移动，holdout 泄漏则整组作废并建立新任务。

## 检查题与下一步

为什么 run 不是主要独立样本？何时只需运行受影响子集？用[实验方法](/optimization/experiment)定义配置，再在[结果报告](/evaluation/reporting)分开 development 与 holdout。
