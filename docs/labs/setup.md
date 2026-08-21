# 实验环境与统一约定

## 学习目标与证据边界

完成本页后，你能在无网络、无凭据环境运行六个固定案例，并解释为什么这些结果只能标为 E1。案例要求 Python 3.11+、uv 0.11、Node.js 22+ 和锁定的 TypeScript 5.9 依赖；CI 与发布自动化以 Node.js 22 为最低发布基线，单次实验仍须记录实际 Node 版本。真实模型、Browser Use、LangGraph、PydanticAI 与 LlamaIndex 都不会被导入或调用。

## 前置条件与输入

- 已安装 Node、npm 与 uv；依赖已按 `uv.lock`、`package-lock.json` 固定；
- 从仓库根目录执行；
- 输入位于 `lab/fixtures/<case>/`，每个 manifest 固定 source、license、日期和三个文件 hash；
- `lab/configs/default.json` 与 `engineering.json` 都声明 `model_id=offline-replay`、`live_enabled=false`、`network=none`。

## 命令

以下三条路径执行相同的冻结输入。容器首次构建若本机没有 `python:3.12-slim`，需要先在允许联网的受控环境获取并记录 image digest；镜像就绪后，案例运行保持 `network_mode: none`。不要把“能拉取基础镜像”算作离线案例证据。

### 容器基线（Windows、macOS、Linux 一致）

```shell
docker compose build --pull=false labs-all
docker compose run --rm labs-all
```

### Windows（PowerShell）

```powershell
uv sync --frozen --offline
npm run labs:all
npm run eval:validate
npm run results:redact
```

### macOS / Linux（POSIX shell）

```bash
uv sync --frozen --offline
npm run labs:all
npm run eval:validate
npm run results:redact
```

预期：六个 case 的 `passed` 都是 `true`，总结果为 `evidence=E1`、`offline=true`；study 报告 20 个任务、6 类 workload、6 个 holdout、3 次重复；公开结果脱敏检查通过。

## 断言、失败与停止

不要只看退出码。还要断言 fixture hash 与 manifest 一致、browser 没有外部副作用、research 保留冲突、data 不暴露邮箱、document 只引用最新版本、migration 没逐字复制配置。若 uv 尝试联网、hash 不匹配、结果出现 secret/private path、或任何案例声称 E2/E3，立即停止，不用修改 fixture 来“让它通过”。

## 清理、回滚与限制

命令只读 fixture，输出到终端；`docker compose down --remove-orphans` 清理容器，删除 `.pytest_cache/` 等忽略缓存即可清理本地路径。若修改案例，先恢复对应 manifest 与三个固定文件，再重跑全套；不要覆盖旧公开结果，应产生新版本。当前结果只证明 runner、契约与安全负例可复现，不证明第三方 framework、harness 或模型质量。

下一步阅读[离线 Runner](/labs/runner)，或直接进入[Coding 案例](/labs/coding)。
