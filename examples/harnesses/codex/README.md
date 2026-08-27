# Codex 最小项目示例

## 前置条件

在不含真实凭据的练习仓库中阅读本例。只有准备真实运行时才需要安装目标 Codex surface；本仓库不会启动 Codex。

## 固定版本

配置语义按 2026-08-27 实际核对的 OpenAI Docs 滚动页面编写。运行者必须另行记录 Codex surface、精确版本、模型 ID、provider、cwd 和 trust 状态。

## 输入

输入是本目录的 `AGENTS.md` 与 `.codex/config.toml`。任务限定为只读检查或一个可由本地测试验证的小改动，不包含账号、remote 或外网。

## 配置

`AGENTS.md` 提供行为指导；`.codex/config.toml` 把 approval、sandbox 和 network 分开。项目配置只有在目标项目被信任且对应 surface 支持时才会生效，不能把指令当作技术隔离。

## 验证

从仓库根目录运行：

```bash
npm run examples:check
```

## 预期输出

输出包含 `Harness examples check passed`，退出码为 0。它只证明文件存在、TOML 关键字段与安全基线通过静态检查。

## 断言

确认 `approval_policy = "on-request"`、`sandbox_mode = "workspace-write"` 且 `network_access = false`；再人工确认目标版本实际加载了项目配置。

## 失败案例

若把 approval 改为 `never`、打开网络或删除回滚说明，静态门禁应失败。若目标 Codex 报未知字段，立即停止，记录版本与 `--help`，不要尝试放宽 sandbox。

## 清理

静态验证只创建临时进程，不修改示例。真实试用应在一次性分支或隔离 worktree 中完成，并在结束后关闭会话与临时凭据句柄。

## 回滚

把采用这些文件的改动放在独立提交中；需要撤销时先审阅 diff，再用 `git revert <配置提交>` 生成可追溯反向提交。不要覆盖未提交的用户改动。

## 已知限制

示例没有指定模型、skills、MCP 或用户级配置，也没有证明不同 Codex surface 的优先级完全相同。

## 证据边界

官方页面核对属于产品事实来源；本例仅通过静态校验，配置可用性与模型质量均为 E0。
