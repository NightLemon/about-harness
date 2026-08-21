# Round 08 修改前 Findings

- Round：08
- Baseline：`3bb6c1b`
- Baseline tag：`review-v1-round-08-baseline`
- Rubric：安全、隐私、许可和供应链
- 记录时间：2026-08-21 12:19 +08:00
- 状态：已在任何 round-08 修正前冻结

## R08-P1-01：公开结果门禁静默忽略 JSONL 与未知文件，可绕过敏感字段阻断

- 严重性：P1
- 位置：`scripts/redact-results.mjs`、`scripts/test-m5-checks.mjs`、`docs/meta/privacy.md`
- 复现：在 public results 目录写入 `leak.jsonl`，内容为 `{"raw_prompt":"private source"}`；脚本只 `filter(file.endsWith('.json'))`，报告 0 JSON 通过。放入 `.txt`/`.log` 也被静默忽略。即使 `secrets:check` 没匹配高置信 token/path，原始 prompt、authorization 或个人数据仍可进入发布目录。
- 影响：release artifact 可能公开未脱敏 trace/prompt/授权材料，属于隐私和数据泄漏风险。
- 根因：redaction gate 把“未扫描”当“安全”，字段名只做少量精确 snake_case 匹配，没有格式 allowlist 和 JSONL 逐行解析。
- 修正要求：public 目录只允许明确格式；支持 JSON 与 JSONL 逐值/逐行扫描；规范化敏感 key；未知/二进制格式默认拒绝；新增 JSONL raw-prompt 和 unsupported-file canary。

## R08-P2-02：可变容器 tag 与顶层 Pages/OIDC 写权限违反项目供应链约束

- 严重性：P2
- 位置：`Dockerfile`、`.github/workflows/deploy.yml`、`scripts/workflows-check.mjs`、`docs/security/supply-chain.md`
- 复现：Dockerfile 使用 `FROM python:3.12-slim`，下一次 build 可解析到不同镜像；Round 06 实际解析 digest 但未写回。Deploy 在 workflow 顶层授予 `pages: write`、`id-token: write`，build job 因继承而获得不需要的写/OIDC 权限。现有 checker 只确认字符串存在并拒绝 `write-all`，对 job-level `contents: write` canary 也会通过。
- 影响：构建输入不可复现，受污染的 build step 获得超出职责的令牌权限；“least privilege/full pin”门禁产生错误安全感。
- 根因：只固定 Actions SHA，未验证 container digest；权限检查没有区分 workflow/job scope 与允许写权限位置。
- 修正要求：Dockerfile 固定已运行 digest；deploy 顶层只读，只有 deploy job 获得 Pages/OIDC；拒绝 CI/facts 或 build job 的写权限及 deploy 以外的 pages/id-token；新增 mutable image 与 job-level write canary。

## 计数判断

R08-P1-01 是可直接绕过发布脱敏的 P1；R08-P2-02 是供应链输入与权限边界缺口。两者需要门禁、负例、workflow、Dockerfile 和治理文档共同修正，不与前轮教程/评测根因重复，满足实质 review 门槛。
