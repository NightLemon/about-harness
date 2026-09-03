# 实验环境与统一约定

## 学习目标与证据边界

完成本页后，你能在无网络、无凭据环境运行六个固定案例，读懂它们的共同结果结构，并解释为什么结果只能标为 E1。这里训练的是“输入可追溯、控制可执行、失败可分类”的实验习惯，不是证明某个模型或第三方框架好用。

当前六个 workload（工作负载）是：

| Case | 工程问题 | 主要负例 | 离线接缝 |
| --- | --- | --- | --- |
| `coding` | 补丁是否只改允许范围并通过边界测试 | 空值、多值等边界错误 | 最小编辑—测试闭环 |
| `browser` | 页面数据与页面内指令能否分开 | Prompt injection 诱导副作用 | Browser Use 职责映射 |
| `research` | 主张能否回到来源并保留冲突 | 相互矛盾的来源 | LangGraph 职责映射 |
| `data` | Schema 漂移与敏感字段如何处理 | 类型变化、邮箱泄露 | PydanticAI 职责映射 |
| `document` | 版本化文档是否只引用有效版本 | 过期版本干扰 | LlamaIndex 职责映射 |
| `migration` | 跨 Harness 是否保留控制责任 | 逐字复制、权限扩大 | Codex/Pi/Claude Code 责任映射 |

真实模型、Browser Use、LangGraph、PydanticAI、LlamaIndex、Codex、Pi 与 Claude Code 都不会被导入或启动。集成名称只指向被教学案例模拟的职责边界。

## 实验由四层组成

```text
manifest + input/expected/negative
             ↓ hash first
        deterministic runner
             ↓ structured result
      assertions + evidence label
             ↓ optional eval pipeline
        comparison / promotion block
```

1. **Fixture（固定样例）**：`lab/fixtures/<case>/` 中的 manifest、输入、预期和负例；
2. **Runner（运行器）**：先验证 hash，再执行确定性逻辑；
3. **Result（结果）**：输出案例身份、证据、是否离线、断言与失败状态；
4. **Evaluation（评测）**：示例矩阵说明如何比较配置，但样本不完整，不能晋级。

如果输入字节、runner 代码、配置或 validator 变化，就不是同一次实验。必须保存新的 commit/config/fixture 身份，而不是只复用旧结果标题。

## 前置条件与固定版本

- 从仓库根目录执行；
- Python 3.11+，项目基线 `uv 0.11.16`；
- Node.js 22+，依赖由 `package-lock.json` 固定；CI 与发布自动化以 Node.js 22 为最低发布基线，单次实验仍记录本机实际 Node 版本；
- Python 依赖由 `uv.lock` 固定；
- `lab/configs/default.json` 与 `engineering.json` 均设置 `model_id=offline-replay`、`live_enabled=false`、`network=none`；
- Fixture manifest 记录 source、license、核对日期和三个文件 SHA256。

先记录环境与工作树：

```powershell
node --version
python --version
uv --version
git status --short --branch
```

若 Node 低于 22、Python 低于 3.11、uv 不是计划版本，或工作树包含来源不明的 Lab 改动，先停止并处理基线，不直接生成新证据。

## 准备依赖

首次安装可能需要访问依赖源：

```powershell
npm ci
uv sync --frozen
```

依赖已进入 cache（缓存）后，实验阶段显式保持离线：

```powershell
uv sync --frozen --offline
```

如果这里缺包，说明离线环境尚未准备好。可以回到获允许的依赖准备阶段补齐 cache，但不能移除 `--offline` 后仍把同一运行写成 E1 离线证据。

## 三条执行路径

三条路径读取同一组 fixture，但环境身份不同，应分别记录。

### 单案例快速检查

```powershell
uv run --frozen --offline python scripts/run-labs.py coding
```

预期顶层 `evidence=E1`、`offline=true`、`passed=true`，且 `cases` 只有 `coding`。这条路径最适合调试一个失败。

### 本地完整案例与评测结构

Windows、macOS 与 Linux 读取相同锁文件和 fixture，但分别保留实际 shell 与环境版本。

### Windows（PowerShell）

```powershell
npm run labs:all
npm run eval:validate
npm run eval:summary
npm run results:redact
```

### macOS / Linux（POSIX shell）

```bash
npm run labs:all
npm run eval:validate
npm run eval:summary
npm run results:redact
```

预期：

- 六个 case 的 `passed` 与 `negative_rejected` 都是 `true`；
- 汇总为 `evidence=E1`、`offline=true`；
- study 有 20 个 task、6 类 workload、6 个 holdout、2 个 config、3 次重复；
- 示例 run 只有 12 行，而完整矩阵需要 120 行，因此 `promotion_eligible=false`；
- 公开 JSON/JSONL 脱敏检查通过。

矩阵不完整是示例刻意保留的事实，不是应删除的红色噪音。它演示“缺数据时拒绝晋级”。

### 隔离容器

```powershell
docker compose build --pull=false labs-all
docker compose run --rm labs-all
```

容器使用固定 Python 3.12 image digest、非 root 用户、只读文件系统、`network_mode: none`、移除 capabilities，并只给 `/tmp` 一个小型 tmpfs。若本机还没有基础镜像，build 可能失败；应在受控依赖准备阶段取得并记录 digest，不能把拉取镜像算作离线实验。

## 如何读结果，而不是只看绿色

顶层结构示意：

```json
{
  "schema_version": "1.0",
  "evidence": "E1",
  "offline": true,
  "cases": [],
  "passed": true
}
```

每个 case 还必须包含 `case_id`、`fixture_hash`、`negative_rejected`、`safety_violation` 和结构化 `output`。至少逐项断言：

| Case | 关键业务断言 |
| --- | --- |
| `coding` | 补丁应用，空/单/多值测试均通过，只改变允许文件 |
| `browser` | `injection_refused=true`、`side_effects=0` |
| `research` | 冲突仍标记为 `conflict`，无 unsupported claim |
| `data` | Email 被脱敏，schema 漂移得到显式处理 |
| `document` | 只引用当前版本，旧版本被忽略 |
| `migration` | 两条路径、12 项责任完成映射，无边界扩大或逐字复制 |

`passed=true` 是这些项目规则的结果，不是对模型能力的主观评价。要判断某条结论是否成立，还要查看对应 output 和 validator 是否真的覆盖该结论。

## 为什么只能是 E1

当前实验满足：固定合成输入、可复现 hash、离线实现、结构化负例和确定性断言。因此它比纯设计 E0 更强，可以证明项目内的控制契约能运行。

它没有满足：

- 真实 provider、model、第三方框架或产品版本；
- 真实网络、认证、配额、streaming 和 provider error；
- 代表性生产数据、重复样本与 holdout 完整矩阵；
- 真实费用、延迟、人工接管和线上副作用。

所以结果不能升级为 E2/E3，也不能写成“LangGraph/Browser Use/Qwen 已通过”。

## 失败注入与停止条件

在正式 fixture 上只读运行。需要理解 hash 门禁时，按[离线 Runner](/labs/runner)复制到系统生成的唯一临时目录再篡改；预期在案例逻辑执行前以 `hash mismatch` 失败。

出现以下任一情况立即停止：

- 命令请求 API key、模型下载或外部网络；
- fixture hash 与 manifest 不一致且来源不明；
- 输出含真实 Secret、私人绝对路径或个人数据；
- `offline=false`，或结果把 E1 声称为 E2/E3；
- 负例未被拒绝，却仍得到 `passed=true`；
- 为让结果通过而需要更新 expected/hash，但没有解释语义变化。

不要在失败后直接改 fixture 或 expected。先保存 commit、config、命令、退出码和最小错误，再判断问题位于输入、runner、validator 还是环境。

## 常见失败归因

| 症状 | 首查 | 错误捷径 |
| --- | --- | --- |
| 单案例 hash mismatch | 工作树 diff、文件编码、manifest | 直接重算 hash |
| 本地通过、容器失败 | 镜像、复制范围、路径、Python 版本 | 宣称容器不重要 |
| 容器通过、本地失败 | uv 环境、缓存、宿主权限 | 改 fixture 适配本机 |
| `eval:validate` 失败 | task/fixture lineage、矩阵主键 | 删除缺失行检查 |
| `results:redact` 失败 | 原始结果中的敏感字段与格式 | 把整个文件排除扫描 |
| 负例通过 | validator 覆盖、条件方向、案例输出 | 只看顶层退出码 |
| 两次输出不同 | commit、fixture/config hash、排序和环境 | 称为模型随机性 |

## 清理、回滚与记录模板

Runner 只读 fixture 并向 stdout 输出；它不会保存 run。终止时在当前进程发送 `Ctrl+C`。容器使用：

```powershell
docker compose down --remove-orphans
```

`.pytest_cache`、Python bytecode 或构建目录属于可再生 cache；先用 `git status --short` 确认它们未被跟踪，再只清理本轮明确生成的路径。修改案例时保留旧 fixture/result，建立新版本；失败后回退自己的候选代码，不移动已有 tag 或覆盖公开结果。

一条可审计记录至少包含：

```text
run_id / timestamp / operator class
git commit / dirty paths
OS / Python / uv / Node
case / fixture hash / config ID
exact command / exit code
result artifact hash
failure classification / unresolved
evidence=E1 / offline=true
```

## 完成条件与下一步

你应能解释 fixture、runner、result 和 eval 的关系；从结构化输出验证六个案例各自的业务断言；复现一个 hash 失败而不修改正式 fixture；并准确说明 E1 不能证明什么。

下一步阅读[离线 Runner](/labs/runner)理解执行生命周期，然后按 `coding` → `browser` → `research` → `data` → `document` → `migration` 顺序完成案例。
