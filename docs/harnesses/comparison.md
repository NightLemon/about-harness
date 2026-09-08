# Codex、Pi 与 Claude Code：配置与使用路径

三者都是编码工作产品。比较时同时记录产品版本、模型、工具、指令和权限；同一句提示无法固定这些条件。

<span id="比较目标与证据边界"></span>
<span id="先冻结比较单元"></span>
<span id="责任矩阵"></span>
<span id="五组最容易混淆的概念"></span>
<span id="指令不等于-policy"></span>
<span id="approval-不等于-sandbox"></span>
<span id="network-enabled-不等于允许所有出口"></span>
<span id="memory-不等于-durable-state"></span>
<span id="tool-success-不等于-task-success"></span>
<span id="三条证据轴分开记录"></span>
<span id="选择流程-先约束-再体验"></span>
<span id="选择流程先约束再体验"></span>
<span id="_1-写-task-而不是写偏好"></span>
<span id="1-写-task而不是写偏好"></span>
<span id="_2-用硬约束淘汰组合"></span>
<span id="2-用硬约束淘汰组合"></span>
<span id="_3-建立每个候选的合理基线"></span>
<span id="3-建立每个候选的合理基线"></span>
<span id="_4-一次改变一个主要变量"></span>
<span id="4-一次改变一个主要变量"></span>
<span id="_5-报告任务结果和代价"></span>
<span id="5-报告任务结果和代价"></span>
<span id="_6-保存不采用原因与回滚"></span>
<span id="6-保存不采用原因与回滚"></span>
<span id="三个迁移场景"></span>
<span id="项目指令迁移"></span>
<span id="权限迁移"></span>
<span id="状态迁移"></span>
<span id="迁移报告模板"></span>
<span id="运行离线迁移案例"></span>
<span id="比较常见的失真"></span>
<span id="停止、回退与已知限制"></span>
<span id="停止回退与已知限制"></span>
<span id="检查题与下一步"></span>

<span id="codex、pi-与-claude-code-职责对照"></span>

## 本轮固定入口

| 产品 | 包版本 | 指令与控制 | 教程 |
| --- | --- | --- | --- |
| Codex | @openai/codex 0.153.4 | AGENTS.md、项目配置、sandbox 与 approval | [Codex](/harnesses/codex) |
| Pi | @earendil-works/pi-coding-agent 0.84.2 | 项目资源、工具集合与外部隔离 | [Pi](/harnesses/pi) |
| Claude Code | @anthropic-ai/claude-code 2.1.263 | CLAUDE.md、工具集合与 permission rules | [Claude Code](/harnesses/claude-code) |

2026-09-08 已检查包身份并运行三者 --help；这只确认命令入口与选项，未启动真实模型任务。[FACT:codex-cli-entry] [FACT:pi-cli-entry] [FACT:claude-cli-entry]

## 怎样选择

先写任务需要的工具、文件范围、网络、人工关口、恢复和验收。再按目标平台验证这些控制实际生效；不能把“会询问”当成文件隔离，也不能把会话恢复当成外部副作用对账。

第一次试用从合成仓库只读开始，再做可回退本地修改。比较模型时固定产品及配置；比较产品时保留并解释工具和默认体验的差异。

## 迁移和评测

[迁移实验](/labs/migration)提供六类职责表与失败例；[模型适配](/models/adaptation)决定资格与效用；[评测实践](/practice/evaluation)连接运行记录和报告。当前没有三产品模型质量排名。
