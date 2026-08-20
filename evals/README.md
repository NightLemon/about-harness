# Evaluation fixtures

此目录提供与文档配套的 E1 数据格式，不包含真实仓库、模型凭据或生产动作。

- `tasks.example.jsonl`：六个案例的 `task-v1` 定义；
- `study.example.json`：20 任务、6 workload、2 配置、3 重复、6 holdout 的正式比较模板；
- `runs.example.jsonl`：12 条合成 E1 配对分析样例，不是完整 120-run 矩阵；
- `npm run eval:validate`：验证 study 门槛、run 完整性、hash、split 与枚举；
- `npm run eval:summary`：报告成功率/Wilson 区间、P50/P90、失败类型和配对 win/loss/tie。

JSONL 每行是独立对象，便于流式追加和按 run 审计。E2/E3 必须另行授权真实 API/费用，并保存精确模型/provider/adapter/harness、指令/config/fixture hash、usage 和受控原始事件；不能把本目录的 `offline-replay` 样例当成模型成绩。
