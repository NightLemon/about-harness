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

## 前置条件与固定版本

使用 Python 3.11+、`uv 0.11.16` 和锁定 fixture；运行时保持无网络。第三方 package 没有安装，`LangGraph` 名称只表示职责映射。

## 断言检查表

检查两个冲突来源都保留、每条 claim 有 citation、证据不足路径能停止、trace 与 fixture hash 可对应。Schema 合法但吞掉冲突仍是失败。修改规则时建立新 fixture 版本，保留旧输入用于回归；静态成功不证明任何 live 搜索或模型综合质量。

机器字段为兼容既有 schema 可能仍叫 `integration`，正文统一把它解释为离线职责接缝。下一步是[数据案例](/labs/data)。
