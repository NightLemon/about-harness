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
