# Agent Harness 威胁模型

## 资产

源代码、凭据、用户/客户数据、执行环境、Git 历史、外部账号、费用预算、模型上下文、长期记忆、trace 与发布产物。

## 信任边界

用户指令、仓库内容、网页/文档、模型输出、provider、MCP/tool server、shell/browser、依赖与 CI runner。模型输出和检索内容都不可信；官方来源只提升事实可信度，不自动授权动作。

## 主要威胁

Prompt injection、越权工具、secret exfiltration、路径逃逸、命令注入、重复副作用、供应链替换、poisoned memory/fixture、跨租户检索、trace 泄漏、费用/资源耗尽和不可恢复发布。

## 控制

最小工具/权限、sandbox、域/路径 allowlist、schema、审批、timeout/预算、幂等/checkpoint、来源/许可、secret/redaction、锁依赖、隔离和确定性 validator。控制要放在模型不可绕过的位置。

## 验证

每个威胁至少有预防、检测、停止、恢复和回归测试；未测项明确写 residual risk。
