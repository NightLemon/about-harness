# 站点依赖安全

核对日期：2026-08-20。

## 当前状态与证据边界

锁文件固定 VitePress `1.6.4`，其构建链包含 Vite `5.4.21` 与 esbuild `0.21.5`。M1 baseline 曾记录完整 audit 的 1 个 high、2 个 moderate 开发依赖告警；M6 在无网络模式下运行 `npm audit --offline` 得到 0 条，但离线缓存不能证明 advisory 数据仍新鲜，因此不能用它消除历史风险。当前结论是：production Node 依赖为零/纯静态部署，开发服务器风险仍按“待新鲜 advisory 核对”管理。

这不表示可以忽略构建链风险：它影响贡献者本地开发表面。GitHub Pages 最终只托管 `docs/.vitepress/dist` 静态文件，不运行 Vite/Node server，因而部署产物没有同一个服务端攻击面。真实在线 advisory 获取属于外部检查，本轮未执行。

## 当前缓解

- `docs:dev` 只用于可信本机，保持默认 loopback，不用 `--host 0.0.0.0` 暴露给 LAN/Internet。
- 不把开发/preview server 作为生产服务；无人值守验证优先运行 `npm run docs:build`。
- 开发服务器运行时避免同时访问不可信网页，使用后立即停止。
- 提交并使用 lockfile；依赖升级后重新运行构建、文档检查与 `npm audit`。
- `npm run licenses:check` 对 Node lockfile 与 Python 固定许可清单实施宽松许可门禁；新增或升级包必须显式复核。
- `npm run workflows:check` 要求第三方 Actions 固定完整 SHA，并拒绝 `pull_request_target` 与 `write-all`。
- 不使用未经验证的 `overrides` 强行跨 VitePress 支持范围升级 Vite；稳定修复发布后尽快升级并更新本页。

## 发布门禁

`npm audit --omit=dev` 用于检查 production Node 依赖，但它不能替代完整、具有新鲜 advisory 数据的 `npm audit`：后者用于跟踪构建/开发工具风险。离线 audit 结果必须标明缓存限制。若站点未来增加服务端运行时、在线编辑器或用户输入处理，应重新威胁建模，不能沿用“纯静态站点”结论。

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
