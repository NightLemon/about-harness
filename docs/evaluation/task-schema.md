# Task、Run、Trace 与 Result Schema

## 稳定接口

`lab/schemas/` 使用 JSON Schema draft 2020-12。核心对象包括 `task/run/trace/result`，正式实验再组合 `config`、`eval-run` 与 `study`。Schema version、ID、预算、环境、fixture hash、停止原因、结构化事件和指标不能靠自由文本补齐。

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

## 一个对象如何贯穿实验

Task 固定目标、输入引用、验收与预算；Run 绑定环境和配置；Trace 保存有序事件；Result 只汇总最终状态。Study 再定义任务集合、候选、重复与采用规则。Fixture hash 若变化，即使 task ID 相同也不是同一实验单元，必须产生新引用。

## 失败诊断

Schema 合法但字段语义错误，交由 runner 契约和交叉引用检查；重复 `run_id` 或同一 task/config/repeat 单元重复必须拒绝；config 内 model、harness 或 instruction hash 漂移要建立新 config。读取旧 schema 失败时保留旧 reader，不原地改写公开结果。

## 检查题与下一步

为什么自由文本“环境相同”不能代替 config hash？Trace 缺 sequence 会破坏什么归因？查看[指标](/evaluation/metrics)如何消费字段，并运行[离线 Runner](/labs/runner)观察实际记录。
