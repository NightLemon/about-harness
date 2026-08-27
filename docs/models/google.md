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

当前项目不运行 Gemini live API；页面只提供适配方法和官方入口，性能状态为 E0，实验只使用离线职责接缝。

## 最小适配卡

记录 Gemini API 或 Vertex AI surface、区域、精确 model ID、SDK/adapter 与 safety 配置。用文本、结构化 function call、多模态输入、stream 中断和取消构成小探针；输入图像与文档使用合成数据并固定 hash。ADK 属于 runtime 层，不能替代模型身份与任务评测。

## 失败诊断

先区分客户端 parts 映射、provider safety stop、工具 schema、区域权限和模型任务错误。多模态答案异常要保留预处理尺寸与 MIME；长上下文失败先核对实际发送内容，不从目录中的文件数量推断 token。配置变化一次只改一个主要变量。

## 检查题与下一步

为什么“ADK 能调用 Gemini”不等于这组任务优于基线？Safety 拒绝应作为失败还是预期控制，取决于哪个预注册规则？先读[Google ADK](/frameworks/google-adk)，再按[评测方法](/evaluation/method)定义判定。
