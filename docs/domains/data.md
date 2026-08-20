# 数据 Agent 模式

## 契约优先

输入 schema、单位、时区、缺失/异常值、主键、敏感字段与允许操作必须显式。自然语言“帮我分析”不足以授权写回或删除数据。

## Harness 重点

Pydantic/JSON Schema 验证、只读默认、sample/row limit、类型和单位转换、provenance、PII masking、deterministic calculation、result schema 与审计。

## 失败模式

Schema drift、静默丢列、把缺失当 0、单位混用、训练/测试泄漏、公式幻觉、执行任意 SQL、公开敏感行、只报告平均值。

## 指标

Schema 接受/拒绝、字段级正确、缺失处理、计算复核、敏感数据泄漏、行数守恒、人工介入与成本。M5 使用合成字段和故意漂移的 fixture。
