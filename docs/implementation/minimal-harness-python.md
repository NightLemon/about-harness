# Python 最小 Harness：从控制循环到工作区任务

本页展示运行时责任怎样落到代码。先跑最小循环，再用同一个 HarnessRunner 驱动真实临时工作区，避免只理解接口而不知道怎样连接任务。

<span id="学习目标与证据边界"></span>
<span id="前置条件与固定环境"></span>
<span id="代码地图"></span>
<span id="第一步-运行最小-smoke"></span>
<span id="第一步运行最小-smoke"></span>
<span id="第二步-沿-trace-还原控制流"></span>
<span id="第二步沿-trace-还原控制流"></span>
<span id="第三步-理解公共契约"></span>
<span id="第三步理解公共契约"></span>
<span id="taskspec"></span>
<span id="action-与-toolcall"></span>
<span id="checkpoint"></span>
<span id="runresult"></span>
<span id="第四步-预算与终态"></span>
<span id="第四步预算与终态"></span>
<span id="第五步-policy-在-handler-前生效"></span>
<span id="第五步policy-在-handler-前生效"></span>
<span id="第六步-retry-与-idempotency"></span>
<span id="第六步retry-与-idempotency"></span>
<span id="第七步-checkpoint-恢复"></span>
<span id="第七步checkpoint-恢复"></span>
<span id="第八步-取消与-deadline"></span>
<span id="第八步取消与-deadline"></span>
<span id="第九步-completion-proposal-与验收"></span>
<span id="第九步completion-proposal-与验收"></span>
<span id="第十步-context、memory-与-trace"></span>
<span id="第十步contextmemory-与-trace"></span>
<span id="第十一步-replay-与-live-禁用边界"></span>
<span id="第十一步replay-与-live-禁用边界"></span>
<span id="json-子集验收不等于完整业务完成"></span>
<span id="已知限制与下一步"></span>

<span id="python-最小-harness-从契约到可恢复循环"></span>

## 前置与版本

使用[统一环境](/guide/prerequisites)：Python 3.12、uv 0.11.16，工作区研究另需 Git 和 Node.js 22+。代码与依赖固定在当前 commit 和 uv.lock；输入使用预设 Action（动作提议） 或已审阅的补丁。

## 先观察最小循环

```bash
npm run lab:smoke
```

预期 Result（结果） 的 schema_version 为 1.1，status/stop_reason 均为 completed，model_calls=2、tool_calls=1、steps=1。Trace（轨迹） 包含工具结果、检查点、验收结果和终态。

steps 只统计成功或复用的工具步骤。模型提议完成后，默认 JSON 子集验证器比较 Task（任务）.acceptance；失败反馈回到循环，仍消耗同一调用预算。

## 代码职责

| 模块 | 责任 |
| --- | --- |
| contracts | Task、Action、Result 与值域校验 |
| loop | 预算、策略、工具、验收和唯一终态 |
| adapters | Fake、Replay 和独立可选 Responses 路径 |
| tools / policies | 工具注册、有限重试、幂等与授权 |
| acceptance | JSON 子集默认实现与可替换验收接口 |
| study_demo | 临时 Git 工作区、真实测试、运行产物与研究 |
| usage | 已知与未知用量的版本化观察 |
| context / memory / trace | 上下文选择、记忆生命周期与展示轨迹 |

外部 动作提议 经过深拷贝和运行时重验后才能计入控制流。工具执行后，通过可选 ToolResultReceiver 把结构化结果交给适配器；展示轨迹单独脱敏。

## 接上实际工作区

```bash
npm run study:demo
```

Workspace 工具只允许读取 solution.py、应用已审阅补丁和执行固定 verify.py。WorkspaceValidator 不信完成文本，重新检查源码、测试脚本和 diff，再运行测试。输入、配置、测试结果、Run、轨迹 和 结果 自动关联到完整报告。

详细输入与断言见[编码实验](/labs/coding)。同一接口因此既能演示 echo，也能承载可独立验收的小型工程任务。

<span id="完整验证"></span>
<span id="失败排查"></span>

## 契约与失败验证

```bash
uv run --frozen --offline pytest -q lab/tests/test_loop.py lab/tests/test_contracts_and_schema.py lab/tests/test_responses.py
npm run study:check
```

预期坏 动作提议、未知字段、非有限数、权限拒绝、错误结果关联和迟到完成都失败关闭；同幂等键的不同参数不能执行第二个副作用。研究检查还拒绝假完成和坏产物。

<span id="清理、回滚与停止条件"></span>
<span id="清理回滚与停止条件"></span>

## 清理、回滚与边界

失败时记录第一个错误与输入身份，修拥有该责任的组件；不要通过扩大权限或删除负例恢复绿色。临时仓库自动清理，运行报告保留。源码回退只处理本轮候选。

E1 主线是同步单进程实现，没有持久队列、跨进程幂等或强制抢占任意阻塞函数。默认 JSON 验收只验证声明的结构条件；真实工作区使用专门验收器。可选 Responses 首版不支持流式、并行工具或跨进程恢复，见[接入教程](/models/openai)。
