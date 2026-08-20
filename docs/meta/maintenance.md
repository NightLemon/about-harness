# 维护与事实刷新

## 每次内容变更

运行文档、事实和 review 检查；修改实现或案例后还需运行对应 Python、TypeScript、schema、离线实验和脱敏门禁。跳过命令要记录原因和风险。

## 易变事实

发布时 high volatility 事实须在 30 天内核对。超过 30 天进入待复核队列；超过 90 天的在线页面显示过期提示。每季度刷新事实与外链，滚动仓库尽量固定 tag/commit。

## 依赖与供应链

锁定 Node/Python 依赖，第三方 GitHub Actions 固定审核过的 commit SHA。安全更新先在干净环境重建、运行全量门禁并检查行为差异，不通过删除测试或放宽权限来消除告警。

## Schema 与 artifact

Fixture、schema、公开结果和 review artifact 使用显式版本或 hash；历史版本不可原地覆盖。迁移失败时保留旧读取器和恢复路径。

## 发布后

保存发布 URL、commit/tag、workflow、Pages smoke 与人工视觉证据。Smoke 失败回到 M8 形成新 release candidate，不在 M9 临时改内容。
