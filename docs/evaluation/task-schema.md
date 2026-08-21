# Task、Run、Trace 与 Result Schema

## 稳定接口

`lab/schemas/` 使用 JSON Schema draft 2020-12。核心 `task/run/trace/result` 来自最小 harness；M5 增加 `config`、`eval-run` 与 `study`。Schema version、ID、预算、环境、fixture hash、停止原因、结构化事件和指标不能靠自由文本补齐。

## 关系

```text
Task(task_id, goal, acceptance, budgets)
  └─ Run(run_id, environment, config, fixture_hash)
      ├─ Trace(sequence, kind, timestamp, redacted data)
      └─ Result(status, stop_reason, metrics, checkpoint, error)

Study(tasks, configs, repeats, promotion)
  └─ EvalRun(task/config/repeat/split + hashes + outcome)
```

## 验证与失败

```powershell
uv run --frozen --offline pytest lab/tests/test_contracts_and_schema.py
npm run eval:validate
```

正例必须同时通过 JSON Schema 和 runner 契约；`input_tokens`、`output_tokens` 是必填非负整数。反例覆盖缺字段、坏预算、重复 ID、重复逻辑单元、config identity 漂移、错误 split 与 hash。Schema 演进新增版本，不原地改写历史 artifact；读取器迁移失败时保留旧版本并停止发布。

下一步：[指标](/evaluation/metrics)。
