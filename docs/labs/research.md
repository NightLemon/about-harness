# 研究：冲突来源与逐项引用

## 目标、版本与输入

三个合成来源对 `retention_days` 给出 30/45 的冲突，对 `review_required` 给出一致证据。LangGraph seam 只执行确定性“收集—分组—冲突/支持—引用”状态转换，不安装 LangGraph 或调用搜索/模型 API。容器与三平台本地入口见[实验环境](/labs/setup)。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py research
```

预期第一个 claim 为 `conflict` 且同时引用 `policy-v1`、`policy-v2`；第二个为 `supported` 并引用 `legal-note`；`unsupported_claims=0`。负例“确定是 45 天”必须被拒绝，因为现有证据不能消除冲突。

## 失败、清理与回滚

缺引用、只保留较新数值但没有版本规则、或把搜索摘要当来源都算失败。Runner 不落盘；终止即可清理。修改状态图前保留原 fixture hash，若新逻辑吞掉冲突就回滚到最近通过版本。

## 已知限制

本案例不覆盖网页抓取、来源真实性、license 或 live 搜索漂移；它只验证 claim-level provenance 与“证据不足时不强行断言”。

下一步：[数据案例](/labs/data)。
