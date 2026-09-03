# 前置知识与环境

## 这页解决什么问题

开始学习前，不需要先成为模型研究员或平台工程师，但要能区分“环境没有准备好”和“Harness 设计有缺陷”。完成本页后，你应能：

- 选择只阅读、构建站点、运行离线 Lab 或完整贡献所需的最小环境；
- 核对实际版本、锁文件和离线边界；
- 用分层命令定位安装、构建、fixture、类型或浏览器问题；
- 准备一个不含真实凭据与私人数据的练习任务；
- 在失败时停止、保存证据并恢复到已知状态。

## 适合谁

读者应能使用 Git 与命令行，读懂 Python 或 TypeScript 的基础控制流，并理解大语言模型会生成概率性输出。无需训练模型、管理 GPU，也无需预先掌握某个 agent framework（Agent 框架）。

如果下面术语陌生，可以边做边补：

| 术语 | 开始实验前至少理解 |
| --- | --- |
| worktree（工作树） | 当前文件不等于 commit；未提交改动会影响复现 |
| lockfile（锁文件） | 固定依赖解析，不证明依赖本身安全或运行正确 |
| fixture（固定样例） | 可重复输入及预期结果，不是真实线上流量 |
| schema（结构契约） | 约束字段、类型和范围，不证明业务结论正确 |
| exit code（退出码） | `0` 表示命令按自己的规则成功，不等于任务质量合格 |
| evidence level（证据等级） | E0 设计、E1 离线、E2 真实探针、E3 代表性重复实验 |

## 按目标选择环境

不要一开始安装所有工具。先选择你今天要完成的目标：

| 目标 | 必需环境 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| 阅读已发布站点 | 浏览器 | 能访问学习材料 | 本地构建、代码与实验可运行 |
| 本地预览文档 | Node.js 22+、npm | VitePress 内容可构建和浏览 | Python Lab 或真实模型可用 |
| 运行离线 Lab | Python 3.11+、`uv 0.11.16` | 固定 fixture 与控制契约可重复 | 第三方框架、Provider 或模型质量 |
| 完整贡献验证 | Node、Python、uv、Playwright Chromium | 仓库静态、离线和视觉检查通过 | 线上 API、费用或产品体验 |
| 容器 smoke | Docker Compose 或 devcontainer | 最小流程在隔离容器运行 | 宿主机工具链与完整站点通过 |

项目容器使用固定 Python 3.12 image digest，以非 root 用户运行，并设置 `network_mode: none`、只读文件系统和移除 Linux capabilities。它是离线基线，不是完整开发环境，也不是所有生产安全控制的替代品。

## 版本与锁定方式

仓库当前基线来自实际配置文件：

```text
Node.js       >= 22       package.json
VitePress     1.6.4       package.json/package-lock.json
TypeScript    5.9.3       package.json/package-lock.json
Python        >= 3.11     pyproject.toml
uv            0.11.16     项目文档与 CI 基线
Python deps   uv.lock     冻结解析
Container     Python 3.12 Dockerfile 中固定 image digest
```

先从仓库根目录记录实际环境：

```powershell
node --version
npm --version
python --version
uv --version
git status --short --branch
```

预期 Node 主版本不低于 22、Python 不低于 3.11、uv 显示 `0.11.16`，Git 输出能明确当前分支和已有修改。版本不满足时先停止，不要靠删除 lockfile 或把 engine check 关掉继续。

如果使用 Docker，再运行：

```powershell
docker version
docker compose version
```

只需要阅读或本地预览时，不必为了“环境齐全”安装 Python 或 Docker。

## 首次准备与离线边界

依赖还未进入本机 cache（缓存）时，`npm ci` 和 `uv sync --frozen` 可能访问依赖源。这个阶段是受控的依赖获取，不是离线实验；记录网络环境、命令和锁文件 commit。

```powershell
npm ci
uv sync --frozen
```

依赖准备完成后，离线 Python 命令使用：

```powershell
uv sync --frozen --offline
uv run --frozen --offline python scripts/run-labs.py all
```

`--frozen` 禁止重新解析锁文件，`--offline` 禁止缺包时临时联网。若第二条因 cache 不完整失败，回到依赖准备阶段解决；不要移除 `--offline` 后仍把结果记录为 E1 离线证据。

容器镜像若尚不存在，首次 build 也可能需要获取固定基础镜像。镜像就绪后再用无网络服务运行：

```powershell
docker compose build --pull=false lab-smoke
docker compose run --rm lab-smoke
```

预期 smoke 输出结构化结果并以 `0` 退出。`--pull=false` 避免主动更新，但不能让本机凭空拥有缺失的基础镜像。

## 从快到慢验证

环境问题按层定位，比直接运行全部检查更容易解释：

```powershell
# 1. 文档结构与内部链接
npm run docs:check

# 2. 单个离线案例
uv run --frozen --offline python scripts/run-labs.py coding

# 3. 完整离线案例和内容构建
npm run check

# 4. 站点、视觉、类型、负例和仓库策略
npm run verify
```

断言不只看退出码：单案例应有 `evidence=E1`、`offline=true`、`passed=true` 和 fixture hash；`npm run check` 应完成站点 build、六个 Lab、TypeScript runtime 负例和 eval 校验；`verify` 才覆盖更完整的类型、lint、视觉和策略检查。

如果目标只是修改 Markdown，仓库要求至少运行：

```powershell
npm run check
npm run facts:check
npm run pages:check
```

这些命令都不调用真实模型，也不能支持“某模型适合本项目”的结论。

## 准备练习工作负载

好的入门任务不是“让 Agent 随便改好项目”，而是一份可判定的 Task（任务契约）：

```text
Input: 合成或已授权数据、固定 commit/fixture
Goal: 一个可以由测试或 schema 判定的结果
Allowed: 明确的读取、编辑、工具与路径
Forbidden: 网络、凭据、范围外文件和不可逆动作
Acceptance: 正例、失败例、diff/输出边界
Budget: steps、tool calls、time；费用保持 0
Stop: 权限不明、输入漂移、测试不可复现时停止
Rollback: 恢复候选改动，保留失败记录
```

例如从 Coding Lab 的固定字符串处理开始，比直接操作私人仓库更适合学习 loop、工具与 validator 的关系。

## 凭据、隐私与费用

离线教程不需要任何 API key。不要把凭据写入命令历史、`.env` 示例、fixture、trace、截图或 Git；不要用私人仓库内容、真实客户数据和未经许可的网页抓取结果练习。

真实 API、费用、账号和外部写操作属于另一条 E2/E3 路径，必须单独冻结 provider、model、surface、预算、数据边界和停止条件。没有这些条件时，所有 live adapter 保持禁用。

## 常见失败与定位顺序

| 症状 | 先检查 | 不要立即做 |
| --- | --- | --- |
| `npm ci` 失败 | Node 版本、lockfile、registry/cache、完整错误 | 删除 `package-lock.json` |
| `uv ... --offline` 缺包 | uv 版本、`uv.lock`、cache 是否准备 | 去掉 `--frozen` 后称为同一实验 |
| 文档 build 失败 | 首个报错文件、内部链接、VitePress 配置 | 重装全部工具链 |
| Fixture hash 不符 | 工作树 diff、manifest 与输入字节 | 更新 hash 掩盖未知改动 |
| 单案例过、全套失败 | 共享状态、生成物、案例顺序与资源 | 只提交单案例结果 |
| 容器无法启动 | image 是否存在、Docker daemon、架构 | 把宿主机成功当容器证据 |
| 视觉检查失败 | viewport、字体、首个截图差异 | 提高容差直到通过 |

保存操作系统、工具版本、当前 commit、命令、完整退出码和最小失败输出。先复现最小层，再扩大检查范围。

## 清理与回滚

依赖目录和 cache 都是可再生物，但不要在未知工作树上用广泛删除命令。先用 `git status --short` 区分源码修改与忽略生成物。

- 停止 dev server：在其终端发送 `Ctrl+C`；
- 清理 Compose 容器：`docker compose down --remove-orphans`；
- 回滚教程候选：只恢复自己明确修改的文件或精确 commit；
- 锁文件意外变化：先检查 diff 和命令来源，不要无条件覆盖他人修改；
- 工具版本不兼容：切回记录过的版本，再重跑最小验证。

失败证据、命令和版本记录应保留；不要为了得到绿色结果而改 fixture、删除负例或放宽安全边界。

## 概念自检与完成条件

开始[学习路径](/guide/start)前，尝试回答：

1. 为什么 lockfile 固定解析，却不能证明依赖安全？
2. `--offline` 缺包失败时，为什么不能悄悄联网后继续标 E1？
3. Fixture、schema、退出码和业务 acceptance 分别证明什么？
4. 容器 `network_mode: none` 与“代码没有网络调用”有什么区别？
5. 哪些现象说明应该停止实验，而不是继续调 prompt？

当你能运行目标所需的最小检查，解释输出和证据等级，保留一个可恢复的失败样例，并准备好无私人数据的 Task，就完成了前置准备。下一步进入[实验环境](/labs/setup)建立第一条 E1 记录。
