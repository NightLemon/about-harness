# V1 Review Round 05：Harness 与 Framework 事实兼容性

## 结论

本轮基于 `review-v1-round-05-baseline` 修复两个共享根因的 P2：兼容矩阵把官方事实、本地可用性、项目离线 seam 与 live 运行压成单一状态；Codex 对照又把 sandbox、approval 与 network 合并成模糊的“权限”。这会让读者把 M5 contract seam 误当上游产品实测，或把“会询问”误当技术隔离。

## 修改前证据

- Baseline：`252f75b1dc312ed446017e3f3bde777d1f6979c9`
- Findings commit：`f2b0637db9140f79f32a6f2352a5292c5ba7da5e`
- Findings：`R05-P2-01`、`R05-P2-02`
- 官方来源：OpenAI Agent approvals & security；响应 SHA256 记录在 baseline 和来源表
- 详细复现：`artifacts/reviews/v1/round-05/findings.md`

## 修正

- 把兼容证据拆为 Source fact、Local surface、Project seam、Live evidence 四轴。
- 删除失效的 M5 待办，明确 M5 integration 只是 offline contract seam，不代表安装或运行上游 framework。
- 分开记录 Codex sandbox、approval policy 与 network；迁移时必须写 gap 和 compensating control。
- 登记 `codex-sandbox-approval` 官方事实，并保存官方 Markdown 指纹。
- 新增 `compat:check` 与 `compat:self-test`，拒绝 stale milestone、证据混同和控制层混同。

## 验证与边界

`compat:check`、`compat:self-test`、`facts:check`、`docs:check`、`git diff --check` 和完整 `npm run verify` 均通过；事实注册表共 16 条 verified claim。内容结果 commit 为 `350cba7`。本轮使用 OpenAI Docs 技能读取官方文档，没有调用真实模型/API、产生费用或执行远程操作；所有产品 live evidence 仍为 `untested`。
