# 维护与事实刷新

## 每次内容变更

默认运行统一入口 `npm run verify`。它组合文档、root/project base 构建、事实时效、review、Python、TypeScript、六案例、schema、脱敏、许可、secret、workflow 与视觉门禁。跳过命令要记录原因和风险。

## 易变事实

发布时 high volatility 事实须在 30 天内核对。超过 30 天进入待复核队列；超过 90 天的在线页面显示过期提示。每季度刷新事实与外链，滚动仓库尽量固定 tag/commit。

`.github/workflows/facts.yml` 每季度运行 release freshness 与网络外链探针。普通 PR 的 `links:check` 只做离线 URL 结构检查，避免把网络抖动变成不稳定合并门禁。

## 依赖与供应链

锁定 Node/Python 依赖，第三方 GitHub Actions 固定审核过的 commit SHA。安全更新先在干净环境重建、运行全量门禁并检查行为差异，不通过删除测试或放宽权限来消除告警。

许可策略位于 `scripts/python-license-policy.json`；版本变化必须同时更新来源与许可判断。未知、强 copyleft 或自定义许可默认阻断，除非用户明确接受并记录影响。

## Schema 与 artifact

Fixture、schema、公开结果和 review artifact 使用显式版本或 hash；历史版本不可原地覆盖。迁移失败时保留旧读取器和恢复路径。

## 发布后

保存发布 URL、commit/tag、workflow、Pages smoke 与人工视觉证据。Smoke 失败回到 M8 形成新 release candidate，不在 M9 临时改内容。
