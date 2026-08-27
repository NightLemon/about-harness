# Claude Code 最小项目示例

## 前置条件

本例默认只运行仓库静态验证。真实试用需要在无凭据的练习仓库安装目标 Claude Code，并先阅读该版本的 settings、permissions 与 sandbox 文档。

## 固定版本

设置语义按 2026-08-27 实际核对的 Claude Code 滚动文档编写。真实运行必须记录 CLI 版本、model/provider、surface、cwd、trust 与所有 active settings。

## 输入

输入为 `CLAUDE.md` 和 `.claude/settings.json`。任务只允许读取 `docs`、运行一条静态检查；编辑需要询问，环境文件、网络和 push 被拒绝。

## 配置

`CLAUDE.md` 是上下文指导，不是硬 policy；`permissions` 在工具执行层处理 allow、ask 与 deny。deny 优先级与目标版本语法应在运行前从官方文档核对，不能用更长提示替代。

## 验证

从仓库根目录运行：

```bash
npm run examples:check
```

## 预期输出

输出包含 `Harness examples check passed`，退出码为 0。JSON、权限分组、敏感路径与学习文档结构通过静态检查。

## 断言

确认没有 `apiKey` 或个人路径；`WebFetch` 与 `git push` 被拒绝；真实运行还应触发一次安全的 ask 负例，验证 prompt 出现在工具执行之前。

## 失败案例

删除 deny、把 `Bash(*)` 放入 allow 或在配置中加入 credential 时，门禁应失败。若 CLI 报权限语法过期，停止运行并锁定实际版本，不切换到 bypass 模式。

## 清理

静态验证不创建 Claude Code 会话。真实试用后退出会话，检查未跟踪文件和本地 settings；私人 conversation 与原始 trace 不进入仓库。

## 回滚

在独立提交中采用配置；撤销时先保存需要保留的用户改动，再用 `git revert <配置提交>`。个人 `.claude/settings.local.json` 不属于共享示例，应按本地备份恢复。

## 已知限制

示例没有验证 managed settings、hook、plugin、subagent 或云 surface，也没有调用模型。

## 证据边界

官方文档核对支持字段含义；本例只有 E0 静态证据，不证明 Claude Code 可用性或模型质量。
