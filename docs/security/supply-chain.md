# 扩展与供应链安全

Agent 扩展、MCP server、CLI、browser、container image、Python/npm dependency 和 GitHub Action 都可能执行代码或读取数据。

## 引入清单

来源/maintainer、版本/commit/digest、license、transitive deps、安装脚本、权限、网络域、更新机制、签名/校验、卸载与替代。

## 锁定与更新

Node/Python 使用 lock；容器使用 digest；Actions 固定完整 SHA；滚动仓库引用 commit。自动更新只提出 PR/本地 diff，经过 clean build、测试、许可、secret 和行为审计后晋级。

## 扩展专项

Skill 可能引导工具；hook/extension/plugin 可直接执行；MCP server 可暴露工具与数据。逐项限制发现、启用、输入、权限和输出，不因来自 marketplace 就信任。

## 失败恢复

保留上一锁文件/镜像与测试结果；用精确 revert 回退，不删除安全证据或强制更新全部依赖。
