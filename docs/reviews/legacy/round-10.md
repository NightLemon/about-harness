# 第 10 轮：构建与一致性

日期：2026-08-20

## 审阅目标

验证 GitHub Pages 项目仓库 base path、静态 artifact、关键页面、10 轮状态和部署依赖边界一致。

## 检查方式

- 以 `DOCS_BASE=/about-harness/` 运行完整检查与 VitePress build。
- 阅读生成的 `index.html`，检查导航、Logo、assets 与 action 的 base 前缀。
- 把 `dist` 放入本机静态服务器的 `/about-harness/` 子目录，探测 6 个页面和 Logo。
- 运行 production 依赖审计与 Git 状态检查。
- 尝试用内置浏览器打开本地页面做视觉检查。

## 发现与修正

| 严重性 | 发现 | 修正 |
| --- | --- | --- |
| P1 | 原 `npm run check` 只保证 Markdown/构建成功，不验证构建后的 href/src 是否真的有 artifact | 新增 `check-built-site.mjs`，校验页面数、title、base、内部资源和关键首页引用，并加入 `npm run check` |
| P2 | VitePress preview 在本地根路径提供 dist，不模拟 GitHub Pages 项目子路径，直接探测 `/about-harness/` 会产生误导性 404 | 使用与 Pages 相同的父目录/子目录静态布局验证；7 个目标全部返回 200 |
| P2 | 发布检查没有区分完整 dev audit 与静态部署 production audit | 运行 `npm audit --omit=dev` 为 0；dev-server 已知风险继续由依赖安全页跟踪 |
| P3 | 第 10 轮加入后页面数变化可能不被发现 | 构建验证要求 Markdown 数与非 404 HTML 数相等 |

## 最终验证

- `DOCS_BASE=/about-harness/ npm run check`：通过。
- `npm run eval:summary`：通过，输出 low/medium 示例摘要。
- Pages 静态探针：首页、学习路径、模型适配、横向比较、端到端案例、迭代记录、Logo 均为 HTTP 200。
- `npm audit --omit=dev`：0 vulnerabilities。
- Git 仓库为新初始化的 `main`，全部项目文件未提交；没有远程仓库或外部发布动作。

## 未决项

- 内置浏览器对 `localhost/127.0.0.1` 返回客户端级拦截，未完成自动截图、移动端菜单和深色模式视觉检查。发布前应由浏览器或人工按[发布说明](/meta/publishing)补验。
- 完整 `npm audit` 的 VitePress dev-server 传递依赖风险仍开放，见[依赖安全](/meta/dependency-security)。
- 尚未配置 GitHub remote/Pages；当前阶段完成的是可发布项目和工作流，不是外部上线。

