# Coding：固定仓库中的测试驱动修复

## 目标、版本与输入

目标是识别 `collect` 漏掉最后一个元素的边界错误，只改一个函数并用 empty/single/multiple 三个断言验证。输入、期望和“顺手加生产依赖”的负例都由 `lab/fixtures/coding/manifest.json` 固定；执行环境继承[实验环境](/labs/setup)。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

预期 `patch_applied=true`、`tests_passed=3`、`files_changed=1`。验收不是“补丁看起来对”，而是候选只把循环上界从 `len(items)-1` 修为 `len(items)`，并保留三类边界断言。

## 失败、清理与回滚

负例要求拒绝无关依赖和扩大范围。若 fixture hash 失败，停止并核对 manifest；若行为断言失败，保留失败输出，不修改 expected 来迎合实现。本案例不写工作树，终止即可清理；实现修改应回到输入 checkpoint 后重做最小 patch。

## 已知限制

这里没有真实 Git 仓库、编译器或模型，只验证“复现—最小 patch—确定性断言”的契约。真实 coding 实验必须记录输入 commit、测试发现、diff 与生成物排除。

下一步：[浏览器案例](/labs/browser)。
