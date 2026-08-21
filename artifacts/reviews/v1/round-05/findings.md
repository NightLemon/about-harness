# Round 05 修改前 Findings

- Round：05
- Baseline：`252f75b`
- Baseline tag：`review-v1-round-05-baseline`
- Rubric：三个 coding harness、四个 framework 的事实和兼容性
- 记录时间：2026-08-21 11:40 +08:00
- 状态：已在任何 round-05 修正前冻结

## R05-P2-01：兼容矩阵把“官方文档、离线 seam、已安装产品、live 运行”压成一个状态，并保留已失效的 M5 待办

- 严重性：P2
- 位置：`docs/references/compatibility.md`、`docs/harnesses/comparison.md`、`docs/frameworks/**`
- 复现：从 compatibility 页面判断某个 framework/领域集成是否已经运行。表格仍写 LangGraph 的“M5 集成待完成”，Browser Use/PydanticAI/LlamaIndex 为“待 M5”，但 M5 已提交六个离线案例和 integration seam。反过来，Harness 表又用“官方页/固定 README，E1”表示产品能力，无法区分只读 source fact、局部 CLI version probe、项目 fake/replay seam 与真实产品运行。
- 影响：读者可能把 `lab/src/about_harness/integrations/*.py` 的确定性 contract seam 误认为已安装并运行上游 framework，或因 stale 状态误判案例缺失。迁移报告无法回答“哪一层真的测过”，也无法把产品事实错误与 adapter/fixture 失败分开。
- 根因：矩阵只有单一“当前证据/状态”列，没有把 source status、local availability、project seam 和 live evidence 分层；M5 完成时没有门禁刷新兼容页。
- 修正要求：建立四轴证据状态并逐对象重写；明确 M5 seam 已完成但 upstream package/live 未运行；给三种 harness 增加 source/local/live 区分和职责 gap；登记 Codex sandbox 与 approval 是独立控制层的官方事实；新增 stale-M5 与 evidence-conflation 正反例检查。

## R05-P2-02：Codex 对照没有解释 sandbox 与 approval 的独立性，迁移时可能把“会询问”误当成“技术隔离”

- 严重性：P2
- 位置：`docs/harnesses/codex.md`、`docs/harnesses/comparison.md`、`docs/references/fact-registry.md`
- 官方证据：2026-08-21 获取的 OpenAI Agent approvals & security 文档明确 sandbox mode 决定技术上能做什么，approval policy 决定何时询问；网络也是单独开关/策略。
- 影响：从 Pi 或 Claude Code 迁移时若只复制“approval/permission”名称，可能没有等价的 OS sandbox 或 network boundary，导致安全边界被高估。
- 修正要求：在 Codex 页和职责矩阵显式拆开 sandbox、approval、network，并给迁移表增加 gap/compensating control；把主张登记到 facts 与来源指纹。

## 计数判断

两个 P2 共享“同名能力与证据层被压平”的根因，需要兼容矩阵、产品指南、事实注册表和机器门禁共同修正，满足实质 review 门槛；后续安全 round 只审查攻击/隐私/供应链，不重复本轮职责映射。
