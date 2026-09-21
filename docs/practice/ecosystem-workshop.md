# 生态机制工作坊：能力、编排与候选验收

看过[生态全景](/ecosystem/overview)后，先用三个小实验检查自己的理解：对方提供某项能力是否代表你能调用；用代码汇总工具结果究竟省掉什么；四个候选中有正确答案是否意味着最终交付正确。

本页的 E1 证据来自本仓库自编的合成记录。它没有实现 MCP 或 A2A 的网络协议，也没有加载真实 Skill、调用模型或运行供应商的程序化工具调用环境。练习中的字段是项目内部教学契约，不能直接作为产品 API 请求。

## 前置条件、版本和输入

先完成[实验环境](/labs/setup)。需要 Node.js 22+、Python 3.11+、uv 0.11.16；依赖固定在 `package-lock.json`、`uv.lock`。在仓库根目录执行命令，不配置账号或凭据。

输入是 `lab/fixtures/ecosystem.json`，格式为 `ecosystem-fixture-v1`，包含自编能力清单、三条库存记录和四个候选。实现位于 `lab/src/about_harness/ecosystem.py`，命令入口是 `scripts/ecosystem-workshop.py`。先记录 `git rev-parse HEAD`、`git status --short`；输出还会绑定 fixture、配置及实现的 SHA-256。未提交改动存在时，不能只用 HEAD 描述实际执行版本。

每次运行产生独立 `run_id`，以及 `task_id`、事件轨迹、结果、退出码、失败分类和输入身份。运行记录只输出到终端，不覆盖固定 fixture。

## 练习一：能力可用与有权执行是两件事

客户端和服务端都提供 `tools`，但只有服务端提供 `tasks`。宿主只授权 `read`；Skill 中即使建议 `write`，也不会修改宿主授权集合。

运行前预测：合法读取会计划几次 handler（工具处理函数）调用？如果把动作换成写入，又会计划几次？本练习只计算计划，不执行真实或 fake handler。

```powershell
uv run --frozen --offline python scripts/ecosystem-workshop.py protocols
uv run --frozen --offline python scripts/ecosystem-workshop.py protocols --negative
```

第一条命令退出 0，`capability_available=true`、`action_authorized=true`、`planned_handler_calls=1`；`ignored_skill_grants` 包含 `write`。第二条退出 **1**，失败分类为 `permission_denied`，计划处理函数调用数为 0。这是预期失败，不要把非零退出码改成成功。

另一个反例由测试覆盖：宿主授权读取，但请求客户端没有支持的 `tasks`，得到 `unsupported_capability`。能力、身份权限和流程说明要分别检查；MCP、A2A 与 Skill 的产品区别见[协议与技能](/ecosystem/protocols-and-skills)。这些集合判断不证明任何真实协议握手、安全隔离或认证已经实现。

## 练习二：代码汇总改变返回体，不自动减少调用

固定工具响应分别报告北、南、西三个位置有 2、3、5 件库存。直接路径把三条完整观察交给消费者；程序化路径先求和，仅返回位置 ID 与总量。

```powershell
uv run --frozen --offline python scripts/ecosystem-workshop.py orchestration
uv run --frozen --offline python scripts/ecosystem-workshop.py orchestration --negative
```

正例断言：两条路径总量均为 **10**，工具调用数仍为 **3**，程序化路径的 JSON 字节数较小，位置 ID 完整保留。`direct_payload_bytes` 与 `programmatic_payload_bytes` 是序列化字节量，不是 token、费用、缓存命中或延迟。

反例将共享调用预算从 3 缩到 2，退出 **1**，失败分类为 `budget_exhausted`。结果只保留前两次观察的事件，不输出貌似完整的库存总量。缺一条数据时，代码汇总也不能把部分结果伪装成最终答案。

该程序顺序读取内存 fake（替身）结果，不模拟真实并行加速。若任务需要根据每次结果重新判断下一步，或者需要人工审批，不能仅因汇总字节少就把整个流程塞进一次程序调用。

## 练习三：有正确候选不等于选中了它

四个固定候选来自同一个教学任务，`oracle_pass` 是已知判据标签。Selector（选择器）只读取 `score`，标签仅供最终评分使用。候选 a、c 正确，但分数最高的 b 错误。

```powershell
uv run --frozen --offline python scripts/ecosystem-workshop.py selection
uv run --frozen --offline python scripts/ecosystem-workshop.py selection --negative
```

正例中 `oracle_any_pass=true`，但 `selected_id=b`、`selected_pass=false`；程序正确展示了选择失败，所以练习本身 `passed=true`。不能混淆“演示断言成立”和“候选答案正确”。四个候选没有变成四个独立任务：`task_count=1`。

现在明确弃权规则：不确定性 `u >= τ` 时弃权，只接受 `u < τ`。覆盖率是接受数除以候选数；接受后的错误率分母只含被接受者。

| 阈值 τ | 接受候选 | 覆盖率 | 接受后的错误率 |
| --- | --- | --- | --- |
| 0.25 | a | 1/4 | 0/1 |
| 0.75 | a、b、c | 3/4 | 1/3 |

在固定分数下，提高此阈值会扩大接受集合；错误率是否变好仍取决于标签和校准，不能由阈值方向直接推出。无人被接受时错误率是 `null`，不是 0%。边界测试检查 `u=τ` 时弃权。

反例将一个不确定性改为 1.2，退出 **1**，分类为 `invalid_input`。非有限数、布尔值和越界分数也必须被拒绝。这里没有估计真实模型的 pass@k，没有运行训练，也不能证明模型采样独立或 Judge 已校准。

## 一次运行全部检查

```powershell
uv run --frozen --offline python scripts/ecosystem-workshop.py all
uv run --frozen --offline pytest -q lab/tests/test_ecosystem.py
```

两条命令都应退出 0。第一条有三个 `cases`，每项 `passed=true`，整体 `evidence=E1`、`offline=true`。第二条用可手算判据验证权限不扩张、预算停止、坏工具数据、错误选择、阈值相等及空集合风险。测试数量会随覆盖扩展变化，以这些行为断言为准。

## 失败、停止、清理与回滚

正例失败、反例意外退出 0、缺少离线依赖、fixture 身份变化或出现网络/凭据请求时停止。保存命令、退出码和失败分类；不要删除负例、放宽断言或去掉 `--offline` 来求通过。

脚本不写业务文件；pytest 可能产生 `.pytest_cache` 和字节码缓存。无需清理外部资源。若保存输出，放在自己的临时目录，发布前脱敏并核对许可。若为了练习修改文件，用 `git diff -- lab/fixtures/ecosystem.json lab/src/about_harness/ecosystem.py scripts/ecosystem-workshop.py` 查看范围，只撤回本轮练习改动，保留已有工作。

## 已知限制与下一步

这三个练习分别提供集合与权限判断、固定数据汇总、手算评测规则的 E1 证据。它们不提供上游产品兼容、真实模型质量、网络故障恢复、生产授权、成本或性能结论。

把结果写入[作品集](/guide/portfolio)：先写自己的预测，再记录一个失败、它对应的控制责任，以及该实验不能证明什么。随后按需要继续[可靠性恢复](/practice/reliability-recovery)、[评测方法](/evaluation/method)或[框架选型](/practice/framework-selection)。
