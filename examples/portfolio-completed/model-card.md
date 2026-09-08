# 模型适配卡：reviewed-patch-replay

| 字段 | 当前记录 |
| --- | --- |
| 状态 | qualified，仅限固定离线回归 |
| 模型 | reviewed-patch-replay；ReplayAdapter，没有真实供应方 |
| Harness | HarnessRunner 与 WorkspaceValidator；精确源码 hash 见每条 Run.environment |
| 任务 | coding-execution-demo-v1，六个合成编码任务，开发/留出各三 |
| 工具 | workspace.read、workspace.patch、test.run；允许范围固定 |
| 配置 | baseline / candidate 选择不同预审补丁；配置文件 hash 随 EvalRun 保存 |
| 资格 | 参数校验、工具执行、独立验收、预算、产物关联及相应负例 |
| 用量 | 无模型调用，模型 token 和 API 费用为 0；不推断真实模型价格 |
| 决定 | 保留候选为固定测试回归基线；learning_only 阻止真实模型晋级 |
| 未验证 | 自主编程能力、模型泛化、真实协议、费用和生产权限 |

[Run](../../lab/results/public/study-demo/demo-collection-candidate/run.json) 保存当前源码身份；其中 source_commit 是运行时所在的已有提交，未提交改动由 runtime_source_hashes 补充，不能把提交号单独当成全部执行源码。

另有 Responses 模拟传输探针，但它和此回放模型是两个不同身份；不合并资格。升级适配器、任务或配置后重新生成结果。缺证据则撤回相关状态；不覆盖旧卡片或运行。
