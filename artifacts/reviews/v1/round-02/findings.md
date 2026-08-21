# Round 02 修改前 Findings

- Round：02
- Baseline：`17c4b9c47ccdc7a56a5866f1ba27331944c4c3fe`
- Baseline tag：`review-v1-round-02-baseline`
- Rubric：学习路径、信息架构和作品集
- 记录时间：2026-08-21 10:55 +08:00
- 状态：已在任何 round-02 修正前冻结

## R02-P2-01：学习路径仍把 legacy `/practice/` 页面和未完成里程碑当作主路线

- 严重性：P2
- 位置：`docs/guide/start.md`、`docs/guide/prerequisites.md`、`docs/guide/portfolio.md`
- 复现：从“路线 A/B”逐项点击，并按“前置知识与环境”准备实验，再尝试使用作品集评分。
- 证据：
  - 路线 A/B 的关键步骤仍指向 `/practice/evaluation`、`/practice/model-playbook`、`/practice/debugging`、`/practice/end-to-end` 等 legacy 入口；同时写“后续里程碑会迁入正式结构”，但 M3–M6 已完成。
  - 前置页仍写“M3 将提供容器/devcontainer”，并声称“当前站点只需要 Node.js 22”，没有区分只读站点与运行 Python lab 的环境要求。
  - 作品集只有权重和门禁，没有统一的 0/50/75/100 分档锚点；“两次独立检查”无法对同一份产物产生可比评分。
- 影响：读者从正式首页进入后被带回迁移前信息架构，无法发现 `labs/`、`evaluation/`、`models/` 的正式入口；准备环境时会漏装 Python/uv；评分者即使使用相同权重也可能给出不可比较的结果。
- 根因：M2 的学习路线和 rubric 没有在 M3–M6 交付后做可执行迁移；当前检查只验证链接存在，legacy stub 让过时入口逃过门禁。
- 修正要求：把三条路线改为正式页面，明确站点与 lab 两套环境，给 rubric 增加统一分档锚点，并新增检查阻止 `/practice/` 主路线、未来里程碑占位和缺失评分锚点回归。
- 防回归：新增 `scripts/learning-path-check.mjs` 与负例 self-test，并纳入 `npm run verify`。

## 计数判断

本轮有一个跨学习路径、环境和评分的共同根因 P2，需要内容迁移与机器门禁共同修复，满足实质 review 门槛；不得在后续轮次重复计数。
