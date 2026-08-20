# 站点依赖安全

核对日期：2026-08-20。

## 当前状态

项目使用当前 npm `latest` 的稳定 VitePress `1.6.4`。`npm audit` 报告其传递依赖 `vite@5.4.21` / `esbuild@0.21.5` 涉及 dev-server 信息暴露/路径问题，其中包含 1 个 high、2 个 moderate 依赖级报告；npm 对 VitePress 稳定依赖范围给出 `fixAvailable: false`。

这不表示可以忽略：漏洞影响贡献者本地开发表面。另一方面，GitHub Pages 最终只托管 `docs/.vitepress/dist` 静态文件，不运行 Vite/Node server，因而部署产物没有同一个服务端攻击面。

## 当前缓解

- `docs:dev` 只用于可信本机，保持默认 loopback，不用 `--host 0.0.0.0` 暴露给 LAN/Internet。
- 不把开发/preview server 作为生产服务；无人值守验证优先运行 `npm run docs:build`。
- 开发服务器运行时避免同时访问不可信网页，使用后立即停止。
- 提交并使用 lockfile；依赖升级后重新运行构建、文档检查与 `npm audit`。
- 不使用未经验证的 `overrides` 强行跨 VitePress 支持范围升级 Vite；稳定修复发布后尽快升级并更新本页。

## 发布门禁

`npm audit --omit=dev` 用于确认静态站点没有 production Node 依赖漏洞，但它不能替代完整 `npm audit`：后者用于跟踪构建/开发工具风险。若站点未来增加服务端运行时、在线编辑器或用户输入处理，应重新威胁建模，不能沿用“纯静态站点”结论。

## 维护记录模板

```md
- 日期：
- `npm audit` 摘要：
- 影响表面（dev/build/deploy/runtime）：
- 官方修复是否存在：
- 采取的缓解/升级：
- 构建与回归结果：
- 接受风险的负责人和复查日期（如适用）：
```

