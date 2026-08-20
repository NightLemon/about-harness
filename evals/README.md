# Evaluation fixtures

此目录提供与文档配套的中立数据格式，不包含真实仓库、模型凭据或可直接执行生产动作的 runner。

- `tasks.example.jsonl`：任务定义示例。
- `runs.example.jsonl`：已脱敏的示例 run 记录。
- `npm run eval:summary`：汇总示例记录；也可把自有 JSONL 路径传给 `scripts/summarize-evals.mjs`。

每行是独立 JSON 对象，便于流式追加和按 run 审计。生产使用时应增加 schema 验证、artifact hash、价格版本、原始事件的受控存储与脱敏策略。

