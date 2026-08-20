# 发布到 GitHub Pages

仓库已提供 `.github/workflows/deploy.yml`。工作流会检查文档、构建 VitePress，并根据仓库类型自动选择 base path：`<owner>.github.io` 使用 `/`，普通项目仓库使用 `/<repo>/`。

## 首次发布

1. 在 GitHub 新建空仓库，不要在网页端额外生成 README 以免冲突。
2. 为本地仓库添加 remote，检查将要推送的 diff 后推送 `main`。
3. 在 GitHub 仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
4. 手动运行或等待 `Deploy documentation` workflow。
5. 打开 workflow 输出的 Pages URL，检查首页、内部链接、搜索、深色模式与移动端导航。

本项目不会自动创建远程仓库或推送；这些动作会影响外部账号，应由仓库所有者明确执行或授权。

## 发布前检查

```bash
npm ci
npm run check
```

还要检查：

- 产品事实的核对日期是否仍可接受；
- 没有 API key、私人路径、session 日志或未脱敏评测数据；
- `package-lock.json` 已提交；
- GitHub Actions 依赖版本已审阅；
- 仓库 Pages 可见性与组织政策符合预期。

依赖风险和当前缓解措施见[站点依赖安全](/meta/dependency-security)。GitHub Pages 部署的是静态 `dist`，不要把 VitePress 开发服务器当作生产服务器。

## 自定义域名

确定域名后，在 `docs/public/CNAME` 写入域名，并在 DNS 与 Pages 设置中配置。域名、仓库所有者和发布 URL 目前未知，所以基线版本不创建 `CNAME`。
