# V1 Review Round 11：发布后复核与契约闭环

状态：**完成；findings、独立修正 commits、真实 diff、验证与未决项已由 evidence commit 和 annotated complete tag 绑定。**

## 当前复核结论

本轮从全项目内容、实现、证据和发布状态四个层面重新阅读与抽样。项目已经覆盖 harness 基础机制、学习路线、模型与 provider、三类 harness、四类 framework、六类离线案例、评测、安全、迁移、发布与治理；站点信息架构和 E1 离线验证体系整体完整，前十轮 review 的证据质量明显高于普通文档项目。

修改前的主要质量问题不在“是否有内容”，而在发布后的契约闭环：TypeScript 运行时比 Python/JSON Schema 宽松并可被 `NaN` 绕过预算；历史 migration E1 样例缺少固定 fixture lineage；已发布事实没有独立 publication result；DeepSeek 的待核验状态没有进入事实注册表；review 门禁又无法接纳第十一轮。本轮冻结并关闭 1 个 P1、4 个 P2，详见 `artifacts/reviews/v1/round-11/findings.md`。

## 内容涵盖与质量评价

### 全局内容涵盖

- 稳定机制：agent loop、harness 边界、工具、上下文、状态、权限、观测和评测基础已经形成连续学习路径。
- 产品与生态：OpenAI、DeepSeek、Codex、Claude Code、Pi、LangGraph、OpenAI Agents SDK、Google ADK 与 AutoGen 均有独立页面，并以事实注册表隔离易变主张。
- 实践与实验：coding、browser、research、data、document、migration 六类离线 fixture 具备输入、期望、负例和公开结果；真实 API 默认关闭。
- 治理与交付：事实时效、许可、隐私、依赖、workflow、视觉、release candidate、十轮 review 与 Pages 构建均有机器门禁。

### 内容质量

优势是中文表达一致、证据等级清楚、真实 API 与离线 replay 的边界大体可信，教程普遍包含验证和停止/回滚条件。项目还保留 legacy 与 v1、candidate 与 publication、E1 与 E2/E3 的区别，这些结构值得保留。

不足是部分治理状态停在候选发布前，运行时契约没有真正跨语言同构，历史样例虽保留 hash 却缺少可重放的不可变引用。另有 47/87 个非 review 页面少于 800 个非空白字符、21 页少于 500，说明部分页面仍偏索引式；六个 labs 的 E1 语义验证也偏浅，自动 a11y 门禁尚未建立。这三类作为 P3 backlog，不在本轮为凑篇幅扩写。

## 复核方法与证据边界

复核先读取 AGENTS.md、执行计划、站点目录、所有 v1 review、目标脚本、schemas、fixtures、facts 与 release artifacts，再用基线 hash、Git tag/ancestor、Node runtime probe、现有 npm 门禁和 Pages 只读 HTTP probe 交叉验证。冻结基线为 `06a44ef`，annotated tag 为 `review-v1-round-11-baseline`；前一轮 evidence `5054f44` 是该基线祖先。

当前证据最高仍为 E1。本轮没有调用真实模型/API、使用凭据、产生费用，也没有 fetch、push、PR、Pages 配置或发布写操作。HTTP 200 只证明 2026-08-22 当次 URL 可达，最终 publication result 还必须绑定已知 source SHA 和 workflow runs。

## 修正结果

1. `R11-P1-01`（`43f64e9`）：收紧 TypeScript/Python Task 契约，新增 `validateAction` 与 `lab:ts-runtime-test`；坏 action 在进入计数、trace 和 cost 之前返回 `failed/invalid_action`。
2. `R11-P2-02`（`8afc02e`）：保留 migration 的历史 `482c…`，新增固定 M5 commit/path reference；`eval:validate` 从 Git 还原 bundle 并核对 task/ref/run。
3. `R11-P2-03`（`afd24cb`）：新增 publication result schema、artifact、checker 和负例，绑定 `e13bd93`、Pages、CI/Deploy 与 HTTP 200；RC3 原文件和 tag 不变。
4. `R11-P2-04`（`5477fdb`）：登记 DeepSeek API surface 为 E0/pending，产品页出现未锚定 `pending/待核验` 时 fail closed；事实计数为 17 verified、1 pending。
5. `R11-P2-05`（`7a04006`、`e56c761`）：`reviews:check` 支持连续 Round 11+ 与 post-release ancestor；`release:check` 从 RC3 tag 读取历史 artifacts，不再把后续合法 commit 误判为 RC 被改写。

Content result 为 `e56c7614e1060b144c51131c39a8b00281311fd6`。机器证据位于 `artifacts/reviews/v1/round-11/`；有效完成标签为 annotated tag `review-v1-round-11-complete`。

## 验证与结论

全量验收覆盖 `npm run check`、`facts:check`、`reviews:check`、`release:check`、`verify`，并包含 TypeScript runtime、fixture lineage、publication、事实 pending、Round 11 连续性和历史 RC 的 fail-closed canaries。最终 `facts:check` 为 18 条（17 verified、1 pending），`reviews:check` 为 11 个连续 v1 rounds。

五个 P1/P2 已关闭，开放项仅为 3 个非阻塞 P3：短页面的按需深化、E1 labs 语义增强和自动 a11y。完整命令、exit code、环境、artifact hash 与边界见 `verification.json` 和 `unresolved.md`。
