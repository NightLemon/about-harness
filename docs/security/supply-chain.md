# 扩展与供应链安全

Agent 扩展、MCP server、CLI、browser、container image、Python/npm dependency 和 GitHub Action 都可能执行代码或读取数据。安装一个“方便的工具”实际是在扩大信任边界。

## 引入清单

接入前记录来源与 maintainer、版本/commit/digest、license、传递依赖、安装脚本、权限、网络域、更新机制、签名或校验、卸载与替代。Marketplace 热度不是可信证明；滚动分支不是可复现版本。

## 锁定与更新

Node/Python 使用 lock；容器基础镜像保留可读 tag 并固定 `sha256` digest；Actions 固定完整 SHA。自动更新只提出 diff，经过干净构建、测试、许可、secret、权限范围和行为差异检查后再采用。

```bash
npm run licenses:check
npm run workflows:check
npm run verify
```

`workflows:check` 拒绝可变镜像、非完整 Action SHA、顶层写权限，以及 deploy job 之外的 Pages/OIDC 权限。未知或自定义许可默认阻断，直到人工确认再分发义务。

## 站点构建链

VitePress 是开发与构建依赖，GitHub Pages 只托管生成的静态文件，不运行 Node server。这缩小了线上攻击面，却没有消除贡献者本机的安装脚本、开发服务器和构建插件风险。

- 开发服务器只绑定 loopback，不用 `--host 0.0.0.0` 暴露；
- 不把 dev/preview server 当生产服务；
- 保留 lockfile，升级后重新构建并运行完整验证；
- `npm audit --omit=dev` 只覆盖 production 依赖，完整且具有新鲜 advisory 数据的 audit 才能评估开发工具；
- 离线 audit 的“0 条”不能消除因缓存过期产生的不确定性。

若站点增加服务端运行时、用户输入或在线编辑器，必须重新威胁建模，不能沿用纯静态站点结论。

## 扩展专项

Skill 会引导模型使用工具；hook、extension、plugin 可直接执行；MCP server 可暴露工具与数据。逐项限制发现、启用、输入、权限、输出和 timeout。外部内容始终是不可信数据，不因来自工具而成为高优先级指令。

## 失败与恢复

保留上一锁文件、镜像 digest 与测试结果。升级造成行为、许可或权限异常时，用精确 revert 恢复相关文件，不强制更新所有依赖。禁用扩展后核心 loop、checkpoint 和结果读取仍应工作；否则需保留版本化 adapter 或迁移器。

下一步：[Prompt Injection](/security/prompt-injection)说明不可信内容如何借工具扩大影响，[事件响应](/security/incident-response)说明发现异常后的顺序。

## 工作例与检查题

引入一个 MCP server 前，先在禁网、只读环境枚举其工具 schema 与启动脚本，再比较实际请求的路径和域名是否超出声明。任何不一致都停止采用并恢复锁文件。你能否指出谁维护、运行时读什么、如何卸载，以及更新失败时回到哪个 digest？
