# Harness 学习作品集 Starter

这是一个 E0 设计脚手架，不是已经完成的作品集，也不包含模型运行结果。复制后先替换占位内容，再保存实际命令、失败和证据；不要把本目录原样提交为自己的实验成果。

## 从哪里开始

1. 在 `environment.md` 冻结 OS、运行时、commit 和工作树状态；
2. 在 `knowledge-map.md` 画出当前任务的责任与信任边界；
3. 修改 `harness/task.json` 和 `harness/config.json`，但保持公共 schema 合法；
4. 先建立可重复 baseline，再运行一个邻近负例；
5. 将结果分别写入验证、模型适配、评测、安全和迁移模板；
6. 在 `evidence/commands.md` 记录实际退出码，在 `evidence/unresolved.md` 保留未知项。

## 本 Starter 刻意没有什么

- 没有 `trace.jsonl`、`result.json` 或 `runs.jsonl`：尚未运行就不应出现结果；
- 没有真实模型、Provider、API key、个人路径或业务数据；
- 没有 E2/E3 主张，也没有通用模型排名；
- 没有替你决定 Task、Validator、风险接受或回退。

产出文件时使用新 run ID，绑定不可变输入和配置身份。失败行、未运行项和残余风险都应保留。

## 最小完成条件

- Task、Config 与输入身份可定位；
- 正例、失败例和安全负例都有实际命令与退出码；
- completed 由独立 Validator 支持；
- 没有未解释的权限扩大或真实副作用；
- 结论明确写出 E0–E3、适用范围、未决项和回退。

完整流程见站点的“综合项目：从 Starter 到可复核作品集”。
