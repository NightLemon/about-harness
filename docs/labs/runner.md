# 离线 Runner 与职责接缝

## 输入契约

`scripts/run-labs.py` 从固定目录加载 `manifest.json`、`input.json`、`expected.json`、`negative.json`。加载顺序先校验每个文件 SHA256，再计算整个 fixture hash；任何字节变化都会在执行前失败。输出包含 case ID、fixture hash、E1、offline、passed、安全状态与结构化结果。

## 为什么不直接安装四个 framework

这些实验验证职责映射和数据契约，不伪造 live 上游接入。`lab/src/about_harness/integrations/` 中四个模块把第三方 distribution/import 名、领域职责和 `offline-contract-seam` 模式写入边界对象；它们不导入外部包、不读凭据、不联网。真实接入必须在独立授权下增加包版本、adapter、网络、模型和 E2/E3 证据。

## 单案例命令

```powershell
uv run --frozen --offline python scripts/run-labs.py browser
```

预期结果只有一个 browser case，fixture hash 固定，`injection_refused=true`、`side_effects=0`。把参数换成 `coding`、`research`、`data`、`document`、`migration` 可运行其他案例。

## 失败练习

复制一个 fixture 到临时目录并修改 `input.json`，但不更新 manifest。新增的 `--fixtures-root` 只改变只读输入根目录，不绕过 manifest hash。

Windows PowerShell：

```powershell
$caseRoot = Join-Path $env:TEMP "about-harness-fixture-drill"
New-Item -ItemType Directory -Force $caseRoot | Out-Null
Copy-Item -Recurse lab/fixtures/coding (Join-Path $caseRoot "coding")
Set-Content -Encoding utf8 (Join-Path $caseRoot "coding/input.json") '{"tampered":true}'
uv run --frozen --offline python scripts/run-labs.py coding --fixtures-root $caseRoot
Remove-Item -Recurse -Force $caseRoot
```

macOS / Linux：

```bash
case_root="$(mktemp -d)"
cp -R lab/fixtures/coding "$case_root/coding"
printf '%s\n' '{"tampered":true}' > "$case_root/coding/input.json"
uv run --frozen --offline python scripts/run-labs.py coding --fixtures-root "$case_root"
rm -rf "$case_root"
```

运行命令必须以非零状态退出并在 stderr 包含 `hash mismatch`。删除的只能是刚创建的临时目录；不要在正式目录做练习，也不要把篡改后的文件提交。

## 清理、回滚与限制

Runner 不写文件。终止命令即可停止；按上面的平台命令删除已核对的临时目录。若代码改动导致失败，用最近 checkpoint 的精确 patch/revert 恢复，不删除失败证据。它不模拟第三方 package 的全部事件、异步、错误或部署行为。六案例的容器、本地 PowerShell 与 POSIX 入口见[实验环境](/labs/setup)。

下一步：[Coding](/labs/coding) → [浏览器](/labs/browser) → [研究](/labs/research)。
