# V1 审阅方法与证据契约

项目采用“先冻结 baseline，再独立发现，随后修正与验证”的十轮审阅。数量不是目标；可追溯的不同视角、真实发现和防回归证据才是目标。

## Legacy 与 v1

`docs/reviews/legacy/round-01.md` 至 `round-10.md` 是 M1 baseline 中已有记录。它们主题不同且有参考价值，但没有逐轮冻结 commit、修改前 findings、diff、result tag 和完整环境元数据，因此**不计入 v1**。

V1 记录放在 `docs/reviews/v1/`，机器证据放在 `artifacts/reviews/v1/round-NN/`。二者缺一不可。

## 一轮怎样计数

一轮必须同时满足：

1. 上一 result 已成为不可移动的 baseline commit 与 annotated tag；
2. 修改前产生 findings，含范围、复现、严重性和证据；
3. 修复至少一个已证实 P1/P2，或一组共同根因 P3；
4. 新增与根因对应的防回归验证；
5. 保存 baseline/result SHA、diff、命令、退出码、截图/trace/hash 和未决项；
6. result commit 与 annotated complete tag 在验证通过后创建；
7. 相同根因不跨轮重复计数。

纯错字、格式、轮次号、无证据重写或“没有发现但创建 complete 文件”均不计数。没有实质发现时应记录尝试，但不创建 complete tag，改用新的独立视角继续审阅。

## 每轮文件

每个 `artifacts/reviews/v1/round-NN/` 至少包含：

- `baseline.json`：baseline SHA/tag、范围与文件 hash；
- `findings.md`：修改前发现、严重性、复现与建议；
- `diff.patch`：baseline 到 result 的实际差异；
- `verification.json`：命令、退出码、时间、环境与 artifact hash；
- `unresolved.md`：剩余问题与是否阻断；
- 所需截图、trace、fixture/result hash。

## 统一元数据

每轮记录 round ID、日期、时区、reviewer 角色与 rubric 版本；模型 provider、精确模型 ID 与解析标识；harness 名称、版本、surface 与配置；system/developer/user 指令版本或 hash；skills、tools、MCP/CLI 与版本；OS、容器、Python、Node、浏览器和依赖锁版本；offline/live、网络状态、来源快照、抽样与排除项。

没有调用模型时，模型字段必须写 `none (deterministic local review)`，不能省略或冒充真实模型 review。

## 严重性

- **P0**：凭据/隐私泄漏、破坏性行为、发布产物不可恢复等立即停止问题；
- **P1**：核心结论错误、主要教程不可运行、评测数据失真或安全门禁失效；
- **P2**：重要缺口、歧义、跨平台/迁移失败或显著可读性问题；
- **P3**：局部一致性、表达、维护性或低风险体验问题。

M8 release candidate 不得有开放 P0/P1，也不得有阻断学习成果、复现、安全或发布的 P2。

## 十轮关注点

| 轮次 | 关注点 |
| --- | --- |
| 01 | 范围、术语和知识地图 |
| 02 | 学习路径、信息架构和作品集 |
| 03 | 架构、可靠执行和最小实现 |
| 04 | 模型、provider、协议和调优方法 |
| 05 | 三个 harness、四个 framework 的事实和兼容性 |
| 06 | 六个教程、容器和跨平台复现 |
| 07 | 评测、统计、holdout 和数据完整性 |
| 08 | 安全、隐私、许可和供应链 |
| 09 | 迁移、中文可读性和视觉体验 |
| 10 | 发布、来源时效、全局一致性和最终主张 |

## 恢复

Tag 不移动、不覆盖；失败修正用新 commit/revert，不使用 `reset --hard`。中断时回到最近完整 baseline，审计未提交 diff；没有 complete tag 的轮次不得计入完成数。
