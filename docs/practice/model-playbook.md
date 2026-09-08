# 模型适配卡工作表

本页填写一份可追溯的适配卡。通用方法集中在[模型适配与选择](/models/adaptation)，协议探针见[兼容矩阵](/models/protocol-compatibility)。



<span id="模型适配卡"></span>

## 可复制模板

```text
卡片 ID、版本、作者与日期：
任务、开发/留出样本、输入身份：
供应方、精确模型 ID、端点、API 版本：
Harness、适配器、指令、工具及配置 hash：
推理设置、上下文策略、步骤/请求/时间/费用预算：
来源、checked 日期及 pending 项：
资格探针、断言、结果产物与 E0/E1/E2/E3：
简单基线、候选、任务聚合及采用阈值：
失败分类、未知用量、关键安全失败：
决定、允许范围、未验证项、重测触发：
停止条件、清理、回退身份与外部状态对账：
```

`unverified` 表示没有对应证据，`qualified` 只表示通过已列资格，`adopted` 必须限定采用任务和条件。失败或证据过期后撤回相应状态；保留旧版本和替代关系。

## 填好示例：预审补丁回放

| 字段 | 已填写内容 |
| --- | --- |
| 身份 | coding-execution-demo-v1；reviewed-patch-replay；无真实供应方端点 |
| 工作负载 | 六个独立编码缺陷，开发/留出各三；两配置，一次运行 |
| 输入与设置 | 固定 tasks.json；配置 baseline/candidate 选择不同预审补丁；预算实际传入 HarnessRunner |
| 资格 | 工具名、参数、步骤预算、独立工作区验收、产物关联和负例通过 |
| 用量 | 未调用模型，模型 token 与 API 费用为 0；测量本地时长；不估计真实模型成本 |
| 效用 | 候选 6/6、基线 0/6；仅说明预审补丁在这些测试上的表现 |
| 决定 | qualified for offline regression；学习研究保持 learning_only，不能晋级真实模型 |
| 未验证 | 模型自行生成补丁、跨任务泛化、供应方拒绝行为和真实费用 |
| 重测与回退 | 任务、补丁、验证器、运行源码或配置改变即新跑；保留旧报告 |

详细卡片与真实结果引用见 `examples/portfolio-completed/model-card.md`。不要把示范数字移到自己的模型名称之下。

<span id="一张卡要支持四个决定"></span>
<span id="卡片生命周期"></span>
<span id="两条证据轴必须分开"></span>
<span id="可复制的完整模板"></span>
<span id="先写摘要后填细节"></span>
<span id="先写摘要-后填细节"></span>
<span id="身份与配置怎样填写"></span>
<span id="不把-alias-当快照"></span>
<span id="config-hash-不是配置说明的替代品"></span>
<span id="只允许一个主要处理变量"></span>
<span id="协议资格怎样填写"></span>
<span id="结果怎样写才不误导"></span>
<span id="task-是主要分析单位"></span>
<span id="安全和资格不是加权分"></span>
<span id="缺失不是零"></span>
<span id="保留最差案例"></span>
<span id="路由规则必须可执行"></span>
<span id="本仓库的离线示例卡"></span>
<span id="验证并复核这张离线卡"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="证据边界"></span>
<span id="revision-与审阅方法"></span>
<span id="常见失真"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

## 执行与验收

Responses 可选适配器使用 `usage-v1` 区分已知和未知用量。默认模拟传输覆盖串行工具往返、截断、拒绝、超时与预算；实际模型组合仍未验证。其他供应方差异留在各模型页。

按[固定环境](/guide/prerequisites)运行：

```bash
npm run model:probe
uv run --frozen --offline pytest lab/tests/test_responses.py
npm run study:check
```

固定协议输入为 `lab/fixtures/protocols/responses-v1.json`；预期工具返回 75，第二次请求携带相同调用 ID 的结果，并保留续接 ID。多工具并行和跨进程恢复应明确拒绝。成功命令只能支持对应探针，不能自动提高证据等级。

<span id="失败停止清理与回退"></span>
<span id="回退必须指向完整配置"></span>
<span id="失败、停止、清理与回退"></span>

## 失败、清理与回退

缺来源、模型身份漂移或未知用量时撤回相关结论。模拟测试在进程退出后清理状态；报告保留。真实模式必须另获授权并明确提供模型、预算、时限及核过日期的价格；未支持的模式停止使用，不用猜测值补齐费用。回退适配器前对账未决工具调用。
