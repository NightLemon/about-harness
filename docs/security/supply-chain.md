# 扩展与供应链安全

Agent 扩展、MCP server、CLI、browser、container image、Python/npm dependency 和 GitHub Action 都可能执行代码或读取数据。安装一个“方便的工具”实际是在扩大信任边界；即使 Agent 从未主动调用它，安装脚本、构建插件或 CI Action 也可能先执行。

## 学习目标与边界

读完本页，你应能画出一个候选依赖从发现、下载、安装、构建、运行、更新到卸载的完整路径，区分“字节被锁定”和“代码值得信任”，并为引入、升级与紧急回退设计可验证步骤。

本页关注来源、制品和执行链。扩展暴露哪些 Tool、Hook 或 MCP 能力，见[扩展机制](/implementation/extensions)；不可信内容怎样借工具越权，见[Prompt Injection](/security/prompt-injection)；已经观察到异常时转到[事件响应](/security/incident-response)。

## 从攻击链而不是包名开始

供应链风险可以发生在生命周期任一段：

| 阶段 | 典型失败 | 需要的证据 |
| --- | --- | --- |
| 发现 | 同名/近似名包、过期教程、伪造 marketplace 页面 | 官方入口、维护仓库、包坐标 |
| 获取 | 滚动 tag 被改写、下载镜像不同、传输被替换 | 版本、commit、digest、registry 与时间 |
| 安装 | `postinstall`、native binary 或 bootstrap 脚本执行 | lifecycle scripts、文件/进程/网络差异 |
| 构建 | bundler plugin、文档插件或生成器读取环境与源码 | 构建命令、输入范围、沙箱和产物清单 |
| 运行 | 扩展读取过宽、外发数据、动态下载代码 | capability、路径、域名、审计事件 |
| 更新 | 权限、工具 schema、依赖或维护者悄然变化 | 前后 manifest、依赖图与行为 diff |
| 发布 | Secret、私有路径、恶意链接或未许可内容进入产物 | 脱敏、许可、链接和公开产物检查 |
| 卸载 | 配置、credential、缓存、后台进程仍残留 | 资源清单、撤销步骤和恢复测试 |

风险对象不是一个包名，而是一条 trust graph（信任图）：直接依赖连接传递依赖、安装脚本、预编译二进制、镜像层、托管服务和更新渠道。审查只覆盖直接 README，会遗漏真正执行的节点。

## 引入清单

先写“为什么需要它”和“不引入时的最小替代”。没有具体缺口，就没有理由扩大信任边界。接入前至少记录：

- 来源与 maintainer、官方仓库/registry、固定版本/commit/digest；
- license、传递依赖、native binary、安装和构建脚本；
- 进程、文件、环境变量、credential、网络域与数据用途；
- 暴露的工具/schema、默认启用状态、timeout 和并发；
- 更新渠道、签名或 checksum、advisory 入口与维护状态；
- owner、复审日期、禁用/卸载步骤、替代方案与已知良好版本。

Marketplace 热度、下载量和“官方风格”不是来源证明；滚动分支、floating tag 与 `latest` 也不是可复现身份。一个可审阅的候选记录可以这样写：

```yaml
candidate: docs-search-mcp
purpose: 只读检索公开、固定版本的产品文档
source:
  repository: <official-repository-url>
  commit: <full-commit>
artifact:
  digest: sha256:<digest>
  license: <reviewed-license>
execution:
  install_scripts: []
  read_paths: [fixtures/public-docs]
  write_paths: []
  network_domains: []
  credentials: []
rollback:
  disable: remove server registration
  known_good: <previous-config-commit>
owner: repository-maintainer
review_after: 2026-12-01
```

这只是 E0 审查对象，不是“已经安全”。字段必须来自实际 manifest、lockfile、脚本和运行观测；不能复制候选 README 的自我声明后直接通过。

## 六步引入流程

1. **界定需求**：写清功能、数据、用户和不采用方案；先判断现有工具能否满足。
2. **冻结身份**：保存来源、完整 commit/digest、包坐标、license 与依赖图。
3. **静态审查**：检查入口、lifecycle scripts、二进制下载、动态执行、默认网络和更新逻辑。
4. **隔离试运行**：在无 Secret、只读输入、禁网或 allowlist 网络环境运行正例与负例，记录实际文件、进程和域名。
5. **有限采用**：默认禁用或只给最小用户/目录开放，监测工具/schema、延迟、错误和副作用。
6. **晋级或退出**：证据满足验收才扩大范围；来源、权限或行为不符则禁用、撤销 credential、恢复已知良好版本。

静态审查不能代替试运行，试运行也不能证明未来更新安全。每一次版本变化都创建新的审查对象。

## 锁定与更新

Node/Python 使用 lock；容器基础镜像保留可读 tag 并固定 `sha256` digest；Actions 固定完整 SHA。自动更新只提出 diff，不能自行合并或发布；经过干净构建、测试、许可、Secret、权限范围和行为差异检查后再采用。

Lockfile 主要回答解析到了哪些版本及其完整性信息。它不能证明 maintainer 身份、源码与制品对应、安装脚本无害、license 适用或已知漏洞不可达。Hash/checksum 证明拿到的是预期字节，不证明这些字节安全；签名证明某个密钥认可制品，还要验证密钥归属、信任根、撤销和构建来源。

审查依赖图时至少区分：

- 直接依赖与传递依赖；
- 纯源码包、native addon 与预编译 binary；
- 安装期、构建期、测试期和运行期依赖；
- 当前平台实际选择的 optional dependency；
- registry tarball、Git dependency、下载脚本和容器层；
- 开发工具的本机风险与部署产物的线上风险。

“production dependencies 为 0”不代表贡献者机器没有攻击面；纯静态站点也会在安装和构建阶段执行开发依赖。

## 安装脚本与构建环境

先在一次性 checkout/container 中用禁用 lifecycle script 的方式观察依赖图，再决定是否允许必要脚本。不要在包含真实 credential、SSH agent、浏览器 profile 或私人仓库的环境首次运行未知安装器。若依赖确实需要脚本，记录脚本入口、下载域、写入路径、子进程、产物 hash 和失败清理。

构建环境遵循四个默认值：

1. 输入只挂载当前项目与明确 fixture；
2. Secret 默认为空，网络默认为关闭或最小域名 allowlist；
3. 缓存按 lock/config hash 分区，不让不可信 PR 写入受信发布缓存；
4. 产物从空目录生成，并与允许清单比较文件类型、路径、大小和外链。

生成物不是天然可信。Source map、搜索索引、错误页、打包日志和 metadata 都可能泄漏个人路径、环境变量或私人文本；发布前应扫描最终目录，而不只是源码。

```bash
npm run licenses:check
npm run workflows:check
npm run verify
```

`workflows:check` 拒绝可变镜像、非完整 Action SHA、顶层写权限，以及 deploy job 之外的 Pages/OIDC 权限。未知或自定义许可默认阻断，直到人工确认再分发义务。

这些检查只覆盖本仓库定义的确定性策略。它们不验证第三方 maintainer 是否可信、SHA 对应源码是否经过可复现构建，也不替代 advisory 研判。

## CI Action、容器与发布身份

CI 同时拥有源码、缓存和发布通道，第三方 Action 应像可执行依赖一样审查。人类可读 tag 放在注释中，真正引用固定完整 commit；workflow 顶层保持只读，只有独立 deploy job 获得 Pages/OIDC 所需写权限。来自不可信分支的代码不能在持有发布 credential 的上下文执行。

对 Action 更新，比较的不只是 `uses:` 一行：查看 commit 间源码、入口文件、runtime、依赖、权限和网络变化。Composite Action 中每个 shell step 都是执行面；JavaScript Action 的打包文件也需要与源码/发布过程对账。

容器 tag 用于人读，digest 用于机器锁定。审查基础镜像、架构、用户、入口、包管理器缓存、证书和复制进去的文件；默认以非 root 运行，限制 mount、capability、网络和临时目录。固定 digest 后仍需主动更新：不漂移意味着可复现，也意味着安全修复不会自动进入。

发布身份与构建身份分开。普通测试 job 不应持有部署权限；deploy 只消费已经验证的确定产物。若发布平台重新构建源码，需要把平台 builder、配置和依赖解析也加入信任图，不能只审查本地构建。

## 站点构建链

VitePress 是开发与构建依赖，GitHub Pages 只托管生成的静态文件，不运行 Node server。这缩小了线上攻击面，却没有消除贡献者本机的安装脚本、开发服务器和构建插件风险。

- 开发服务器只绑定 loopback，不用 `--host 0.0.0.0` 暴露；
- 不把 dev/preview server 当生产服务；
- 保留 lockfile，升级后重新构建并运行完整验证；
- `npm audit --omit=dev` 只覆盖 production 依赖，完整且具有新鲜 advisory 数据的 audit 才能评估开发工具；
- 离线 audit 的“0 条”不能消除因缓存过期产生的不确定性。

若站点增加服务端运行时、用户输入或在线编辑器，必须重新威胁建模，不能沿用纯静态站点结论。

当前构建链风险登记如下。2026-09-03 使用在线 `npm audit` 复核时，完整开发依赖图报告 1 个 high、2 个 moderate；这不是生产站点漏洞数，也不能替代对每条 advisory 的适用性分析。负责人按季度复核；退出条件满足后才升级，并运行完整站点、链接与视觉验证。

| 风险 | 影响边界 | 负责人 | 最近复核 | 下次复核 | 升级条件 |
| --- | --- | --- | --- | --- | --- |
| VitePress 1.6.4 间接使用 Vite 5.4.21 与 esbuild 0.21.5；前者命中 Windows 路径绕过范围 [FACT:vite-dev-server-advisory]，后者命中跨站读取开发服务器响应的范围 [FACT:esbuild-dev-server-advisory] | 贡献者本机 dev/preview；已部署的纯静态文件不运行这些服务器 | repository maintainer | 2026-09-03 | 2026-12-03 | 上游发布不再命中这些范围的兼容版本，且 `npm run verify` 与 `npm run pages:check` 通过 |

## Advisory 怎样转成决定

Scanner 命中只是调查入口。每条 advisory 都记录：受影响范围、当前解析版本、实际调用路径、攻击前置条件、资产/影响、是否存在修复、升级兼容性、临时控制、owner 和复核日期。常见结论只有四种：

| 结论 | 需要的依据 | 后续动作 |
| --- | --- | --- |
| 立即升级 | 可达且影响不可接受，有兼容修复 | 单变量升级、完整验证、灰度与回退 |
| 临时缓解 | 可达但暂无兼容修复 | 关闭暴露面、隔离环境、设短复核期 |
| 当前不可达 | 受影响代码不在当前构建/运行路径 | 保存调用链证据，版本/架构变化时重评 |
| 信息不足 | 版本、利用条件或环境无法确认 | 保持限制，不把未知写成无风险 |

Severity 是输入，不是自动结论。一个开发服务器漏洞对静态 Pages 运行时可能不可达，却仍影响贡献者本机；反过来，低等级的数据泄漏若触及高价值 Secret，也可能需要立即处置。`npm audit`、OS scanner 和容器 scanner 的数据库、范围与刷新时间不同，报告中要注明工具版本和查询时间。

## 扩展专项

Skill 会引导模型使用工具；hook、extension、plugin 可直接执行；MCP server 可暴露工具与数据。逐项限制发现、启用、输入、权限、输出和 timeout。外部内容始终是不可信数据，不因来自工具而成为高优先级指令。

首次启用前保存 capability snapshot（能力快照）：工具名、description、输入 schema、annotations、资源 URI、prompt、启动命令、环境变量、网络域和版本。升级后做语义 diff；新增写工具、扩大路径、宽化 schema、改变默认 timeout 或引入动态资源，都需要重新批准采用范围。

MCP 协议连通不等于 server 可信。Host 仍负责进程隔离、资源级授权、调用前 policy、输出脱敏和取消。一个标为“只读”的工具若接受任意 URL，也可能造成数据外发或访问内部服务；审查实际参数和网络策略，不依赖工具名称。

Skill/Prompt 文件本身通常不能直接扩大系统权限，但会影响 Agent 选择和参数。它引用的脚本、CLI、模板与远程内容都要进入同一信任图。Hook 则在特定事件自动运行，应额外限制递归触发、超时和失败策略，避免“Agent 修改—Hook 重写—Agent 再修改”的循环。

更完整的 manifest 与 schema diff 方法见[扩展机制](/implementation/extensions)。

## 失败与恢复

保留上一锁文件、镜像 digest、配置、capability snapshot 与验证结果。升级造成行为、许可或权限异常时，用精确 revert 恢复相关文件，不强制更新所有依赖。禁用扩展后核心 loop、checkpoint 和结果读取仍应工作；否则需保留版本化 adapter 或迁移器。

发现异常时先停止传播：禁用候选、暂停相关 workflow/发布入口、撤销它能访问的短期 credential，并保留进程、网络、文件和构建产物证据。不要先重新安装或清缓存，因为那会覆盖首次状态。若怀疑发布制品被污染，从已知良好 commit、干净 runner 和新缓存重新构建，再比较 hash 与内容；不能把“重新构建成功”当作旧产物未受影响。

Rollback（回退）恢复技术版本，remediation（处置）还要处理已经发生的影响：轮换 Secret、撤回发布、删除污染缓存、通知受影响方、修复更新通道并增加能复现根因的负例。完整顺序见[事件响应](/security/incident-response)。

## 工作例：评估一个只读 MCP Server

假设候选声称只搜索公开文档，不在本仓库安装它。先把目标写成：输入查询，返回带来源的公开文本；不读取工作区、环境变量或 credential，不访问声明域名外网络，不提供写工具。

### 评估输入

- 固定仓库 commit、发布制品 digest、license 与依赖图；
- 启动命令和所有 lifecycle/build 脚本；
- 工具/resource/prompt schema 快照；
- 允许域名、文件 mount、环境变量和 timeout；
- 正例查询、外域 URL、路径逃逸、超长输入和注入文本负例；
- 禁用、卸载、撤销 credential 和恢复配置步骤。

### 隔离试运行

在一次性环境中不提供 Secret，只挂载合成只读 fixture，并先禁网启动。枚举能力后，再只开放声明的公开文档域。记录实际 DNS/连接、子进程、文件读写、退出码和输出大小。不要因为 server 启动成功就给主仓库权限。

### 断言与停止

正例只返回允许来源；负例不产生外域连接、仓库读取或持久写入。Schema 与声明不一致、启动时下载额外 binary、请求 credential、退出后残留进程，或负例产生副作用时立即停止采用，保存证据并恢复原配置。

该案例最多形成对固定候选/环境的 E1 隔离证据，不证明未来版本、其他平台或处理私人数据时安全。

## 在本项目验证现有门禁

### 前置条件与输入

在仓库根目录执行；要求 Node.js 22+、Python 3.11+、锁定依赖已安装。命令读取 `package-lock.json`、`uv.lock`、Dockerfile、GitHub workflows、许可策略与临时负例；不配置 API key，不调用真实 Agent/MCP server。

### 命令

```powershell
npm run licenses:check
npm run workflows:check
npm run secrets:check
npm run repo:self-test
```

### 预期输出与断言

- 许可检查确认 Node/Python 锁定依赖都有已审阅策略；
- workflow 检查确认 Action 固定完整 SHA、权限分层、Pages deploy 独立且容器镜像不可漂移；
- Secret 扫描不发现 credential、私人路径或禁止的环境文件；
- `repo:self-test` 在临时目录证明未固定 Action、可变镜像、过宽权限、未批准许可和合成 token 会被拒绝；
- 四条外层命令退出码均为 0，负例自测通过表示坏输入被成功拒绝。

### 失败、清理与回退

若任一正例检查失败，保留首个 stderr，按许可、workflow、镜像或 Secret 分类；不要删除 lockfile、放宽允许列表或改负例来获得绿色。若 self-test 让坏输入通过，停止依赖/发布变更，先修对应 checker。

这些命令只创建并自动删除系统临时目录，可能留下可忽略测试缓存。误改时先运行 `git diff -- package.json package-lock.json pyproject.toml uv.lock Dockerfile .github scripts docs/security/supply-chain.md`，只恢复本轮修改；不要重置整个工作树。

### 当前证据边界

验证结果是 E1：证明固定负例下本仓库 checker 的部分策略会执行。它不扫描依赖源码、不联网查询最新 advisory、不验证签名/构建来源，也不证明第三方 Action、包或镜像没有恶意。因此检查全绿仍需人工来源审查、隔离运行和持续复核。

## 审核清单

- 能否画出从来源到发布产物的完整信任图，而不只列直接依赖？
- 每个可执行节点的身份、license、脚本、权限、网络和 owner 是否明确？
- Lock、digest、checksum 与签名分别证明什么，又不能证明什么？
- 首次安装是否发生在无 Secret、最小 mount 和受限网络环境？
- 更新是否比较依赖、capability、权限和行为，而不只看版本号？
- Advisory 是否记录 reachability、影响、缓解、退出条件和复核日期？
- 禁用后核心流程能否运行，回退是否同时处理 credential、缓存与已发布产物？
- 自动检查的证据边界是否明确，没有把绿色结果写成“供应链安全”？

下一步：[Prompt Injection](/security/prompt-injection)说明不可信内容如何借工具扩大影响，[扩展机制](/implementation/extensions)提供 manifest/schema diff 模板，[事件响应](/security/incident-response)说明异常后的处置顺序。
