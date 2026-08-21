# Round 10 修改前 Findings

- Round：10
- Baseline：`621ec3c`
- Baseline tag：`review-v1-round-10-baseline`
- Rubric：发布、来源时效、全局一致性和最终主张
- 记录时间：2026-08-21 13:31 +08:00
- 状态：已在任何 round-10 修正前冻结

## R10-P1-01：Review 与 release 门禁只数文件存在，无法证明十轮证据链

- 严重性：P1
- 位置：`scripts/reviews-check.mjs`、`scripts/test-m2-checks.mjs`、`package.json`、计划中的 `artifacts/release/v1/**`
- 复现：当前 `reviews-check` 对每份 v1 记录只检查五个文件名存在；不解析 `baseline.json` / `verification.json`，不验证非空 findings/diff、不核对 artifact hash、commit 祖先关系、annotated baseline/complete tag 或 tag 指向的 evidence commit。`test-m2-checks` 只破坏 legacy hash 和 README 文案。五个空文件即可让一份 v1 round 被计数。仓库也没有 `release:check`，因此手工创建 release manifest 仍可遗漏 round、事实、许可或 result SHA。
- 影响：十轮数量和 release candidate 可以在关键证据缺失、tag 是 lightweight/指错 commit、diff 与 result 不对应时继续变绿；这直接破坏用户要求的“有实质差异、可追踪、有证据”以及 M8 最终验收。
- 修正要求：严格解析每轮元数据与 hash，要求非空/可识别 findings、diff、unresolved，核对 baseline/findings/content/evidence 的 Git 祖先关系与 annotated tags；增加伪造 v1 记录 canary。新增 release candidate schema/check/self-test，要求十轮、事实时效、许可/secret/workflow/视觉/全量验证、已知限制和 A3/A4 边界齐全。

## R10-P2-02：事实注册表的 `Used by` 只是可达路由，主张可完全没有正文锚点

- 严重性：P2
- 位置：`scripts/facts-check.mjs`、`docs/references/fact-registry.md`、`docs/guide/roadmap.md`、`docs/meta/changelog.md`、`docs/references/sources.md`
- 复现：检查器只拒绝正文引用未知 `[FACT:ID]`，却不要求 registry 中的 verified/pending/conflict 条目在声明的 `Used by` 页面出现。当前 `boundary-harness` 和 `review-legacy` 的正文引用数都是 0，`facts:release` 仍报告 16 条 verified、0 stale。
- 影响：发布前 30 天门禁只能证明表格日期新，不能证明被核对主张与读者看到的具体句子相连；错误的 `Used by` 路由、孤儿事实或换页后失去引用都不会被发现。
- 官方复核：OpenAI Docs 的 Agent approvals & security 仍明确把 sandbox mode、approval policy 与 network 分为职责独立的控制层；function calling 页面仍含 `call_id` / `function_call_output`，reasoning 页面仍含 `previous_response_id` 与 effort。Round 10 浏览器 DOM 指纹已写入 `baseline.json`，没有调用模型 API。
- 修正要求：对所有非 retired 记录要求 `[FACT:ID]` 出现在其 `Used by` 路由，拒绝零引用或错路由；为两个孤儿事实补正文锚点；增加 canary；在来源页追加 Round 10 官方复核指纹与“DOM 指纹不是永久快照”的边界。

## R10-P2-03：发布与教程对 Node 基线互相矛盾，且没有机器约束

- 严重性：P2
- 位置：`README.md`、`docs/guide/prerequisites.md`、`docs/labs/setup.md`、`.github/workflows/*.yml`、`package.json`
- 复现：README、前置知识和三份 workflow 以 Node 22 为基线，TypeScript 教程写 Node 22+；实验环境却声称“Node 24 的锁定项目环境”。`package.json` 没有 `engines.node`，锁文件本身也不锁 Node runtime。Round 10 本机验证是 Node 24，不能反推 CI Node 22 或读者 Node 24 是唯一版本。
- 影响：读者无法判断 22 是最低版本、CI 基线还是已经过时；“锁定 Node 24”是不可由当前 artifact 证明的发布主张，也会让跨平台复现记录无法比较。
- 修正要求：统一为 Node 22+、CI/deploy 以 22 为发布基线、本地 Round 10 记录 24；在 `package.json` 增加 engines 范围并加入文档/配置一致性检查及负例。

## 计数判断

R10-P1-01 会让伪造或不完整十轮直接进入 release candidate，属于发布证据链 P1。R10-P2-02 与 R10-P2-03 分别是 claim-level 来源追踪和运行基线一致性缺口，均有当前状态可复现证据，与 Round 01–09 根因不同。本轮满足实质 review 门槛。
