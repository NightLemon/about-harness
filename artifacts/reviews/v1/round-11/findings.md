# Round 11 修改前 Findings

- Round：11
- Baseline：`06a44ef06f7f3b7d14b286f6ae2ea9370d080790`
- Baseline tag：`review-v1-round-11-baseline`
- Previous evidence：`review-v1-round-10-complete` / `5054f44578b6c29d83601b513a0c3d6b98ae4ec2`
- Rubric：发布后全局复核、运行时契约、评测 lineage、事实状态和 review 可持续性
- 记录时间：2026-08-22 17:31 +08:00
- 状态：已在任何 Round 11 修正前冻结

## R11-P1-01：TypeScript 运行时契约允许非法任务和非有限 action 绕过预算

- 严重性：P1
- 位置：`lab/ts/contracts.ts`、`lab/ts/minimal-loop.ts`、`lab/schemas/task.json`
- 复现：Node.js 24 直接调用 `validateTask` 时，重复 `allowed_tools`、空工具名、`NaN` 和 `Infinity` 的 `max_cost_usd` 全部被接受。`MinimalLoop` 不验证 adapter 返回的 action；`cost += NaN` 后 `cost > max_cost_usd` 为 false，因此可返回 `completed/completed`，并把 `NaN` 写入 metrics。
- 契约差异：公共 JSON Schema 已要求工具名 `minLength: 1`、数组 `uniqueItems: true`，Python `TaskSpec`/`Action` 也拒绝重复工具名和非有限成本；TypeScript 仅做宽松结构检查。
- 影响：不可信 adapter 可以污染 trace/metrics，并绕过成本预算；同一任务在 Python、JSON Schema 与 TypeScript 上得到不同结果。
- 修正要求：以 JSON Schema 为公共 Task 契约收紧 `validateTask`；新增 `validateAction`，验证 discriminant、完整字段、JSON 值、非空 call/tool/idempotency key 与有限非负成本；`MinimalLoop` 在任何计数、成本累加或 trace 写入前捕获坏 action，并返回 `failed/invalid_action`。增加可执行 TypeScript runtime 负例。

## R11-P2-02：历史 migration E1 样例缺少可解析 fixture lineage

- 严重性：P2
- 位置：`evals/tasks.example.jsonl`、`evals/runs.example.jsonl`、`scripts/eval-validate.mjs`、`scripts/eval-lib.mjs`、`lab/fixtures/migration/**`
- 复现：migration task 和两条 run 固定记录 `482c941c…`，这是 M5 commit `6aada53` 时的历史 fixture；Round 09 在 `dc71b0d` 更新 migration fixture 后，当前 canonical bundle hash 已变为 `5f9cd084…`。`eval:validate` 只读取 study 与 run，不读取 task 文件或 Git fixture reference，也不比较 task/run/ref 三者。
- 证据边界：旧 `482c…` 可能是合法历史 E1 样例，不能仅因当前 fixture 改变就重写；缺陷是记录没有固定 `commit + path`，无法证明旧 hash 对应哪一版输入。
- 影响：任意格式正确的 64 位 hash 都可进入 task/run；篡改 task、run 或 fixture 历史引用时验证仍可能通过，E1 样例不可独立重放。
- 修正要求：保留 `482c…`；新增版本化 fixture reference，固定可解析 commit/path/hash；`eval:validate` 接受 task/ref/study/run 四类输入并跨文件检查 task ID、run hash、ref hash和可从 Git 解析的 fixture bundle。增加 ref、path、commit、task hash 与 run hash 篡改负例。

## R11-P2-03：已发布站点与 README/治理状态互相矛盾

- 严重性：P2
- 位置：`README.md`、`docs/meta/changelog.md`、`docs/meta/publishing.md`、`artifacts/release/v1/**`
- 复现：2026-08-22 对 `https://nightlemon.github.io/about-harness/` 的只读探针返回 HTTP 200；公开 source SHA、CI 和 deploy 已有成功记录。但 README 仍写“当前 release candidate 仍未发布”，changelog 仍写 M9 未授权，事实注册表也没有 publication 记录。
- 历史边界：`release-v1-rc3` 的 `pending-publication` 是部署前候选快照，不是发布结果。改写 RC 文件或移动 RC tag 会破坏审计，不属于修正方案。
- 影响：读者与维护者无法从仓库当前文档判断站点已发布；如果直接把 RC 改成 published，又会抹掉候选阶段与发布阶段的时间顺序。
- 修正要求：新增独立 publication result schema、artifact 和 `publication:check`，绑定 published SHA、Pages URL、CI/deploy run 与当日 HTTP 200；更新 README、changelog、发布来源页，并将 publication 注册为 verified E1。保留所有 RC1–RC3 文件和 tags 不变。

## R11-P2-04：DeepSeek 待核验主张没有进入事实注册表

- 严重性：P2
- 位置：`docs/models/deepseek.md`、`docs/references/fact-registry.md`、`scripts/facts-check.mjs`
- 复现：DeepSeek 页面明确说 pricing 页面 TLS 失败，价格、model alias、上下文和可用性保持 `pending`；`npm run facts:check` 却报告 `16 verified / 0 pending`，页面没有 `[FACT:ID]`。
- 影响：发布者会误读为全部易变产品事实均已核验；新增“待核验”文字可以绕过 registry 的来源、日期、证据与 Used by 约束。
- 修正要求：注册 DeepSeek API surface 为 E0/pending，并在正文引用；事实门禁扫描产品页，对出现 `pending` 或“待核验”却没有 `[FACT:ID]` 的页面 fail closed。最终注册表应为 18 条：17 verified、1 pending。

## R11-P2-05：Review checker 把 v1 永久限制为十轮

- 严重性：P2
- 位置：`scripts/reviews-check.mjs`、相关 self-test、`docs/reviews/v1/index.md`
- 复现：checker 的连续性判断同时写死 `index >= 10`，错误文本要求 `round-01 through round-10`；任何合法 `round-11.md` 都会失败。它还要求下一轮 baseline 必须等于上一轮 evidence commit，而发布后的 M9/状态回填 commits 使 Round 11 合法 baseline 只能是其后继。
- 影响：AGENTS.md 要求新 review 必须写入 v1，但仓库门禁禁止第十一轮，项目无法继续审阅；若放宽全部历史规则，又会破坏已冻结前十轮和 RC3 契约。
- 修正要求：支持连续 Round 11+；保留 legacy hashes、旧路由与 Round 01–10 的严格直接链；post-release round 要求上一轮 evidence commit 是新 baseline 的祖先，并要求显式 `input_evidence_commit`。增加缺号、伪造祖先与 Round 11 pending/complete 负例；`release:check` 继续只验证历史 RC3 的十轮。

## 计数与降级判断

本轮共记录 1 个 P1、4 个 P2。R11-P1-01 能直接绕过预算并生成非法完成结果，因此保持 P1。历史 migration hash 不判为错误值，而判为 lineage 缺口；RC3 `pending-publication` 作为历史快照不判为缺陷。页面篇幅、E1 labs 深度和自动可访问性（accessibility，a11y）门禁记录为 P3 backlog，不纳入本轮修复 Goal。
