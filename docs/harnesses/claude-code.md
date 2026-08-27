# 在 Claude Code 中适配指定模型

产品事实来自 [Memory](https://code.claude.com/docs/en/memory)、[Settings](https://code.claude.com/docs/en/settings)和[Permissions](https://code.claude.com/docs/en/permissions)。Settings 与 permissions 于 **2026-08-27** 实际核对；模型、套餐和 surface 行为仍须在目标版本确认。

## 控制面心智模型

`CLAUDE.md` 与 auto memory 作为 conversation context 加载，不是不可绕过的 policy。[FACT:claude-memory] 共享 `.claude/settings.json` 可定义项目 settings 和 permission rules；sandbox、permissions、hooks 与 managed settings 承担更硬的控制。[FACT:claude-settings] 指令说明“应该怎样做”，工具门禁决定“能否执行”。

## 前置条件

静态教程需要 Node.js 22+。真实试用要在无凭据的练习仓库安装目标 Claude Code，核对该版本的 permission rule 语法、settings precedence、sandbox 与模型配置。

## 固定版本

示例路径为 `examples/harnesses/claude-code/`，语义按 2026-08-27 滚动文档。真实 run 必须另行记录 CLI、model/provider、surface、cwd、trust、CLI flags 和所有 active settings。

## 输入

`CLAUDE.md` 给出最小工作流；`.claude/settings.json` 只允许读取 `docs` 和运行示例检查，编辑需要询问，环境文件、网络和 push 被拒绝。

## 配置

```json
{
  "permissions": {
    "allow": [
      "Read(./docs/**)",
      "Glob(./docs/**)",
      "Grep(./docs/**)",
      "Bash(npm run examples:check)"
    ],
    "ask": ["Edit(./docs/**)"],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "WebFetch",
      "Bash(git push *)"
    ]
  }
}
```

官方文档说明广泛 deny 会优先于更窄 allow。不要用 `Bash(*)` 省事；把确定性限制放 permission、sandbox 或 hook，把构建命令与目录约定放简洁的 `CLAUDE.md`。

## 命令

```bash
npm run examples:check
```

这条命令只静态检查仓库示例。真实试用前先用目标 CLI 的配置诊断方式确认实际加载来源，不能从单个项目文件推断最终权限。

## 预期输出

输出 `Harness examples check passed`，退出码为 0。真实验证还应安全触发一次 ask 和一次 deny，确认门禁发生在工具执行之前。

## 断言

配置没有 credential 或个人路径；`WebFetch` 和 `git push` 被拒绝；编辑会询问；测试结果与 diff 被保存；memory 中的旧结论不能覆盖当前 validator。

## 失败案例

删除 deny、允许 `Bash(*)` 或加入 credential-shaped key 时门禁应失败。CLI 报语法变化或 permission 行为与文档不符时立即停止，锁定版本，不切换到 bypass 模式。

## 清理

静态检查不创建会话。真实试用后退出 Claude Code，检查未跟踪文件和 `.claude/settings.local.json`；私人 conversation 与原始 trace 不进入公开结果。

## 回滚

共享配置放在独立提交，审阅 diff 后使用 `git revert <配置提交>`。个人 local settings 不在共享提交内，应按本地备份恢复。

## 已知限制与证据边界

示例未验证 managed settings、hook、plugin、subagent 或云 surface，也没有调用模型。官方文档支持产品事实；静态配置为 E0，不能证明 Claude Code 可用性或模型质量。

下一步对照[人在循环中](/foundations/human-control)与[三个 Harness 对照](/harnesses/comparison)。
