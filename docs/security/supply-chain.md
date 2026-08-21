# 扩展与供应链安全

Agent 扩展、MCP server、CLI、browser、container image、Python/npm dependency 和 GitHub Action 都可能执行代码或读取数据。

## 引入清单

来源/maintainer、版本/commit/digest、license、transitive deps、安装脚本、权限、网络域、更新机制、签名/校验、卸载与替代。

## 锁定与更新

Node/Python 使用 lock；容器基础镜像同时保留可读 tag 并固定 `sha256` digest；Actions 固定完整 SHA；滚动仓库引用 commit。`deploy.yml` 的 workflow 顶层只授予 `contents: read`，仅最终 `deploy` job 获得 `pages: write` 与 `id-token: write`，构建 job 不持有发布或 OIDC 权限。自动更新只提出 PR/本地 diff，经过 clean build、测试、许可、secret、权限 scope 和行为审计后晋级。

本地 `npm run workflows:check` 必须拒绝可变容器 tag、非完整 Action SHA、workflow 顶层写权限、CI/facts/build job 的写权限，以及 deploy job 之外的 Pages/OIDC 权限；命令接口以 `package.json` 为准。

## 扩展专项

Skill 可能引导工具；hook/extension/plugin 可直接执行；MCP server 可暴露工具与数据。逐项限制发现、启用、输入、权限和输出，不因来自 marketplace 就信任。

## 失败恢复

保留上一锁文件/镜像与测试结果；用精确 revert 回退，不删除安全证据或强制更新全部依赖。
