# 发布到 GitHub Pages

仓库提供 `.github/workflows/deploy.yml`。工作流只运行公开学习站点门禁、构建 VitePress，并以普通项目仓库的 `/about-harness/` 作为 base path。十轮 review 的历史与 tags 由独立 CI 校验，不进入 Pages artifact，也不作为静态发布依赖。

## 首次发布

1. 在 GitHub 新建空仓库，不要在网页端额外生成 README 以免冲突。
2. 为本地仓库添加 remote，检查将要推送的 diff 后推送 `main`。
3. 在 GitHub 仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
4. 手动运行或等待 `Deploy documentation` workflow。
5. 打开 workflow 输出的 Pages URL，检查首页、内部链接、搜索、深色模式与移动端导航。

创建远程仓库、push、PR、Pages 与发布都会影响外部账号，必须获得单独 A4 授权。

## 发布前检查

```bash
npm ci
npx playwright install chromium
npm run pages:check
```

仓库维护者可另外运行 `npm run verify` 校验实现、实验与 review 治理证据；该完整历史门禁不改变公开静态 artifact。

还要检查：

- 产品事实的核对日期是否仍可接受；
- 没有 API key、私人路径、session 日志或未脱敏评测数据；
- `package-lock.json` 已提交；
- GitHub Actions 依赖版本已审阅；
- Actions 的 `uses:` 固定为完整 commit SHA；
- 仓库 Pages 可见性与组织政策符合预期。

依赖风险和当前缓解措施见[站点依赖安全](/meta/dependency-security)。GitHub Pages 部署的是静态 `dist`，不要把 VitePress 开发或 preview server 当作生产服务器。

## Base 与本地上线烟测

项目仓库形态必须先验证 `/about-harness/`：

```bash
npm run docs:project-base
npm run docs:visual
npm run pages:serve -- --port 4175
npm run pages:smoke -- http://127.0.0.1:4175/about-harness/
```

`pages:serve` 只用于本地验证，会按 GitHub Pages 的项目路径和 clean URL 规则读取已构建 artifact；完成 smoke 后用 `Ctrl+C` 停止。

M9 发布后再对真实 URL 运行：

```bash
npm run pages:smoke -- https://<owner>.github.io/about-harness/
```

Smoke 检查首页、学习路径、最小 harness、模型适配、三个 coding harness、六案例、发布说明和同源静态资源。任一路由或资源失败都不能宣告发布成功。

## 静态 Pages 的响应头边界

仓库内的 VitePress 配置不能替 GitHub Pages 设置所有 HTTP 响应头，尤其是 `Content-Security-Policy` 的 `frame-ancestors`、`X-Content-Type-Options`、`Referrer-Policy` 和 `Permissions-Policy`。首版没有用户输入、认证、analytics、运行时第三方脚本或 `v-html`；这降低攻击面，但不等于这些响应头已经存在。M9 必须在真实部署上记录响应头实测。

不使用包含 `unsafe-inline`/`unsafe-eval` 的宽松 meta CSP 来制造“已加 CSP”的假象。若未来加入富文本、插件或用户内容，先重新威胁建模，再在支持自定义响应头的托管层部署严格 CSP。

## 失败与回滚

- 构建或 smoke 失败：保留上一成功部署，不在 M9 临时改内容，返回 M8 形成新 RC。
- 发布 SHA 不一致：停止，不 force push，不移动 tag。
- 页面资源 base 错误：修复后重新运行 root 与 project-base 全量门禁。

## 自定义域名

确定域名后，在 `docs/public/CNAME` 写入域名，并在 DNS 与 Pages 设置中配置。域名、仓库所有者和发布 URL 目前未知，所以基线版本不创建 `CNAME`。
