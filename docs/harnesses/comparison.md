# Codex、Pi 与 Claude Code：职责对照

比较目标是迁移责任，不是选“绝对最好”。产品事实的来源、版本与核对日期见各专题和[兼容矩阵](/references/compatibility)；三套配置样例都只有 E0 静态证据。

## 责任矩阵

| 责任 | Codex | Pi | Claude Code | 迁移时保留 |
| --- | --- | --- | --- | --- |
| 项目指导 | 分层 AGENTS.md | context files / AGENTS | CLAUDE.md / rules | 意图、作用域、优先级 |
| 重用流程 | skills / plugins | skills / templates / packages | skills / plugins | 触发、输入、版本、卸载 |
| 程序化扩展 | MCP / tools / plugins | TypeScript extensions | tools / hooks / plugins | schema、权限、timeout |
| 技术隔离 | sandbox / permission profile | 运行环境或容器补偿 | sandbox，按版本核验 | 模型技术上不可触达的边界 |
| 询问授权 | approval policy | project trust 与自建 policy | permission rules / hooks | 何时询问、谁批准 |
| 网络 | 独立开关与策略 | 运行环境 / extension | settings / sandbox | 默认拒绝、allowlist、实际出口 |
| 状态恢复 | 因 surface 而异 | session / tree / fork / import | conversation / context，按版本核验 | checkpoint、幂等、未决项 |
| 委派 | subagents | 由扩展或流程实现 | subagents | 子任务契约、父级验收 |

## 不可逐字复制

同名 skill、plugin、memory 与 permission 的发现顺序和执行权限不同；同一模型名也可能解析到不同 provider。尤其不能把 approval（何时询问）当作 sandbox（技术上能否触达），或把 network 开启当成已有出口 allowlist。迁移应写“源语义 → 目标语义 → 缺口 → 补偿控制 → 证据轴”。

## 选择流程

1. 用同一真实任务集描述读写范围、工具、副作用、延迟与成本；
2. 排除不能满足硬安全或协议要求的组合；
3. 在每个候选中先建立默认基线；
4. 一次只调整指令、工具、上下文、权限或预算中的一个主要变量；
5. 用任务级断言、安全事件、人工介入与不确定性选择；
6. 保存不采用候选的失败原因和回滚点。

## 一个迁移例子

源环境用项目指令、只写工作区 sandbox、危险动作询问与禁网。迁到 Pi 时，项目指令可映射，session 可记录状态，但固定版本没有被本项目证明存在等价 OS sandbox；因此用无网络容器或受限用户补偿。迁到 Claude Code 时分别核对 settings、permission rule 和 sandbox，不能只复制自然语言规则。

## 失败诊断

若结果变差，先确认模型/provider、cwd、指令加载、工具 schema、权限和预算是否真的等价，再看模型输出。若只有一个 surface 能提供某项能力，报告结构差异，不伪造“公平排名”。

## 检查与下一步

你应能为矩阵每一行指出 source fact、静态示例、离线职责接缝或 live evidence。做不到的项写 `untested`。随后运行[跨 Harness 迁移案例](/labs/migration)，再按[模型适配卡](/practice/model-playbook)记录自己的选择。
