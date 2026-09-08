# OpenAI：Responses 接入主线

本页提供可执行的 Responses 适配器：先用模拟传输验证协议，再在单独授权后连接真实接口。首版只支持非流式文本和串行函数调用。[FACT:openai-function-calling]

<span id="核对入口"></span>
<span id="先区分-api-model-与-codex-surface"></span>
<span id="先冻结最小适配卡"></span>
<span id="先过协议资格-再测任务能力"></span>
<span id="先过协议资格再测任务能力"></span>
<span id="reasoning-state-不是普通消息历史"></span>
<span id="streaming-是事件协议-不是字符串打印"></span>
<span id="streaming-是事件协议不是字符串打印"></span>
<span id="适配重点"></span>
<span id="reasoning-effort-调优"></span>
<span id="不完整响应、usage-与预算"></span>
<span id="不完整响应usage-与预算"></span>
<span id="错误分类与重试边界"></span>
<span id="coding-工作例-先测组合-不测品牌"></span>
<span id="coding-工作例先测组合不测品牌"></span>
<span id="从-e0-到-e3-的晋级"></span>
<span id="在本项目验证离线边界"></span>
<span id="前置条件与固定输入"></span>
<span id="命令"></span>
<span id="预期输出与断言"></span>
<span id="当前证据边界"></span>
<span id="适配检查表"></span>

<span id="openai-模型家族适配"></span>

## 前置、版本与输入

使用 Python 3.12、uv 0.11.16；npm 入口需要 Node.js 22+。适配器使用 Python 标准库 HTTP 客户端，没有额外供应方 SDK 依赖。输入为 `lab/fixtures/protocols/responses-v1.json` 和只允许 sum 的固定任务。

协议依据是本轮 2026-09-08 打开的官方 Responses、function calling 和 reasoning 文档。真实型号必须显式填写，不从产品展示名推断 API 身份。

## 先跑离线协议

```bash
npm run model:probe
```

预期 Result（结果） completed、答案 75、工具执行一次。两次模拟响应通过 call_id 关联，第二次请求携带 previous_response_id 和 function_call_output；stream 与 parallel_tool_calls 均为 false。

```bash
uv run --frozen --offline pytest -q lab/tests/test_responses.py
```

测试覆盖坏参数、重复/缺失身份、不完整响应、拒绝、错误结果关联、未知用量、超时、预算和默认不读取密钥。E1 只验证适配器对固定响应的处理。

<span id="responses-工具循环"></span>
<span id="strict-schema、可用工具与并行调用"></span>
<span id="strict-schema可用工具与并行调用"></span>

## 状态与工具回传

ResponsesAdapter 维护协议状态；HarnessRunner 校验动作、检查策略、执行工具后，通过 ToolResultReceiver 回传结构化结果。展示轨迹另行脱敏，不承担协议存储职责。

当前实现只使用 ID 续接；跨进程 restore 明确拒绝。官方还支持完整 output items 回放，但本适配器尚未实现该路径。推理状态不能压成可见文本替代。[FACT:openai-reasoning-items]

strict 工具约束输出形状，执行层仍验证参数和权限。返回 incomplete、refusal 或多个工具请求时停止，不修补后假装完成。[FACT:openai-function-controls] [FACT:openai-incomplete-status]

## 可选真实探针

以下步骤会调用真实 API，需单独授权。先核对精确 MODEL_ID 和该型号当前价格；凭据由运行环境提供，不写进命令、配置或结果。

```bash
npm run model:probe -- --live --model MODEL_ID --max-cost-usd 0.10 --timeout-ms 10000 --input-price INPUT_USD_PER_MILLION --output-price OUTPUT_USD_PER_MILLION --price-checked YYYY-MM-DD
```

占位值必须替换后才能执行。缺少显式参数会拒绝，价格核对日期不得超过 30 天。目标地址固定为 OpenAI Responses，不接受任意 endpoint，也不自动跟随重定向。

首个探针只调用受限求和工具。请求前做保守费用估算，返回后按实际用量记账；估算不是账单硬上限。未知用量或价格保持 unknown，并停止继续调用。失败请求仍保留在 provider_observations，不能从循环已知费用小计推断它免费。

<span id="失败、停止、清理与回退"></span>
<span id="失败停止清理与回退"></span>

## 清理、回退与边界

离线命令不联网、不读取凭据；只输出本地结果。真实运行失败时先记录请求身份、错误类型与未知费用，停止重试，撤销本轮不再需要的凭据授权。回退到默认模拟传输即可复核本地协议。

现有 LiveAdapter 仍硬禁用；新 HTTP 接入是独立可选路径。未提供流式、并行工具、跨进程恢复或真实模型质量结果。产品侧配置另见[Codex](/harnesses/codex)。

## 参数与扩展边界

`reasoning.effort` 的可用值依精确型号而变，本适配器不猜测或自动选择档位。[FACT:openai-reasoning-effort] 官方 HTTP 流式响应使用 SSE 语义事件，增量、完成和错误分开；本例明确不支持 stream，不能把非流式通过当成流式合格。[FACT:openai-streaming-events]
