# Pi 最小项目示例

## 前置条件

本例可只做静态验证。真实试用前应在隔离练习仓库安装 Pi，并根据组织策略决定 project trust；不要在含私人数据的仓库首次试验扩展。

## 固定版本

产品语义固定到 Pi 仓库 commit `496185f6e4267b979e3663c45f7eb70b0c6a97b4`，并于 2026-08-27 复核。模型/provider 不固定，真实运行必须另行记录其精确 ID。

## 输入

输入为 `AGENTS.md` 和 `.pi/settings.json`。设置保留自动压缩、显式思考档位，并让 provider SDK 不做隐藏重试，以便由 harness 记录失败。

## 配置

Pi 的项目设置在项目被信任后才加载。示例不安装 extension、不写 provider credential，也不声称 Pi 自带与其他产品等价的 OS sandbox。需要硬隔离时使用容器、受限用户或隔离 worktree。

## 验证

从仓库根目录运行：

```bash
npm run examples:check
```

## 预期输出

输出包含 `Harness examples check passed`，退出码为 0；JSON 能解析，压缩与重试字段符合固定文档。

## 断言

确认项目配置没有 provider、model、token 或 extension；`maxRetries` 为 0；真实运行前记录 trust 决策、session 分支、compaction 点和外部隔离。

## 失败案例

加入 `apiKey`、把 `maxRetries` 提高到无限尝试，或把 `defaultProjectTrust` 错放进项目设置时，门禁应拒绝。目标版本不认识字段时停止并回到固定文档。

## 清理

静态验证不生成 session。真实试用结束后退出 Pi，按目标版本文档检查本地 session 是否含私人内容；不要把 session 或 trust 文件复制进仓库。

## 回滚

用独立提交采用项目设置；撤销时先审阅 diff，再执行 `git revert <配置提交>`。用户级设置和 session 不在此提交内，应按其创建记录单独恢复。

## 已知限制

示例未启动 Pi、未指定 provider、未验证 terminal tool 权限，也没有安装任何 extension 或 package。

## 证据边界

固定源码核对是产品事实来源；静态配置为 E0。仓库迁移 fixture 的 E1 不能升级本例或真实模型效果。
