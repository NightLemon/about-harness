# 在 Pi 中适配指定模型

Pi 在这里指终端 coding harness。产品事实固定到维护仓库 commit [`496185f`](https://github.com/earendil-works/pi/tree/496185f6e4267b979e3663c45f7eb70b0c6a97b4/packages/coding-agent)，并于 **2026-08-27** 复核。[FACT:pi-readme]

## 控制面心智模型

固定版本向模型提供 read、write、edit、bash 四个核心工具，并支持 session、compaction、context files、skills、prompt templates 与 TypeScript extensions。最小核心意味着 project trust、操作系统隔离、扩展来源和验证仍由使用者设计；“可扩展”不是“默认安全”。

## 前置条件

静态教程只需 Node.js 22+。真实试用要在无私人数据的隔离仓库安装固定版本，确认 provider credential 的存储方法，并决定谁能信任项目级 `.pi` 资源。

## 固定版本

示例路径是 `examples/harnesses/pi/`。除了固定 Pi commit，真实 run 还需记录精确 model/provider、models adapter、操作系统隔离、session branch、context usage、compaction 点和 extension 清单。

## 输入

`AGENTS.md` 描述任务边界，`.pi/settings.json` 固定思考档位、压缩参数与 provider 重试。示例不指定模型、不含 credential，也不安装 extension。

## 配置

```json
{
  "defaultThinkingLevel": "medium",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "provider": { "maxRetries": 0, "maxRetryDelayMs": 60000 }
  }
}
```

固定文档说明项目设置只在项目被信任后加载；`defaultProjectTrust` 是全局设置，不能放进本例的项目文件。隐藏 provider 重试会模糊失败归因，因此基线设为 0。

## 命令

```bash
npm run examples:check
```

这条命令不会启动 Pi。真实试用前先用固定版本的帮助与 settings 文档核对字段，再由用户明确提供 model/provider。

## 预期输出

输出 `Harness examples check passed`，退出码为 0。它证明 JSON 结构和教学安全边界，不证明 Pi 已安装或模型能完成任务。

## 断言

配置不含 model、provider、token 或 extension；project trust 由运行者显式处理；压缩前后验收条件仍存在；session 分享前完成隐私检查；OS sandbox 缺口由容器、受限用户或隔离 worktree 补偿。

## 失败案例

向项目配置加入 `defaultProjectTrust` 或 credential-shaped 字段时静态门禁应拒绝。目标版本不识别字段、session 压缩丢失未决项或 extension 请求额外权限时，停止并回到无扩展基线。

## 清理

静态验证不生成 session。真实试用后退出 Pi，检查 session、trust 和未跟踪文件是否含私人内容；不要把用户级状态复制进项目。

## 回滚

用独立提交采用项目文件，审阅 diff 后执行 `git revert <配置提交>`。用户级配置、session 与 trust 决策按各自备份恢复，不假定项目 revert 会覆盖它们。

## 已知限制与证据边界

本例没有安装 Pi、调用模型、验证 shell 隔离或 extension。固定源码是产品事实来源；静态配置为 E0，离线跨 harness fixture 为 E1，两者都不是模型质量证据。

下一步阅读[扩展与供应链安全](/security/supply-chain)和[迁移案例](/labs/migration)。
