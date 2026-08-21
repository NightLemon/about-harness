# Round 09 修改前 Findings

- Round：09
- Baseline：`a8d4534`
- Baseline tag：`review-v1-round-09-baseline`
- Rubric：跨 harness/领域迁移、中文可读性和视觉体验
- 记录时间：2026-08-21 12:49 +08:00
- 状态：已在任何 round-09 修正前冻结

## R09-P1-01：迁移 runner 只数 key 且硬编码成功，可把空映射与权限扩大判为已完成

- 严重性：P1
- 位置：`lab/src/about_harness/labs.py`、`lab/fixtures/migration/**`、`docs/labs/migration.md`、`docs/harnesses/comparison.md`
- 复现：向 `_migration` 传入未知 source/target harness，并把 instructions/tools/permissions/state 四个 mapping value 全设为空字符串，仍返回 `mapped_responsibilities=4`、`missing=[]`、`config_copied_verbatim=false`。当前函数不读取 source/target，`config_copied_verbatim` 恒为 false；负例只检查一句文本是否包含 `rename AGENTS.md`。
- 影响：读者可能把“字段存在”误当 source/target 语义、sandbox/approval/network 边界、gap 和补偿控制已经迁移；尤其可把更宽权限输出成 E1 成功，作品集迁移报告出现安全假阳性。
- 覆盖缺口：正式范围是 Codex、Pi、Claude Code，但 fixture 只有 Codex → Claude Code；四个英文 key 未在中文教程定义，sandbox/approval/network 被压成 permissions，领域特有状态也没有映射表。
- 修正要求：fixture 至少同时覆盖 Codex → Pi 与 Codex → Claude Code；拆分 instructions、tools、sandbox、approval、network、state；每个映射保存源语义、目标语义、gap、补偿控制、证据轴和边界保持标记；runner 拒绝未知 harness、空语义、逐字复制、未补偿 gap 和控制扩大；新增两类负例、明确中文术语，并给出 coding/browser/research/data/document 的领域迁移清单。

## R09-P2-02：移动视觉证据在导航遮罩仍打开时截图，且未覆盖迁移页

- 严重性：P2
- 位置：`scripts/visual-check.mjs`、`artifacts/visual/m6/mobile-390-home.png`、`narrow-320-home.png`
- 复现：两张已提交移动首页截图显示导航遮罩覆盖正文。脚本打开菜单并切换主题后立即再次 click，没有检查当时 expanded/visible 状态，也没有等待 `.VPNavScreen` hidden 就截图；门禁仍报告通过。脚本只截图首页与评测页，不包含本轮关键迁移页。
- 交互核验：在 390×844 in-app Browser 上，菜单可正常从 expanded 切到 closed；因此根因是证据脚本的竞态/断言缺失，不是 VitePress 菜单不可用。
- 影响：视觉门禁可在遮罩、滚动锁或菜单关闭回归时继续变绿；Round 09 无法用现有六张图证明迁移表格和中英混排在 1440/390/320 可读。
- 修正要求：状态感知地关闭菜单并等待 hidden，断言关闭后的 `aria-expanded`/页面滚动；在新的 round-09 证据目录保存三视口的首页、评测、迁移截图与 manifest，不覆盖 M6 证据；检查迁移页表格/代码块可滚动、无页面级横向溢出，并增加对应断言。

## 计数判断

R09-P1-01 是会把权限/控制语义缺失判为迁移成功的 P1；R09-P2-02 是可复现的视觉证据竞态与范围缺口。它们分别需要 runner/fixture/教程回归和浏览器交互/截图回归，不与 Round 01–08 根因重复，满足实质 review 门槛。
