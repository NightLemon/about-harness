# 在 Claude Code 中适配指定模型

核对日期：2026-08-20；本机 `claude --version` 为 `2.1.96 (Claude Code)`。官方来源：[Memory](https://code.claude.com/docs/en/memory)、[Settings](https://code.claude.com/docs/en/settings)、[How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)。版本事实只适用于本次本机探针。

## 指令与记忆

官方文档区分 CLAUDE.md 与 auto memory，并明确两者作为 conversation context 加载，不是强制配置；要无论模型决定如何都阻断动作，应使用 PreToolUse hook。[FACT:claude-memory]

因此把构建命令、目录约定和验收写为简洁 CLAUDE.md/rules；把危险路径、命令与外发数据限制放 permissions、sandbox 或 hook。

## Settings 与作用域

Claude Code 提供多个配置 scope、permission rules、sandbox、hooks、subagent/plugin 设置与 precedence。[FACT:claude-settings] 实验需保存 active settings、项目 trust、surface、模型 alias 与 CLI flags，不能只提交单个 settings 文件。

## 优化流程

1. 锁定 Claude Code 与 model/provider 版本；
2. 用默认设置跑固定任务并保存 trace/测试；
3. 先提高任务契约和上下文入口，再调模型预算；
4. 用 subagent 隔离调研或并行边界任务，父级保留验收；
5. 用 hook 执行确定性检查，避免把机械规则重复塞入 prompt；
6. 分别评测交互、非交互与 CI surface；
7. 为 compaction、permission deny、timeout 和 context drift 设计恢复。

## 常见失败

CLAUDE.md 过长、把 memory 当事实库、hook 无 timeout、插件扩大权限、探索和实施混在一个无 checkpoint 的长 run。先缩小状态和工具，再考虑更强模型。

## 当前证据

文档与本机版本探针为产品事实证据；没有真实模型调用，性能结论仍是 E0。
