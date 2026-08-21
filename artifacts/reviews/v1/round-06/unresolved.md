# Round 06 未决项

- 开放 P0：0
- 开放 P1：0
- 开放 P2：0
- 开放 P3：0

R06-P2-01 已由 `--fixtures-root`、CLI 临时 fixture 回归测试、PowerShell/POSIX 失败命令和教程正反例门禁修复。R06-P2-02 已由容器复制 runner/fixtures、`labs-all` service 与实际 Docker build/run 修复；六案例在无运行时网络的容器中全部通过。

本轮只验证 Windows 主机上的本地路径和 Linux 容器。macOS/Linux 宿主命令使用同一 uv/npm/Docker 接口并通过静态结构门禁，但未在真实 macOS 宿主运行；该限制已保留为平台证据边界，不阻断容器基线与当前 E1 教程验收。
