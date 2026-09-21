# Google Gemini：适配差异与验证入口

本页集中说明这一模型家族需要额外核对的条件。通用流程只在[模型适配与选择](/models/adaptation)维护，探针格式见[协议兼容](/models/protocol-compatibility)。

<span id="核对入口与证据边界"></span>
<span id="先冻结-从哪里调用什么"></span>
<span id="先冻结从哪里调用什么"></span>
<span id="最小适配卡"></span>
<span id="协议资格探针"></span>
<span id="多模态输入是一条供应链"></span>
<span id="function-calling-与真实执行分开"></span>
<span id="safety-stop-如何计分"></span>
<span id="长上下文不是文件数量"></span>
<span id="google-adk-是独立-harness-变量"></span>
<span id="工作例-图像与结构化解释"></span>
<span id="工作例图像与结构化解释"></span>
<span id="失败归因"></span>
<span id="评测、晋级与回退"></span>
<span id="评测晋级与回退"></span>
<span id="在本项目验证离线边界"></span>

<span id="google-gemini-模型家族适配"></span>

## 来源与版本

[官方入口](https://ai.google.dev/gemini-api/docs/function-calling)，本轮检查日期 2026-09-08。[FACT:gemini-function-calling] 函数调用和返回使用结构化内容，应用把结果回送后模型才能继续。多模态输入还包含类型和顺序，不能一律压成文本。

来源记录属于 E0；本仓库没有该家族真实模型运行结果。具体型号、套餐、区域、上下文和价格不跨版本继承。

[Gemini 模型目录](https://ai.google.dev/gemini-api/docs/models)于 2026-09-21 复核，区分 stable、preview、latest 与 experimental 类别。[FACT:google-catalog] Gemini API、Vertex AI、Google ADK 与 Gemini CLI 是不同层，不能用同一家族名合并其版本、区域和运行证据。

## 冻结这个组合

分别固定 Gemini API 或 Vertex AI、区域、精确型号、SDK、输入媒体 hash 和预处理参数；安全拒绝、截断和参数错误分开统计。

<span id="检查题与下一步"></span>

## 产品特有的检查

ADK 是运行时变量，不能由 Gemini 型号推导会话行为。先运行 [ADK 离线示例](/frameworks/google-adk)，再设计目标 API 探针。

先做一个无副作用文本探针、一个完整工具往返和一个错误/取消探针。保存请求与实际型号、协议映射、用量状态和终态；协议不合格时修适配层，不进入质量比较。

## 配置与操作路径

用[适配卡](/practice/model-playbook)记录 requested/observed model、供应方、版本、工具和预算。产品用户按[Harness 教程](/harnesses/comparison)配置；自建循环先对照[Responses 参考实现](/models/openai)，只复用控制边界，不复制其他供应方的 wire 字段。

当前没有本家族可直接调用的适配器，页面不再通过共享 Replay 测试冒充家族验证。真实探针需单独授权；缺少身份、字段来源或费用上限时停止。回退恢复完整旧配置，未知写操作先对账。
