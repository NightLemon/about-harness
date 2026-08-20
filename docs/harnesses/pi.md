# 在 Pi 中优化模型

Pi 把自己定义为 minimal terminal coding harness：核心保持小，把工作流交给 extensions、skills、prompt templates、themes 和 packages。产品事实核对于 2026-08-20。

> **事实基线与本文建议：** 默认工具、CLI、目录、project trust 与设计哲学来自 Pi 官方维护仓库的 README；调优顺序、安全基线和模型适配判断是本项目建议。Pi 主分支变化快，文末同时给出固定 commit。

## 先理解默认表面

[Pi README](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)说明默认向模型提供 `read`、`write`、`edit` 和 `bash` 四个工具；CLI 还列出 `grep`、`find`、`ls` 等可选内建工具。它支持 interactive、print/JSON、RPC 和 SDK 四类使用方式，可从多个 provider 选择 tool-capable 模型。

Pi 核心刻意不内建 MCP、subagents、plan mode、权限弹窗、background bash 与 todo。需要时通过 extension、独立 Pi/tmux、container 或第三方 package 组装。这不是缺陷清单，而是它的设计边界。

## 选择模型

交互中使用 `/login` 配置 provider、`/model` 选择模型，`/settings` 调整 thinking 等常用项。自动化时使用明确 CLI 参数并保存版本：

```bash
pi --provider <provider> --model <model-id> --thinking medium
```

可用 thinking 档位和模型能力取决于 provider/模型；Pi 的 CLI 接受从 `off` 到 `max` 的多档值，但 provider 不一定实现每一档。用一次小工具调用和一次多步任务验证适配，不要只看模型能否出字。

## 上下文与项目设置

Pi 会从全局、父目录和当前目录加载 `AGENTS.md` 或 `CLAUDE.md`；同一目录存在 `AGENTS.override.md` 时优先使用。项目设置位于 `.pi/settings.json`，全局设置位于 `~/.pi/agent/settings.json`。

Pi 还允许：

- `.pi/SYSTEM.md` 替换默认 system prompt；
- `APPEND_SYSTEM.md` 追加 system 内容；
- `.pi/prompts/` 存放命令模板；
- `.pi/skills/` 或 `.agents/skills/` 存放 skills；
- `.pi/extensions/` 存放 TypeScript extensions。

替换 system prompt 是高影响动作，可能移除默认工具、安全或交互说明。优先从短 `AGENTS.md` 和 skill 开始；只有能通过回归任务证明收益时才替换。

## 最小模型适配流程

1. 用 `--tools read,grep,find,ls` 运行只读代码库调查，确认模型会搜索与引用。
2. 加入 `edit` 与目标测试命令，测一个小修复。
3. 比较 `low`、`medium` 两个 thinking 档，每档至少 3 次。
4. 查看 footer/JSON 里的 token、cache、cost、context 与工具事件。
5. 若失败集中在工作流，再写 skill 或 extension；不要先安装大型 package 集合。

## 长会话与压缩

Pi 在接近上下文上限或溢出时自动 compact，也可使用 `/compact <instructions>`。压缩有损，但完整历史保留在 JSONL，可用 `/tree` 回到早期分支。长任务应让压缩保留目标、修改文件、验证结果和被否定方案；复杂需求可由 extension 自定义压缩。

## Extensions 是力量也是责任

Extension 可以注册工具/命令、改变 UI、实现 subagents、权限门、sandbox、MCP、自动提交或自定义 compaction。它以代码执行，第三方 package 可能拥有完整系统访问。

安全基线：

- 审查源码并固定 tag/commit；
- 项目资源只在信任项目后加载；
- 在 container/sandbox 中运行不可信仓库；
- 为不同任务用 `--tools`/`--exclude-tools` 限制工具；
- extension 出错要可禁用，避免核心会话无法恢复；
- 不把 package 的流行度当作安全审计。

Pi 的非交互模式不会弹出项目信任确认；应使用已有信任决定、全局 `defaultProjectTrust` 或本次 `--approve/--no-approve` 明确处理，不能假设无人值守时会等人批准。

## 哪些模型更适合 Pi

Pi 的极简工具表面对能稳定工具调用、会主动读错误并能在较少系统引导下工作的模型很友好。较弱或非 coding 专用模型可能需要：更窄工具列表、更短任务、明确文件入口、结构化完成条件和一个示范调用。对于缺少工具调用协议的模型，应先解决 provider/adapter 兼容性，而不是用 system prompt 模拟可靠执行。

参见：[Pi coding agent README（核对时的固定 commit）](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)、[当前主分支](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)。
