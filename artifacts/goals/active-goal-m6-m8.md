# Historical Goal Controller：M6-M8

状态：**已结束，仅作历史审计，不是当前授权控制面。**

以下内容是 M6-M8 执行期间使用的固定 Goal Controller 原文。M8 已完成，M9 也已另行授权并完成，因此不得再引用本文件授予任何新操作。

---

# Active Goal Controller v1

本文件是 M6-M8 的固定执行授权控制面。`EXECUTION_PLAN.md` 是会在 checkpoint 更新的 living document，不得用它的 SHA256 判断 Goal 是否仍有效。

## 当前恢复点

- Git branch：`main`
- 已验收恢复点：`m5-complete-v1`（commit `6aada53`）
- M1-M5 已完成，不得重跑、改写或移动其 commits 和 annotated tags。
- M6 进行中；M7、M8 未开始。

## 授权

引用本文件 SHA256 的 `/goal` 一次性授予 M6-M8 的：

- A1：本地文件修改和本地验证；
- A2：本地 commits 和 annotated tags，包括十轮 review 的 baseline/result tags。

M6、M7 完成后记录 checkpoint 并自动继续；M8 完成后停止。

## 禁止动作

以下权限未授予：

- A3：真实 API、凭据、非公开数据和费用；
- A4：remote、push、PR、GitHub 设置、Pages 和发布。

不得 force push、移动已有 tag、删除历史证据、覆盖用户改动，或把 E1 写成 E2/E3。

## 暂停条件

仅在以下情况暂停并报告：

- 完成 M8；
- 需要 A3 或 A4；
- 发现真实 secret、隐私泄露、P0、安全或供应链事件；
- 需要扩大已批准范围、引入许可不明依赖或执行不可逆动作；
- 当前 Git 历史不再包含 `m5-complete-v1`，或出现无法非破坏性合并的并发用户改动；
- 本文件的内容或 SHA256 改变。

普通测试失败、lint 失败、文档检查失败、实现缺口和可局部修复的依赖问题不是授权阻塞。应在当前里程碑内修复并重跑验证。

## 状态与优先级

- Goal 有效性只绑定本文件 SHA256，不绑定 `EXECUTION_PLAN.md` SHA256。
- `EXECUTION_PLAN.md` 必须随进度更新；更新它不会使 Goal 失效。
- Git commits、annotated tags、验证证据和本文件共同决定实际进度。
- 若 `EXECUTION_PLAN.md` 中存在旧的 M0、旧哈希或逐里程碑重复授权措辞，以本文件为准并修正计划，不得回退已验收进度。
- Goal 执行期间不得修改本文件。确需修改时先暂停并由用户重新授权。
