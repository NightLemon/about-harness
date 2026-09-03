# 离线 Runner 与职责接缝

## Runner 真正负责什么

Runner（运行器）不是一个假模型，也不是缩小版第三方框架。它把固定输入、校验顺序、案例逻辑、负例和结果结构串成可复现的 E1 执行面，用来回答：

1. 输入是否与 manifest 声明的字节一致？
2. 案例是否执行了预定的稳定机制？
3. 正例与负例是否都得到结构化判定？
4. 结果能否被后续评测和审阅读取？
5. 整个过程是否保持离线、无凭据、无外部副作用？

它不回答“某模型会不会这样做”“某框架当前 API 是否兼容”或“线上性能如何”。

## 输入目录与契约

每个 `lab/fixtures/<case>/` 目录包含：

```text
manifest.json   来源、许可、日期、个人数据标记、文件 SHA256
input.json      正常输入与任务条件
expected.json   可由代码判定的预期结果
negative.json   必须拒绝或安全处理的失败输入
```

`scripts/run-labs.py` 接受一个 case 名或 `all`，可选 `--fixtures-root` 只改变读取根目录。合法 case 固定为 `coding`、`browser`、`research`、`data`、`document`、`migration`；未知名称由参数解析直接拒绝。

输入不是“看到 JSON 就相信”。Runner 先用 manifest 校验三个文件 SHA256，再按固定行构造整个 fixture hash。任一字节变化都会在案例执行前失败，避免输入已漂移但结果仍沿用旧身份。

## 执行生命周期

```text
CLI parse
  → resolve fixtures root
  → verify case name
  → parse manifest
  → hash input/expected/negative
  → compute fixture identity
  → execute deterministic case
  → compare expected assertions
  → run negative rejection
  → emit one JSON summary
  → exit 0 only when every case passed
```

这个顺序很重要：hash 错误时不应该继续执行案例，也不能在输出后才补一个 warning。负例不是附加说明；`negative_rejected=false` 必须让 case 和顶层 summary 失败。

## 结果结构与不变量

顶层由 CLI 生成：

```json
{
  "schema_version": "1.0",
  "evidence": "E1",
  "offline": true,
  "cases": [],
  "passed": true
}
```

每个 case 至少包含：

```text
case_id
fixture_hash
schema_version
evidence=E1
offline=true
passed
negative_rejected
safety_violation
output
```

这些字段承担不同责任：`fixture_hash` 定位输入，`passed` 汇总正负断言，`negative_rejected` 防止只测 happy path（顺利路径），`safety_violation` 保留安全结果，`output` 给业务级复核。不能只保存顶层 `passed` 后丢弃案例细节。

## 单案例运行与业务断言

前置条件是 Python 3.11+、`uv 0.11.16`、锁定依赖已进入本地 cache，并从仓库根目录执行：

```powershell
uv run --frozen --offline python scripts/run-labs.py browser
```

预期 `cases` 只有一个 `browser`，且：

```text
offline=true
evidence=E1
passed=true
negative_rejected=true
output.injection_refused=true
output.side_effects=0
```

把参数替换为其他 case 时，复核对应语义而不是只看布尔值：

| Case | 最关键的 output 证据 | 典型失败分类 |
| --- | --- | --- |
| `coding` | patch 已应用；空、单、多值测试均通过 | implementation / verification |
| `browser` | 注入被拒绝；副作用为 0 | policy / injection |
| `research` | 冲突来源仍为 conflict；无无来源主张 | citation / conflict |
| `data` | 敏感值为 0；行结构可解释 | schema / privacy |
| `document` | 答案引用当前版本；旧版本被忽略 | version / retrieval |
| `migration` | 责任无缺失、无扩大、无逐字复制 | boundary / mapping |

运行全套：

```powershell
uv run --frozen --offline python scripts/run-labs.py all
```

Runner 按固定 `LAB_NAMES` 顺序执行。任一 case 失败，顶层 `passed=false` 且退出非零；不要从失败集合中删除该 case 后重新宣称“全套通过”。

## 为什么不直接安装四个 Framework

`lab/src/about_harness/integrations/` 中的模块只声明第三方 distribution/import 名、领域职责和 `offline-contract-seam` 模式。它们不导入 Browser Use、LangGraph、PydanticAI 或 LlamaIndex，不读凭据，也不联网。

这条 seam（职责接缝）可以验证：项目是否知道该层应该承担什么、输入输出是否稳定、负例是否被保留。它不能验证：

- 上游包是否能安装或当前 API 是否一致；
- framework 的真实事件、异步、重试、checkpoint 和错误语义；
- provider/model 与 framework 的组合是否可运行；
- 实际浏览器、数据源、文档索引或部署环境；
- 真实质量、延迟、成本和安全表现。

真实接入必须建立另一条 E2/E3 记录，固定包版本、Adapter、模型、网络、数据、预算和 surface，不能把这个离线模块改名后冒充。

## 可控的 Hash 失败练习

目标是证明“输入先校验”，不是修改正式 fixture。请只在系统生成的唯一临时目录操作。

### Windows PowerShell

```powershell
$caseRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("about-harness-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $caseRoot | Out-Null
Copy-Item -Recurse lab/fixtures/coding (Join-Path $caseRoot "coding")
Set-Content -Encoding utf8 (Join-Path $caseRoot "coding/input.json") '{"tampered":true}'
uv run --frozen --offline python scripts/run-labs.py coding --fixtures-root $caseRoot
```

### macOS / Linux

```bash
case_root="$(mktemp -d)"
cp -R lab/fixtures/coding "$case_root/coding"
printf '%s\n' '{"tampered":true}' > "$case_root/coding/input.json"
uv run --frozen --offline python scripts/run-labs.py coding --fixtures-root "$case_root"
```

预期命令以非零状态退出，错误包含 `hash mismatch for input.json`，并且没有案例 result。这证明失败发生在执行前。

清理前先打印并确认路径位于系统临时目录，且名称以 `about-harness-` 开头。Windows 使用：

```powershell
$caseRoot
if ((Split-Path $caseRoot -Leaf) -like 'about-harness-*') {
  Remove-Item -LiteralPath $caseRoot -Recurse -Force
}
```

macOS / Linux 使用创建时返回的精确变量，并先核对：

```bash
printf '%s\n' "$case_root"
case "$case_root" in
  "${TMPDIR:-/tmp}"/*) rm -rf -- "$case_root" ;;
  *) printf '%s\n' 'refuse cleanup: unexpected path' >&2 ;;
esac
```

如果命令反而成功，不要更新 manifest；保存临时目录和输出，检查 `--fixtures-root` 解析、hash 验证是否被绕过。

## 修改或新增案例的设计顺序

先写工程问题和失败定义，再写代码：

1. 定义稳定机制，不使用某个产品的营销名称代替责任；
2. 选择合成、许可明确且无个人数据的 input；
3. 写 expected 的业务断言，而不是复制实现输出；
4. 写至少一个能击穿天真实现的 negative；
5. 固定 manifest metadata 和三个文件 hash；
6. 实现确定性 case，并让正例和负例共同决定 `passed`；
7. 增加单元测试、类型检查和失败回归；
8. 更新文档，明确 E1 与未验证的 live 边界。

不要为了增加案例数量而复制一个目录只改名称。新案例应覆盖学习地图中的新责任，且删除它会造成可解释的知识缺口。

## 失败归因

| 现象 | 最可能的层 | 首查证据 |
| --- | --- | --- |
| 参数直接被拒绝 | CLI contract | case choices 与实际命令 |
| `hash mismatch` | Fixture identity | manifest、字节 diff、编码 |
| 正例输出不符 | Case logic / expected | 结构化 output 与断言路径 |
| `negative_rejected=false` | Validator / negative | 负例输入与拒绝条件 |
| 顶层失败但案例看似通过 | Aggregation | 每个 case 的严格布尔字段 |
| 两次 hash 不同 | Input drift | commit、fixture 路径和换行 |
| 本地与容器不同 | Environment | Python、复制范围、权限、路径 |
| 输出含 Secret/私人路径 | Redaction/control | 原始输入、异常与序列化 |

一次只改变一个主要变量。修复后重跑原失败 case、该 case 的负例、全套 Runner、pytest、Ruff 和 Pyright；不要只重跑最容易绿的路径。

## 验证、停止与回滚

修改 Runner 或案例后至少运行：

```powershell
uv run --frozen --offline pytest
uv run --frozen --offline ruff check
npm run lab:pyright
npm run labs:all
npm run eval:validate
```

预期测试、lint、类型和六案例退出 0，eval 仍如实报告不完整示例矩阵。若 live adapter 被启用、命令尝试联网、正式 fixture 出现来源不明变化、负例被接受或输出含敏感数据，立即停止。

Runner 本身不写结果文件；发送 `Ctrl+C` 即可终止。误改时先用 `git diff -- scripts/run-labs.py lab/` 确认范围，只回退自己的候选。保留失败输出，不删除负例、不扩大 allowlist，也不覆盖旧公开结果。

## 检查题与下一步

1. 为什么要在案例逻辑执行前验证每个文件 hash？
2. `passed=true`、`negative_rejected=true` 和业务 output 各自证明什么？
3. `offline-contract-seam` 为什么不能证明第三方 framework 已接入？
4. 如果篡改 fixture 后仍执行成功，应该先检查哪一层？
5. Runner 确定性为什么仍然需要保存 commit、config 和环境？

完成失败练习后，依次进入[Coding](/labs/coding)、[浏览器](/labs/browser)、[研究](/labs/research)、[数据](/labs/data)、[文档](/labs/document)与[跨 Harness 迁移](/labs/migration)。
