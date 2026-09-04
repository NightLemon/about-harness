# Environment

## 起始身份

| 字段 | 实际值 | 证据 |
| --- | --- | --- |
| Date/timezone | 待填写 | 命令记录 |
| OS/architecture | 待填写 | 版本输出 |
| Repository/commit | 待填写 | `git rev-parse HEAD` |
| Dirty paths | 待填写 | `git status --short` |
| Node.js/Python/uv | 待填写 | 版本输出 |
| Lockfile/container | 待填写 | path + hash/digest |
| Network mode | `none`（Starter 默认） | Config |
| Operator/subject class | 待填写 | 不记录个人账号 ID |

## 数据与依赖

| 输入/依赖 | Version/commit/path | Hash/license | 来源与日期 | 允许用途 |
| --- | --- | --- | --- | --- |
| Fixture | 待填写 | 待填写 | 待填写 | 离线学习 |
| Harness implementation | 待填写 | 待填写 | 当前仓库 | E1 fake/replay |
| Model/Provider | `not-applicable` | 不适用 | 未调用 | E0 设计 |

## 停止条件

出现凭据请求、网络访问、个人路径进入输出、输入身份漂移、工作树中有来源不明改动，或命令影响 Task 外资源时停止。先记录现场，不清理他人的文件。
