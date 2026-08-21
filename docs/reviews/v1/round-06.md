# V1 Review Round 06：教程、容器与跨平台复现

## 结论

本轮基于 `review-v1-round-06-baseline` 修复两个 P2：教程要求的临时 fixture 篡改练习没有 CLI 入口；容器只能运行最小 smoke，不能运行六个案例。两者共同使“失败可复现、容器与本地回退可执行”的教程完成条件不成立。

## 修改前证据

- Baseline：`a4b8486b5fc0c8507af4b99cabb562cd64a11254`
- Findings commit：`9990845`
- Findings：`R06-P2-01`、`R06-P2-02`
- 详细复现：`artifacts/reviews/v1/round-06/findings.md`

## 修正

- 为 runner 增加只读 `--fixtures-root`，并用临时副本验证正常运行和 hash 篡改拒绝。
- 给失败练习提供 PowerShell 与 POSIX 的完整创建、运行、断言和清理命令。
- Docker image 复制六个 fixtures 与 runner；Compose 新增保持 non-root/read-only/no-network/cap-drop 的 `labs-all` service。
- 六个案例统一链接容器、Windows 和 macOS/Linux 运行矩阵。
- 新增 `tutorial:check` 与 `tutorial:self-test`，防止 CLI、容器和平台路径再次缺失。

## 验证与边界

`tutorial:check`、`tutorial:self-test`、目标 pytest、Ruff、`docker compose config` 和完整 `npm run verify` 通过；Python 回归增至 34 项。实际 Docker build 固定 `python:3.12-slim@sha256:2c941e…a63c4a`，`docker compose run --rm labs-all` 的六案例全部返回 `E1/offline/passed`。内容结果 commit 为 `3c3d0cf`。没有调用真实模型/API、产生费用或执行 Git 远程/发布操作。
