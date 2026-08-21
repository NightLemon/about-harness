# 在 Codex 中适配指定模型

核对日期：2026-08-21。官方来源：[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Customization](https://learn.chatgpt.com/docs/customization/overview)、[Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)、[Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)。本页不保证账号可用模型、价格或默认值。

## 先画控制面

Codex 的可调层包括 task prompt、目录分层 AGENTS.md、memory、skills、MCP、subagents、user/project/profile/system config、CLI override、permissions/sandbox 与运行 surface。它们职责不同：规则约束行为，工具扩展能力，policy 限制副作用，测试证明结果。

## 指令发现

官方文档说明 Codex 每次 run 构造一次指令链：先读取 Codex home 的 `AGENTS.override.md` 或 `AGENTS.md`；再从项目 root 走到 cwd，每目录最多取 override/AGENTS/fallback 中一个；靠近 cwd 的内容在合并后更晚，因而覆盖更早指导。默认合并上限为 32 KiB。[FACT:codex-agents-md]

把团队规则放 repo root，把子系统差异放最近目录；不要把 API reference 或长背景全部塞进 AGENTS.md，改用路径路由和按需 skill。

## 配置优先级

官方配置从高到低为 CLI/`--config`、可信项目的 `.codex/config.toml`（root 到 cwd）、profile、用户 `~/.codex/config.toml`、system、内置默认。未信任项目跳过 project-scoped config/hooks/rules。[FACT:codex-config]

因此实验报告必须保存 surface、cwd、trust、CLI override、profile 和 config 摘要；只写“用了 Codex”不可复现。

## Sandbox、Approval 与 Network

OpenAI Docs 将三者分为不同控制层：[FACT:codex-sandbox-approval]

- **Sandbox mode** 决定命令技术上能读写哪些位置；
- **Approval policy** 决定何时必须停下询问，不会自动创建 OS 隔离；
- **Network** 是否启用及允许哪些目标另行配置，不能从 workspace write 或“已批准”推断。

实验必须分别记录这三项的有效配置和实际 surface。迁移自其他 harness 时，若目标只有询问机制而没有等价 sandbox，应写 gap 并用容器、受限账户或隔离 worktree 补偿，不能把名称相近当安全等价。

## 指定模型优化流程

1. 解析精确模型/provider/alias 与 surface；
2. 用开箱默认运行固定 coding fixture；
3. 写四段任务契约：目标、上下文入口、边界、验收；
4. 把高信号项目规则放 AGENTS.md，确定性规则放测试/policy；
5. 从最小工具和权限开始，按失败增加 skill/MCP；
6. 调节 reasoning budget、context 与委派，每次只改一个主变量；
7. 报告任务级成功、测试、人工介入、延迟、token/费用和安全事件；
8. 为 timeout、拒权、上下文污染和模型退化设置回退。

## 常见失败

- 在错误 cwd 启动导致加载不同指令；
- 用 prompt 代替 sandbox/approval；
- 让 MCP 返回的大量内容淹没任务上下文；
- 更换模型时同时改任务、工具和预算，无法归因；
- 把 Codex UI 中的模型名当作稳定 API model ID。

## 当前证据

产品事实来自上述 OpenAI Docs；M3 只有 fake/replay E1。未运行真实 Codex 模型，因此不声称任何模型配置已优于基线。
