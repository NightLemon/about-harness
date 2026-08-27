# 在 Codex 中适配指定模型

本页把 Codex 视为 coding harness，而不是某个模型的同义词。产品事实来自 [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)与[Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)，实际核对日期为 **2026-08-27**；账号可用模型、价格与默认值仍以目标 surface 为准。

## 控制面心智模型

Task prompt 描述本次目标；目录级 `AGENTS.md` 提供项目规则；`.codex/config.toml` 和更高层配置决定模型、profile 与运行策略；sandbox 限制技术可达范围；approval 决定何时询问；network 单独控制出口。规则、能力、policy 和验证不能相互替代。[FACT:codex-agents-md] [FACT:codex-config] [FACT:codex-sandbox-approval]

## 前置条件

先准备无凭据的练习仓库和确定性验收命令。仅做本仓库静态教程时需要 Node.js 22+；真实试用需另行确认 Codex surface、版本、账号、费用和数据范围。

## 固定版本

示例绑定上述 2026-08-27 滚动文档与仓库路径 `examples/harnesses/codex/`。运行记录还必须固定精确模型/provider、cwd、trust、CLI override、profile、sandbox、approval 和 network；只写“使用 Codex”不可复现。

## 输入

复制示例中的 `AGENTS.md` 与 `.codex/config.toml` 到一次性练习分支。任务只允许一个小改动，输入不得含 secret、私人 trace 或 remote 操作。

## 配置

最小配置如下；项目指令负责工作流，配置负责执行边界：

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

官方文档说明指令链从用户级到项目 root、再到 cwd 逐层组合，靠近 cwd 的指导更晚出现。把团队规则放 root，把子目录差异放最近目录；长参考资料只给路径，不塞满 `AGENTS.md`。

## 命令

先执行不调用模型的静态检查：

```bash
npm run examples:check
```

获准真实试用后，才按目标版本核对等价 CLI 选项，例如官方页面展示的 `--sandbox workspace-write --ask-for-approval on-request`；不要在本教程验证中启动它。

## 预期输出

静态命令输出 `Harness examples check passed` 且退出码为 0。真实 run 则应记录有效配置、改动 diff 和验收输出；静态成功不能代替这一步。

## 断言

网络关闭；写入仅限练习工作区；危险动作会在工具执行前停下；测试失败不会被自然语言总结掩盖；换模型时任务、工具与预算保持不变。

## 失败案例

把 approval 设为 `never` 或打开 network，`examples:check` 应失败。若目标 Codex 报未知字段、加载了意外 `AGENTS.md` 或 cwd 不符，立即停止，保存版本与加载路径，不扩大权限“试试看”。

## 清理

静态检查只使用临时进程。真实试用结束后关闭任务与临时 credential handle，检查未跟踪文件、网络记录和 worktree；私人会话与原始 trace 不公开。

## 回滚

把配置适配放在独立提交；审阅 diff 后用 `git revert <配置提交>` 生成可追溯回滚。不要覆盖工作树中其他人的未提交改动。

## 已知限制与证据边界

示例不包含 skills、MCP、subagents 或用户级配置，也未运行真实模型。官方页面支持产品事实；静态示例为 E0，迁移 fixture 的 E1 只证明职责映射，不证明 Codex 或任何模型配置优于基线。

下一步用[模型—Harness 匹配](/optimization/model-fit)定义任务，再看[三个 Harness 对照](/harnesses/comparison)。
