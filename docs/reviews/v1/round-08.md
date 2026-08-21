# V1 Review Round 08：安全、隐私、许可与供应链

## 结论

本轮基于 `review-v1-round-08-baseline` 修复一个 P1 和一个 P2：公开结果门禁会静默跳过 JSONL 与未知文件，允许原始 prompt/trace 绕过；容器基础镜像仍是可变 tag，Pages/OIDC 写权限又在 workflow 顶层被 build job 继承。这些缺口会让“已脱敏、可复现、最小权限”的发布声明失真。

## 修改前证据

- Baseline：`3bb6c1bf64082cc4f84927ba7419fe70f90359bc`
- Findings commit：`c0987dd`
- Findings：`R08-P1-01`、`R08-P2-02`
- 详细复现：`artifacts/reviews/v1/round-08/findings.md`

## 修正

- `lab/results/public/` 只允许 JSON/JSONL；JSONL 逐行解析，未知格式、符号链接、非普通文件和解析失败默认拒绝。
- 敏感字段先做 Unicode/大小写/分隔符规范化，`raw_prompt`、`rawPrompt` 等变体不再绕过。
- 新增 safe JSONL、JSONL raw-prompt、unsupported artifact canary。
- Python 基础镜像固定为 Round 06 已解析的 `sha256:2c941e…a63c4a`。
- Deploy workflow 顶层只保留 `contents: read`；只有 deploy job 获得 `pages: write` 和 `id-token: write`。
- Workflow 门禁按 workflow/job scope 审计权限，并拒绝 job-level write、顶层 Pages/OIDC、可变镜像与非完整 Action SHA。

## 验证与边界

`results:redact`、`m5:self-test`、`workflows:check`、`m6:self-test` 和完整 `npm run verify` 通过：116 个 Markdown/route、117 个 HTML、34 项 pytest、类型、事实、许可、secret、workflow 和三视口视觉门禁均为绿色。内容结果 commit 为 `95791a7`。

本轮无网络、无真实模型/API、无凭据/费用、无 remote/Pages。由于本地 Docker 缓存没有固定 digest 的 source ref，没有重复容器 build；这不会被写成新的容器运行证据，详见 unresolved 记录。
