# 跨 Harness 迁移：保留职责

本例把 Codex 分别映射到 Pi 和 Claude Code，检查六类职责是否齐全。迁移目标是授权、状态与验收语义；文件改名不能证明这些语义相同。

<span id="学习目标与证据边界"></span>
<span id="前置条件与固定输入"></span>
<span id="本案例的迁移图"></span>
<span id="六类责任"></span>
<span id="instructions-有效指令链"></span>
<span id="instructions有效指令链"></span>
<span id="tools-调用与结果契约"></span>
<span id="tools调用与结果契约"></span>
<span id="sandbox-技术可达范围"></span>
<span id="sandbox技术可达范围"></span>
<span id="approval-何时停下来询问"></span>
<span id="approval何时停下来询问"></span>
<span id="network-实际出口"></span>
<span id="network实际出口"></span>
<span id="state-可安全继续的事实"></span>
<span id="state可安全继续的事实"></span>
<span id="一条-mapping-必须回答什么"></span>
<span id="示例-pi-的-network"></span>
<span id="示例pi-的-network"></span>
<span id="示例-claude-code-的-approval"></span>
<span id="示例claude-code-的-approval"></span>
<span id="validator-实际检查什么"></span>
<span id="两个自动负例"></span>
<span id="verbatim-config-copy"></span>
<span id="network-boundary-expansion"></span>
<span id="手动读一次-fixture"></span>
<span id="五类领域状态"></span>
<span id="真实迁移的七个阶段"></span>
<span id="_1-冻结-source"></span>
<span id="1-冻结-source"></span>
<span id="_2-建立责任表"></span>
<span id="2-建立责任表"></span>
<span id="_3-选择-target-mechanism"></span>
<span id="3-选择-target-mechanism"></span>
<span id="_4-添加-compensation"></span>
<span id="4-添加-compensation"></span>
<span id="_5-qualification"></span>
<span id="5-qualification"></span>
<span id="_6-shadow-与局部切换"></span>
<span id="6-shadow-与局部切换"></span>
<span id="_7-cutover-与回退"></span>
<span id="7-cutover-与回退"></span>
<span id="比较时控制变量"></span>
<span id="记录模板"></span>
<span id="完整验证"></span>
<span id="检查题与下一步"></span>

<span id="跨-harness-迁移-保留职责而非文件名"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Python 3.12、uv 0.11.16。输入为 `lab/fixtures/migration/` 的固定 v1.1 JSON，使用规范化 hash。已填写示例位于 `examples/portfolio-completed/migration.md`；目标产品运行状态保持未验证。

## 六类职责怎样映射

| 职责 | 必须保留 | 当前补偿例 |
| --- | --- | --- |
| instructions | 作用域与实际加载 | 对目标目录做无副作用规则探针 |
| tools | 参数、结果、错误与执行位置 | 统一工具契约与验证器 |
| sandbox | 技术可达范围 | Pi 使用外部受限环境，单独验证 |
| approval | 何时由谁批准什么 | 绑定目标和参数的询问/拒绝测试 |
| network | 实际出口与允许目标 | 容器网络或出口控制 |
| state | 检查点、未决动作与回执 | 先对账，再决定恢复 |

每行保存 `source_semantics`、`target_semantics`、`gap`、`compensating_control`、`evidence_axis` 和 `preserves_boundary`。非空字段只证明记录完整，补偿是否有效需要目标环境证据。独立 Git worktree 只隔离改动，不限制进程读目录、联网或访问凭据；sandbox 缺口需要容器、受限账户、只读挂载等 OS 级控制，并实际验证边界。

<span id="运行与预期"></span>

## 运行与断言

```bash
uv run --frozen --offline python scripts/run-labs.py migration
```

预期 `mapped_responsibilities=12`、`domains_checked=5`，两条路径齐全；`uncompensated_gaps`、`boundary_violations` 与 `verbatim_targets` 为空。负例分别拒绝整条逐字复制和无补偿的网络扩权。

| 领域 | 迁移时额外核对 |
| --- | --- |
| 编码 | 工作区、补丁和测试 |
| 浏览器 | 页面观察、登录身份和提交状态 |
| 研究 | 原始来源、引用与冲突 |
| 数据 | 单位、缺失值、隐私与写回 |
| 文档 | 解析、版本、索引和权限 |

<span id="失败归因"></span>
<span id="清理、回滚与已知限制"></span>
<span id="清理回滚与已知限制"></span>

## 失败、清理与回滚

```bash
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py -k migration
```

结构、边界或负例失败时停止迁移，保留源配置与失败记录。命令仅使用内存对象；测试临时目录自行清理。真实迁移先只读试运行，再局部切换；回退恢复源配置，并对账已经发生的外部动作。

## 已知限制

E1 只验证固定映射的结构和明确负例，不执行三套产品，也不判断所有自然语言映射真实。产品操作入口见[Harness 对照](/harnesses/comparison)。
