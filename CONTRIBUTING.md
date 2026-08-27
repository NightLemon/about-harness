# 参与贡献

本项目接受事实纠错、教程复现失败、案例改进和可读性建议。请把一次变更限制在可解释的主题内，并保留失败结果；不要为了让门禁通过而删除不利样本或放宽安全边界。

## 报告问题

请提供页面或文件、目标版本与操作系统、harness surface、精确命令、预期结果、实际结果和最小复现。涉及产品行为时附官方来源与实际核对日期。不要提交 secret、账号标识、私人仓库内容、未脱敏 trace、个人绝对路径或许可不明的 fixture。

## 写作与证据

- 首次出现的英文术语先定义，再使用易懂中文；
- 分开稳定机制、版本敏感产品事实、本项目建议和示例；
- 模型比较必须写明任务、模型、harness、设置、预算和证据边界；
- E0 是设计或待验证主张，E1 是离线 fake/replay，E2 是获授权的真实可用性探针，E3 是重复的目标工作负载实验；
- 教程必须包含前置条件、固定版本、输入、命令、预期输出、断言、失败案例、清理、回滚和已知限制。

易变事实登记在 `docs/references/fact-registry.md`。滚动文档尽量固定 tag 或 commit；无法在线核对时标为 `待核验`/E0，不能填写推测日期。

## 本地检查

```bash
npm ci
npm run check
npm run facts:check
npm run pages:check
npm run verify
```

`content:check` 检查内部开发语言、页面契约、来源与学习链接；`examples:check` 静态验证三套 harness 示例；`repo:self-test` 用负例确认隐私、许可、workflow 与事实时效门禁会真实失败。真实 API、费用或账号不是这些命令的一部分。

## 依赖、构建与 Pages

Node 与 Python 依赖保留锁文件；新增包需核对来源、许可、传递依赖、安装脚本、权限和卸载。开发服务器只绑定可信本机，生产只部署 VitePress 静态产物。Pages 工作流先运行 `npm run pages:check`，构建 job 只有 `contents: read`，仅 deploy job 获得 `pages: write` 与 `id-token: write`。

维护者每季度运行带网络的外链探针并刷新高易变事实。发布前从干净安装执行 `npm run verify`，人工抽查移动端导航、搜索、深色模式、内部链接与公开结果。创建 remote、push、PR、修改 Pages 设置或发布均需单独授权；失败时保留上一个可用版本，不 force push 或移动既有 tag。
