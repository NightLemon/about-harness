# Round 08 未决项

- 开放 P0：0
- 开放 P1：0
- 开放 P2：0
- 开放 P3：0

R08-P1-01 已由 JSON/JSONL allowlist、逐值/逐行解析、敏感键规范化、符号链接/未知格式 fail-closed，以及 safe/leak/unsupported 三类 canary 修复。R08-P2-02 已由固定 Python 基础镜像 digest、workflow 顶层只读、deploy job 专属 Pages/OIDC 写权限和权限 scope/镜像 pin canary 修复。

本轮保持离线：本地 Docker 缓存没有 `python:3.12-slim@sha256:2c941…` 的 source ref，因此没有重复执行容器 build；该 digest 来自 Round 06 实际解析记录，本轮验证了 Dockerfile pin 和拒绝可变 tag 的门禁。远程 Actions、registry 签名/证明和 Pages deployment 仍未运行，它们需要 A4，不能被写成本轮本地证据。
