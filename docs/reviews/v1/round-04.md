# V1 Review Round 04：模型、Provider、协议和调优方法

## 结论

本轮基于 `review-v1-round-04-baseline` 修复一个 P2：OpenAI 家族页没有把 Responses 的工具循环、reasoning state 和 model-dependent effort 转成可执行 adapter 契约，读者即使“请求成功”也可能丢失连续状态或错误归因工具副作用。

## 修改前证据

- Baseline：`916d9247bd8c42b3416c368b4b1e3fd4c7ed11ca`
- Findings commit：`47793e0`
- Finding：`R04-P2-01`
- 官方来源：OpenAI Function calling 与 Reasoning models，响应 hash 记录在 baseline
- 详细复现：`artifacts/reviews/v1/round-04/findings.md`

## 修正

- 区分 OpenAI API model 身份与 Codex product surface。
- 把 function calling 写成模型请求、应用校验/执行、按 `call_id` 回传的五步循环。
- 增加 `previous_response_id` 和完整 output items 回放两条 reasoning-state 探针。
- 把 effort 支持值、默认值和有效响应作为精确 model ID 的实验变量。
- 登记三个官方事实，保存来源 hash，并新增模型协议正反例门禁。

## 验证与边界

`model:check`、`model:self-test`、`facts:check`、`docs:check` 和完整 `npm run verify` 均通过；事实注册表共 15 条 verified claim。内容结果 commit 为 `58777d9`。本轮只读取官方 OpenAI 文档，没有调用真实模型/API、产生费用或执行远程操作。
