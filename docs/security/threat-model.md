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

## 一个可执行表格

对“读取仓库并生成补丁”列出资产为源码与凭据，入口为任务文本、仓库文件、依赖和工具输出，攻击者能力包括提交恶意注释与诱导命令。预防控制是最小读写根、禁网、schema 和批准；检测是 policy/trace/secret scan；停止是取消 run；恢复是回到 checkpoint 并轮换受影响凭据。每项都绑定负责人和测试。

## 失败诊断

若威胁只写“模型可能犯错”，就无法选择控制。先问攻击者控制什么输入、想获得什么资产、跨越哪条信任边界；再确认控制是否位于模型不可绕过的位置。没有回归用例的缓解仍是未验证建议，残余风险必须显式保留。

## 检查题与下一步

Approval 与 sandbox 分别阻止什么？合法工具为何仍可能组成数据外发路径？用[Prompt Injection](/security/prompt-injection)验证不可信输入，再到[Secret 与隐私](/security/secrets-privacy)建立数据清单。
