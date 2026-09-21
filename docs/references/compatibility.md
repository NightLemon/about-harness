# 兼容性与实际验证范围

本表回答“当前仓库实际运行了哪一层”。产品声明、配置文件、框架运行、模型调用和任务质量分别需要证据。

<span id="为什么不能只写-支持"></span>
<span id="为什么不能只写支持"></span>
<span id="五条证据轴"></span>
<span id="状态词怎样使用"></span>
<span id="coding-harness-当前状态"></span>
<span id="harness-责任映射"></span>
<span id="模型页面当前状态"></span>
<span id="framework-与领域职责接缝"></span>
<span id="组合兼容-不能由单项拼出来"></span>
<span id="组合兼容不能由单项拼出来"></span>
<span id="protocol-兼容至少拆哪些行"></span>
<span id="一条兼容记录的主键"></span>
<span id="怎样写合法结论"></span>
<span id="证据怎样升级"></span>
<span id="drift-与复核"></span>
<span id="失败、清理与回滚"></span>
<span id="失败清理与回滚"></span>
<span id="已知限制与使用方法"></span>

<span id="兼容性与责任矩阵-把-支持-拆成可验证证据"></span>

## 当前状态

| 对象 | 已完成 | 证据 | 未验证 |
| --- | --- | --- | --- |
| Python / TypeScript | 运行契约、循环、验收与用量状态 | E1，共享正负例 | 生产分布式执行 |
| 完整编码研究 | 临时 Git、实际补丁与测试、12 单元报告 | E1，实际产物关联 | 模型生成补丁 |
| 本地领域实验 | Markdown/HTML/CSV 解析与 Playwright 操作 | E1，原始文件和断言 | 开放网页、生产数据 |
| LangGraph 1.2.11 | 实际图、聚合、暂停与恢复 | E1，假模型/固定材料 | 持久部署和真实模型 |
| Agents SDK 0.22.1 | 实际 Runner、工具循环与回传 | E1，模型替身 | 真实供应方协议 |
| ADK 2.8.0 | 实际运行器、会话与事件 | E1，模型替身 | Gemini/Vertex 与部署 |
| AutoGen 0.7.5 | 实际参与者、回放客户端与终止 | E1，固定回复 | 多智能体质量收益 |
| Responses 适配器 | 模拟响应、串行工具、错误与用量 | E1，模拟传输 | 真实 API、流式与跨进程恢复 |
| Codex / Pi / Claude Code | 固定包的 --help 及静态配置 | E1 入口、E0 配置 | 模型任务和权限实效 |
| 六个模型家族 | 官方资料与适配差异 | E0；DeepSeek 部分 pending | 模型质量与成本比较 |

来源见[事实注册表](/references/fact-registry)。固定包帮助的历史执行证据与 2026-09-21 滚动文档核对分开：例如 Claude Code 2.1.263 的入口探针不支持 2.1.277+ 才出现的 AGENTS.md 加载结论。后者仅为目标新版本的 E0 来源事实。[FACT:claude-cli-entry] [FACT:claude-agents-md]

## 新增生态对象

| 对象 | 来源范围 | 当前项目证据 | 仍待验证 |
| --- | --- | --- | --- |
| Gemini CLI | CLI 定位、用户层迁移公告 [FACT:gemini-cli-overview] [FACT:gemini-cli-lifecycle] | E0；无本地产品运行 | 目标账号、版本与任务 |
| MAF、Deep Agents、PydanticAI、CrewAI | 架构和生命周期，见[现代运行时](/frameworks/modern-runtimes) | E0；未安装这些上游包 | 真实目标组合 |
| LlamaIndex、Browser Use | 数据与浏览器路径，见[知识与记忆](/ecosystem/knowledge-and-memory)、[多模态](/ecosystem/multimodal) | E0；本地领域实验不调用这些上游包 | 上游接口与部署 |
| MCP 2026-07-28、Tasks、Apps、A2A、Agent Skills | [协议与技能](/ecosystem/protocols-and-skills) | E0；工作坊集合判断是内部教学 E1 | 协议、授权与身份互操作 |
| Agents API | [托管责任](/ecosystem/long-running) | E0；未创建托管会话或沙箱 | 服务运行与恢复 |
| vLLM、SGLang、Ollama | [服务定位](/ecosystem/models-and-services) | E0；未加载权重或启动服务 | 模型/服务协议组合 |
| OTel GenAI 与基准族 | [测量对象和边界](/ecosystem/evaluation-observability) | E0；未运行上游基准 | 遥测兼容和模型质量 |

[生态工作坊](/practice/ecosystem-workshop)的三个 E1 练习验证集合映射、固定数据编排与候选选择阈值。它们不执行 MCP handler、上游协议或模型生成；不得给上表对象继承实验等级。

## 产品责任分开验收

| 责任 | 应观察的行为 |
| --- | --- |
| 指令 | 目标 cwd、版本和例外下实际加载的文件及覆盖关系 |
| 权限 | 技术可达范围、审批询问、网络出口分别测试；allow 规则不等于封闭白名单 |
| 状态 | 未决副作用、检查点身份和恢复；worktree 只隔离版本状态 |
| 工具与扩展 | schema、发现、执行、来源、数据流与卸载 |
| 验证与回滚 | 谁验收业务结果；代码恢复之外的外部副作用怎样对账 |

Codex 的 permission profile 与 approval policy 是不同控制；workspace-write 不代表拒绝工作区外所有读取。[FACT:codex-permission-profiles] [FACT:codex-sandbox-approval] Claude Code 还需分别核对权限规则与 sandbox。[FACT:claude-permissions]

四个框架装在各自示例环境；根 Python 环境继续保持最小依赖，不能用根环境导入失败判断示例没有运行。

## 怎样读取旧记录

原有六个 JSON 实验及其公开样例继续按历史输入读取。旧 `integration` 是当时的职责映射名称，不能解释为框架执行；当前领域函数使用通用 example 名称，历史输出只由兼容层恢复。

Study 1.0 保留 run-level 语义，1.1 保留原任务规模与聚合规则，1.2 支持学习研究与正式比较。EvalRun 1.1 额外关联实际运行产物；新格式不反向改变旧样例。

## 怎样判断目标组合

固定产品/框架版本、模型、供应方、适配器、工具与配置，再逐项标记 supported、emulated、rejected 或 untested。模型名称相同不能保证工具、状态与权限语义相同。

离线合格后，另行授权的真实探针可形成 E2；代表性任务研究才可能形成 E3。真实框架加假模型仍为 E1，不把安装或命令成功升级成模型质量结论。

<span id="在当前仓库验证矩阵"></span>

## 验证与维护

```bash
npm run facts:check
npm run study:check
npm run frameworks:check
npm run model:probe
npm run ecosystem:workshop
```

按[统一环境](/guide/prerequisites)准备锁定依赖。检查失败时停止更新状态，核对对应产物和来源；临时运行资源自行清理，本地报告保留。回退恢复对应代码与锁文件，并保留历史记录。
