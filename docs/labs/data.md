# 数据：Schema 漂移、缺失值与敏感字段

## 目标、版本与输入

输入两行合成数据，`score` 允许缺失，`email` 必须脱敏，字段只能是 `user_id`、`score`、`email`。PydanticAI seam 表达结构化契约但不安装 PydanticAI；不存在真实个人数据。容器与三平台本地入口见[实验环境](/labs/setup)。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py data
```

预期 `row_count=2`、两个邮箱均为 `[REDACTED]`、缺失 score 保持 `null`、`sensitive_values_exposed=0`。负例用 `userId` 制造 schema drift，必须显式失败，不能静默改名或丢列。

## 失败、清理与回滚

行数变化、缺失被改成 0、原始邮箱出现在输出或未知字段被接受都属于阻断失败。Runner 不写数据；终止即可清理。真实数据事件先隔离 artifact、撤销访问并按隐私流程处理，不能只改公开结果。

## 已知限制

本案例不覆盖大型表、SQL、统计正确性或 PydanticAI 的模型重试行为，只验证 schema/缺失/脱敏的最小门禁。

下一步：[文档案例](/labs/document)。

## 前置条件与固定版本

使用 Python 3.11+、`uv 0.11.16` 与固定 schema/fixture，保持离线。案例没有 PydanticAI package，也没有真实个人数据；名称只映射结构化数据职责。

## 断言检查表

确认行数守恒、未知字段被拒绝、缺失值保持 `null`、所有邮箱均脱敏、trace 不包含原值，且结果绑定 fixture hash。若只改公开 JSON 而 runner 仍泄漏，测试必须失败。修改 schema 时新建版本，不原地兼容错误输入。

机器字段为兼容既有 schema 可能仍叫 `integration`，其证据仍是 E1 离线职责接缝。继续[文档案例](/labs/document)。
