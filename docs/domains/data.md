# 数据 Agent 模式

## 契约优先

输入 schema、单位、时区、缺失/异常值、主键、敏感字段与允许操作必须显式。自然语言“帮我分析”不足以授权写回或删除数据。

## Harness 重点

Pydantic/JSON Schema 验证、只读默认、sample/row limit、类型和单位转换、provenance、PII masking、deterministic calculation、result schema 与审计。

## 失败模式

Schema drift、静默丢列、把缺失当 0、单位混用、训练/测试泄漏、公式幻觉、执行任意 SQL、公开敏感行、只报告平均值。

## 指标

Schema 接受/拒绝、字段级正确、缺失处理、计算复核、敏感数据泄漏、行数守恒、人工介入与成本。离线案例使用合成字段和故意漂移的 fixture。

## 最小工作例

输入有两行 `user_id/score/email`，其中一个 score 缺失。Schema validator 先拒绝 `userId` 等未知字段，再把 email 替换为固定脱敏标记；确定性代码计算行数与统计量，模型只解释已经验证的结果。缺失保持 `null`，不能静默变成 0；自然语言请求也不授权写回源表。

## 诊断顺序

先核对 schema 版本和行数守恒，再检查单位、时区、缺失策略、计算复算和敏感字段。若结果异常，保留原始 fixture hash 与中间表，不让模型通过删列修正。任何写入、删除或外发都需要独立 policy 与幂等键。

## 自检与下一步

为什么结构化输出合法仍可能计算错误？怎样证明脱敏后没有旁路字段泄漏？运行[数据离线案例](/labs/data)，并对照[Secret 与隐私](/security/secrets-privacy)扩展负例。
