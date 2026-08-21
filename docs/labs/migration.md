# 跨 Harness 迁移：保留职责而非文件名

## 目标、版本与输入

把一个受约束 coding 工作流从 Codex 映射到 Claude Code。固定职责是 instructions、tools、permissions、state；输入给出语义映射，不逐字复制配置。产品事实以 2026-08-20 的[事实注册表](/references/fact-registry)为边界；容器与三平台本地入口见[实验环境](/labs/setup)。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py migration
```

预期四项职责全部映射、`missing=[]`、`config_copied_verbatim=false`。负例只把 `AGENTS.md` 改名并保留 permission 字符串，必须拒绝，因为发现顺序、作用域、hook/policy 与恢复语义不同。

## 失败、清理与回滚

任何职责缺失、目标权限扩大、输入 checkpoint 丢失或目标验证未运行都要停止迁移。当前案例不写产品配置；真实迁移应保留 source 配置、在隔离目录生成 target 配置，失败时删除候选并恢复 source checkpoint。

## 已知限制

没有真实三 harness 运行，也未固定同一模型/provider，结果不能用于性能排名。后续 E2/E3 必须记录精确版本、surface、模型、指令 hash、工具与预算。

下一步：[评测方法](/evaluation/method)。
