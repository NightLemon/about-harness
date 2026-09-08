# 框架选型工作表

本页记录选型决定；各框架的责任边界见[框架对照](/frameworks/comparison)。先写需要解决的具体问题，再选择运行时。

<span id="页面性质与学习目标"></span>
<span id="已知限制与证据边界"></span>
<span id="最终复核清单"></span>
<span id="第一步把想用框架改写为决策问题"></span>
<span id="第二步画出-task-形状"></span>
<span id="第三步建立更简单的-baseline"></span>
<span id="第四步建立责任矩阵"></span>
<span id="第五步先做硬资格探针"></span>
<span id="第六步资格通过后再比较效用"></span>
<span id="第七步写出-adoptreject-或-defer"></span>
<span id="工作例研究流程是否需要-graph-runtime"></span>
<span id="最终要交付什么"></span>
<span id="第一步-把-想用框架-改写为决策问题"></span>
<span id="第二步-画出-task-形状"></span>
<span id="四种常见形状"></span>
<span id="第三步-建立更简单的-baseline"></span>
<span id="第四步-建立责任矩阵"></span>
<span id="第五步-先做硬资格探针"></span>
<span id="探针记录模板"></span>
<span id="最小资格矩阵"></span>
<span id="第六步-资格通过后再比较效用"></span>
<span id="第七步-写出-adopt、reject-或-defer"></span>
<span id="决策模板"></span>
<span id="工作例-研究流程是否需要-graph-runtime"></span>
<span id="task-形状"></span>
<span id="baseline"></span>
<span id="候选判断"></span>
<span id="framework-选型工作表-先证明它减少了哪种复杂度"></span>

## 填写模板

| 项目 | 填写内容 |
| --- | --- |
| 问题 | 工作负载、现有瓶颈、决策时间与硬约束 |
| 任务形状 | 分支、循环、并行归并、状态寿命、人工暂停及参与者所有权 |
| 简单基线 | 普通函数或显式状态机的版本、实际故障和维护成本 |
| 候选身份 | 框架及依赖版本、模型替身或供应方、工具、预算、来源 |
| 责任映射 | 框架提供什么；授权、隔离、业务验收和恢复由谁补足 |
| 资格探针 | 真实执行路径、错误归因、状态恢复、重复副作用和网络边界 |
| 效用实验 | 相同输入的质量、恢复错误、时长、资源及维护工作量 |
| 决定 | 采用、拒绝或暂缓；采用条件、已知缺口、回退和重测触发 |

资格探针通过后再比较效用。减少代码行数不能单独证明收益；关键约束失败也不能被平均分抵消。

## 填好示例：本地政策冲突

| 项目 | 当前记录 |
| --- | --- |
| 任务 | 读取 policy-a、policy-b，保留 30/45 天冲突并引用两来源 |
| 材料 | examples/frameworks/materials.json；模型替身答案另存 replay-answer.json |
| 简单基线 | 读取固定材料并做确定性集合归并，不需要模型判断 |
| LangGraph 1.2.11 | 执行分支、状态归并、检查点暂停与恢复，展示显式流程控制 |
| OpenAI Agents SDK 0.22.1 | 实际 Runner 执行两次模型替身请求，关联一次工具结果 |
| Google ADK 2.8.0 | 实际运行器生成事件，通过工具上下文保存会话状态 |
| AutoGen 0.7.5 | 两名参与者用回放客户端协作，团队有界终止 |
| 共同验收 | 从原材料独立计算结果；注入错误产物后必须失败 |
| 外部边界 | 不提供凭据，关闭遥测，阻断外部连接；记录的外部尝试为 0 |
| 决定 | 固定任务继续使用简单基线；四框架保留为机制教学样例 |
| 未决 | 没有同条件真实模型效用研究，不据此排序或决定生产采用 |

运行证据见 `lab/results/public/frameworks/summary.json`。版本为本轮固定身份，升级必须重跑，不能沿用旧结论。

<span id="在当前仓库运行一次工作表验证"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与人工断言"></span>
<span id="检查题与下一步"></span>

## 执行与验收

使用[统一工具链](/guide/prerequisites)。四个示例在独立环境锁定依赖；首次准备需要下载包：

```bash
npm run frameworks:prepare
npm run frameworks:check
```

第二条命令离线执行。确认每个运行时都有自己的观测字段和错误产物负例；不能仅检查 import 成功。共用材料和验收是为了对齐教学任务，当前没有测量框架性能排名。

<span id="失败、停止、清理与回滚"></span>
<span id="失败停止清理与回滚"></span>
<span id="回退不是重新安装旧版本"></span>

## 失败、清理与回退

缺依赖时回到准备步骤，不使用浮动版本。发现外部连接、假工具循环或恢复后重复读取时停止采用并保存首个错误。示例使用进程内状态，退出即结束；删除环境时仅处理对应示例目录下自己创建的 `.venv`。真实迁移还需数据和副作用对账，见[迁移实验](/labs/migration)。
