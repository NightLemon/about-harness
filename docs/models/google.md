# Google Gemini 模型家族适配

## 核对入口

- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Google ADK models](https://google.github.io/adk-docs/agents/models/)

核对日期：2026-08-20。Gemini API、Vertex AI 与 ADK 是不同层；model ID、区域、provider adapter 和 surface 必须分别记录。

## 适配重点

- 探测 role/content parts、多模态输入、function calling、streaming、safety/stop reason；
- 明确 provider 区域、认证与数据治理，但不得把凭据写入 fixture；
- 长上下文/多模态能力用实际任务和可复现输入验证；
- ADK 配置只是 runtime 选择，不自动证明模型在工作负载中较优。

## 结论边界

当前项目不运行 Gemini live API；页面只提供适配方法和官方入口，性能状态为 E0，M5 只用离线集成替身。
