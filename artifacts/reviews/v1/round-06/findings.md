# Round 06 修改前 Findings

- Round：06
- Baseline：`a4b8486`
- Baseline tag：`review-v1-round-06-baseline`
- Rubric：六个教程、容器和跨平台复现
- 记录时间：2026-08-21 12:03 +08:00
- 状态：已在任何 round-06 修正前冻结

## R06-P2-01：教程声明可做临时 fixture 篡改练习，但 runner 根目录硬编码，命令不可执行

- 严重性：P2
- 位置：`docs/labs/runner.md`、`scripts/run-labs.py`、六个案例页
- 复现：`runner.md` 要求把 fixture 复制到临时目录、修改 `input.json` 并观察 `hash mismatch`；但 `scripts/run-labs.py` 只接受 case 参数并把根目录固定为仓库内 `lab/fixtures`，没有参数能指向临时副本。读者只能改正式 fixture，和文档的安全要求冲突。
- 影响：失败教程不能按文档复现，读者可能污染基线 fixture 或只相信伪输出。六页只有 `powershell` 围栏，也没有给 POSIX 与容器等价入口，跨平台回退不可验证。
- 根因：测试直接调用 `load_fixture(tmp_path, ...)`，但 CLI 没暴露相同 seam；教程完成条件没有机器检查。
- 修正要求：增加显式 `--fixtures-root` 并限制路径语义；提供 PowerShell/POSIX 的临时目录失败命令与清理；六页链接统一运行矩阵；新增 CLI 正反例和教程结构门禁。

## R06-P2-02：容器只包含最小 harness smoke，无法运行文档承诺的六案例

- 严重性：P2
- 位置：`Dockerfile`、`compose.yaml`、`.devcontainer/devcontainer.json`、`docs/labs/setup.md`
- 复现：Dockerfile 只复制 `lab/src`、`lab/schemas` 和 `scripts/lab-smoke.py`，没有复制 `lab/fixtures` 或 `scripts/run-labs.py`；Compose 也只有 `lab-smoke` service。因此 `docker compose run --rm ...` 无法运行六个案例，和 setup 页“容器基线及本地回退”目标不一致。
- 环境证据：Docker/Compose 可用，但本机没有预载 `python:3.12-slim`；修改前只验证了 `docker compose config`，没有六案例容器日志。
- 影响：无本地 uv 的读者只能跑最小 smoke，不能完成六教程；文档可能把未运行的容器路径写成已验证。
- 根因：M3 最小容器没有在 M5/M6 随六案例扩展，且缺少 Dockerfile/Compose 内容门禁。
- 修正要求：容器复制 runner 与 fixtures，增加 `labs-all` service，保持 non-root/read-only/no-network/cap-drop；文档区分首次构建所需 base image 与运行时离线；实际构建并运行，或在无法获取 base image 时明确记录未验证并不得宣告完成。

## 计数判断

两个 P2 共同阻断教程的“命令可执行、失败可复现、容器与平台回退可验证”完成条件。修正需要 CLI、测试、容器、教程和防回归脚本共同变化，满足实质 review 门槛；评测统计与安全攻击不在本轮重复审查。
