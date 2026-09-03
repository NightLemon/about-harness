# 扩展机制：Tool、CLI、Skill、Hook、Plugin 与 MCP

扩展首先改变 trust boundary（信任边界），其次才增加能力。一个扩展能被发现，不表示它可信；参数满足 schema，不表示本次调用已获授权；一次调用成功，也不表示它适合自动运行。

设计扩展时，把稳定机制与具体产品名称分开。不同产品可能把相似能力称为 tool、command、skill、hook、plugin、extension 或 MCP server。迁移时不要逐字复制配置，而要重新确认：谁发现能力、谁加载代码、谁授权、谁执行、谁记录，以及谁能停止它。

## 先选最小的能力层

| 机制 | 主要解决的问题 | 谁执行 | 适合 | 不适合承担 |
| --- | --- | --- | --- | --- |
| Tool（工具） | 给模型一个收窄参数的确定性动作 | Harness 的工具运行时 | 查询、校验、写入、提交等单一动作 | 长篇知识、隐式全局策略 |
| CLI（命令行接口） | 给人和自动化共享可复现入口 | 受控子进程或操作者 | 本地构建、检查、批处理 | 直接暴露任意 shell 字符串 |
| Skill（技能） | 按需加载领域知识与操作流程 | Harness 加载说明，模型依说明决策 | 教程、工作流、工具组合方法 | 强制安全边界、秘密存储 |
| Hook（生命周期钩子） | 在固定事件前后强制检查或补充动作 | Harness 控制器 | 审计、格式检查、阻止危险提交 | 开放式推理、无限递归调用 |
| Plugin/Extension（插件/扩展） | 加载代码、UI、事件处理或成套能力 | 宿主进程、隔离进程或浏览器 | 深度集成、分发与复用 | 默认可信的任意代码执行 |
| MCP server | 通过协议提供跨进程资源、提示或工具 | Host 通过 client 连接 server | 多宿主共享能力、进程隔离 | 自动授权、来源背书、安全沙箱 |

优先选择能满足需求的最小层。只需要“校验一个 JSON 文件”时，参数固定的 CLI 或 tool 通常足够；只有需要自动发现、跨项目分发、UI 或生命周期事件时，才上升到 plugin。MCP（Model Context Protocol，模型上下文协议）解决 host/client/server 之间的能力发现与消息交换，不自动授予工具权限。[FACT:mcp-spec]

机制可以组合，但责任不能糊在一起。例如 skill 可以解释何时调用一个 tool，hook 可以在 tool 执行前检查策略，MCP server 可以提供这个 tool；最终是否允许执行，仍应由 host 的 Task、policy 和当前主体共同决定。

## 扩展的完整生命周期

不要把“安装成功”当作完成。可审计的扩展至少经历以下状态：

```text
候选来源
  ↓ 识别身份、固定版本、验证签名或 hash
已获取但未信任
  ↓ 审查 manifest、代码、权限、网络与数据流
已信任但未启用
  ↓ 为具体项目/Task 授予最小 scope
已启用
  ↓ 注册能力、比较 schema、运行负例
可调用
  ↓ trace + budget + policy + result
运行中
  ↓ 禁用 / 回退 / 卸载 / 隔离历史记录
已停止
```

每个箭头都应有显式操作和失败状态。自动发现目录可以展示候选项，但不应越过“信任”和“启用”；更新后的版本也不能继承旧版本的批准，因为代码、依赖、权限或 schema 可能已经变化。

### 1. 发现与获取

记录规范化来源、不可变版本、内容 hash、获取时间和获取者。Git 仓库优先固定 commit，包优先固定确切版本与 lockfile；只记录分支名、`latest` 或下载页面不足以重建输入。

来源本身也是攻击面。搜索结果、README、包描述和扩展返回的安装指令都是不可信内容。不要让候选扩展自行决定安装路径、审批范围或要读取的 credential。

### 2. 信任审查

在执行任何扩展代码前回答：

- 是否加载到宿主进程；能否读取宿主内存、环境变量和其他插件状态？
- 能读取或写入哪些路径、仓库、账户与远端对象？
- 是否联网，域名、协议、请求字段和数据保留策略是什么？
- Secret 由谁注入，扩展能否回显、持久化或转交它？
- 有哪些直接依赖、安装脚本、原生模块和动态下载？
- timeout、取消、并发、输出上限与费用上限是什么？
- 失败后是否可能产生 partial（部分完成）或 unknown outcome（结果未知）？

审查结论绑定具体内容身份，而不是只绑定显示名称。同名扩展、换维护者或更换分发源，都要重新评估。

### 3. 启用与注册

启用应有明确 scope，例如“这个仓库只读”“本次 Task 可调用 `schema_check` 三次”，而不是“用户曾经同意过这个扩展”。注册时冻结实际暴露给模型的名称、说明、schema、权限、版本和错误分类，写入 run config 或 trace。

能力冲突必须停止并要求消歧：两个扩展不能静默覆盖同名 tool；skill 不能通过相同名称替换项目规则；hook 顺序不能依赖文件系统偶然排序。建议使用稳定 namespace，例如 `docs.schema_check@1`，并单独保存面向模型的短名称映射。

### 4. 调用与观测

每次调用记录 `task_id`、`run_id`、扩展身份、能力版本、输入摘要、策略决定、预算、开始/结束时间、结果状态和副作用身份。敏感输入只保存脱敏摘要或受控 artifact 引用。

结果应区分 validation、permission、timeout、transient failure、partial、conflict 和 unknown outcome。写操作 timeout 后不能因为“没有成功响应”就直接重试；先用幂等键或查询接口对账，再决定补偿或停止。

### 5. 禁用、卸载与恢复

禁用表示新调用被拒绝；卸载表示代码和注册信息被移除；撤销权限表示现有进程也失去访问能力。这三者不是同一个动作。长运行任务还要处理在途调用、子进程、网络请求和已发出的远端写入。

核心 loop、checkpoint 和结果读取不应依赖可选扩展始终存在。若历史 trace 只能由旧扩展解释，保留只读 adapter 或迁移器，不要为了卸载而破坏审计记录。

## 用 manifest 固定审查对象

Manifest（清单）是审计输入，不是安全证明。一个最小示意如下：

```yaml
id: local.docs.schema-check
version: 1.2.0
source:
  repository: https://example.invalid/learning/schema-check
  commit: 0123456789abcdef0123456789abcdef01234567
runtime:
  isolation: subprocess
  entrypoint: ["node", "dist/cli.mjs"]
capabilities:
  - name: docs.schema_check
    schema_version: 2
    effect: read
permissions:
  paths:
    read: ["docs/**/*.md"]
    write: []
  network: []
limits:
  timeout_ms: 10000
  max_output_bytes: 65536
  max_calls_per_task: 3
rollback:
  previous_version: 1.1.4
  preserves_trace_readers: true
```

这只是项目建议，不是某个产品的通用格式。真实实现还需 schema 校验和交叉字段校验，例如 `effect: read` 与非空写路径矛盾时必须拒绝；`network: []` 要在运行时落实为无网络，而不是只写在文件里。

不要把 Secret 值放进 manifest。只记录所需 Secret 的逻辑名称、注入方和用途；运行时按 Task 注入最小范围，并确保日志和错误不会回显。

## Schema diff 是升级门禁

扩展更新不能只比较版本号。注册前对旧版与新版能力做结构化 diff：

- tool 名称、参数类型、必填字段、默认值和未知字段策略；
- 读写 effect、scope、权限、网络与费用；
- timeout、重试、幂等、分页和输出上限；
- 错误分类、结果状态和 artifact 格式；
- hook 事件、优先级、fail mode 与可重入性；
- checkpoint、trace reader 和迁移兼容性。

新增可选描述通常风险较低；新增写权限、放宽路径、把 enum 改为任意字符串、改变默认目标或把失败关闭改为失败开放，都应视为需要重新批准的 breaking change（破坏性变化）。

历史 run 必须保存当时实际注册的 schema hash。只保存扩展当前版本，会让旧 trace 在升级后被错误解释。

## 权限与数据流要分别建模

“只读工具”可能把私有文件发送到网络，“本地插件”也可能经依赖遥测出站。因此权限表还不够，要画清数据从哪里来、经过谁、到哪里去：

| 数据 | 来源 | 允许的处理者 | 允许去向 | 日志策略 |
| --- | --- | --- | --- | --- |
| 公开 Markdown | 仓库 `docs/` | 本地 schema tool | 进程内结果 | 保存路径与错误行 |
| 未发布草稿 | 工作树 | 本地只读 extension | 不出站 | 只存 hash 与分类 |
| API credential | 受控 Secret store | 指定 transport | 固定 provider endpoint | 永不记录值 |
| Tool output | 外部系统 | Harness 与模型上下文 | 当前 run | 截断、脱敏并标不可信 |

模型看到工具说明并不获得工具权限；扩展拿到 credential 也不获得任意数据出站权限。Policy 应同时检查主体、动作、对象、数据分类、目标和预算。

## Hook：小代码也可能改变全局语义

Hook 常运行在关键路径，风险不取决于代码行数。每个 hook 应声明：

- 触发事件，例如 `before_tool`、`after_tool`、`before_commit`；
- 顺序与优先级，多个 hook 的冲突处理；
- fail-closed（失败关闭）还是 fail-open（失败开放）；
- timeout 后是否取消主动作；
- 是否能修改输入、结果或终态；
- 是否允许重入，以及最大递归深度；
- 副作用、幂等键和审计字段。

安全、权限和发布类 hook 通常应失败关闭；非关键的遥测 hook 可以失败开放，但要记录丢失。不要让 `after_tool` 再触发同一个 tool 而没有递归 guard，也不要让 hook 在 deadline 后把失败任务改成 completed。

Hook 修改输入时保存 before/after 摘要与修改者身份。静默“修好”参数会让 trace 无法解释模型原本请求了什么，也可能绕过原审批。

## MCP：协议边界之外仍由 Host 负责

在 MCP 组合中，host 承载用户和 Task 的信任决定，client 维护与 server 的协议连接，server 提供资源、提示或工具。一个 host 可以连接多个 server，一个 server 也可能被不同 host 使用；因此权限不能假定由对端统一处理。

Host 至少负责：

- 是否连接此 server，以及向当前 Task 暴露哪些能力；
- 校验 server 返回的名称、schema、内容类型和结果上限；
- 在调用前执行本地 policy、审批、预算和数据出站检查；
- 把 server 输出视为不可信数据，防止 prompt injection（提示注入）；
- timeout、取消、重连、能力列表漂移和 server 身份变化；
- trace 中关联 host、client、server、capability 与实际调用版本。

Server 声称“只读”不是 host 的安全证明；连接走本地进程也不表示无网络。反过来，host 的拒绝也不能被 server 通过另一个 tool 或动态重命名绕过。能力列表更新时先 diff、再批准，不能在活动 run 中静默扩权。

## Plugin/Extension：把代码加载风险单独处理

Plugin 往往比 tool 拥有更宽的宿主能力：它可能加载到同一进程、注册事件、修改 UI、读写配置、启动子进程或安装其他依赖。应明确采用哪种隔离：同进程、受限子进程、容器、浏览器 sandbox，或只读静态资源。

同进程扩展通常无法靠一份权限声明实现强隔离；这时声明只是审计信息，真正边界依赖操作系统身份、进程隔离和网络控制。对来源不明或需要广泛权限的扩展，合适决定可能是拒绝安装，或改造成收窄的 CLI/tool。

分发流程还要覆盖包名抢注、维护者转移、签名/校验和、lockfile、构建产物与源码是否一致、撤回版本和安全公告。具体检查见[供应链安全](/security/supply-chain)。

## 升级、迁移与回退

可靠升级采用并行兼容，而不是原地覆盖：

1. 固定旧版扩展、schema 和 trace reader；
2. 获取新版但保持禁用，完成来源与权限审查；
3. 对 manifest、依赖、能力和 schema 做 diff；
4. 用离线正例和负例运行 shadow test（影子测试）；
5. 新 Task 小范围启用，新旧版本使用不同能力身份；
6. 验证结果、权限拒绝、timeout、卸载和历史 trace 读取；
7. 达到验收条件后切换默认版本，保留明确回退窗口；
8. 先停止旧写入，确认没有在途副作用，再决定是否移除旧代码。

转换历史 artifact 时保留 source hash、target hash、转换器版本和无法转换的记录。无法无损迁移就 quarantine（隔离）并继续用旧 reader 只读，不要伪造完整的新格式。

回退不等于把代码版本号降回去。还要恢复注册表、schema、配置、权限、依赖和数据格式；若新版已经产生外部写入，需对账或补偿，不能假装它们不存在。

## 工作例：为 Markdown 校验选择扩展层

需求是“对当前仓库的 Markdown 和事实引用做本地校验”。最小方案是复用项目已有 CLI：

```powershell
npm run check
npm run facts:check
npm run pages:check
```

不需要安装能修改 agent loop 的 plugin，也不需要把本地 shell 完整暴露成 tool。如果多个 harness 都需要这项能力，可以再包一层参数固定的 tool：输入只允许检查范围和严格模式，执行命令由注册表决定，工作目录固定为仓库根目录，输出限长且不联网。

如果希望模型理解“何时运行三项检查、如何读错误、失败时怎样回退”，增加一个 skill 即可；skill 不能代替 tool 的参数校验和进程权限。如果组织要求每次提交前强制检查，可在明确 timeout 和失败语义后增加 `before_commit` hook，但仍要保留人类可直接运行的 CLI 入口。

只有当需要跨编辑器分发、配置 UI 和生命周期管理时，才评估 plugin；只有多个 host 需要经协议调用同一隔离服务时，才评估 MCP server。层数越多，越要保存每层身份与失败分类。

## 在本项目验证文档门禁

### 前置条件与固定输入

需要 Node.js 22+，依赖由 `package-lock.json` 固定；从仓库根目录运行。输入是当前工作树的 Markdown、站点配置和事实注册表。不配置真实 API、credential、MCP server 或外部扩展，不产生费用。

### 命令、预期输出与断言

```powershell
npm ci --ignore-scripts
npm run check
npm run facts:check
npm run pages:check
```

在已有 `node_modules` 与 lockfile 未变化时可跳过 `npm ci`。三项检查应退出 0：内部链接和页面结构有效；所有事实引用标记都能解析到事实注册表；VitePress 页面能够构建。任何一项非 0 都表示当前候选不能提交。

### 失败、停止、清理与回退

若 `npm ci` 需要联网而当前环境不允许，立即停止安装，不切换 registry、不移除 lockfile，也不改用未固定版本；保留已有依赖或在获准的联网环境重试。若检查失败，只修与本轮页面相关的错误，不批量改写其他文件。

这些命令最多生成可忽略的构建或缓存目录；按项目现有忽略规则保留即可。回退本页时先运行 `git diff -- docs/implementation/extensions.md` 精确检查，再只恢复本轮修改；不要使用会覆盖整个工作树的命令。

### 证据边界

检查通过只提供 E1：当前本地文档、引用与静态站点接缝有效。它不执行真实 tool、hook、plugin 或 MCP server，也不证明 manifest 权限已经由操作系统强制实施。真实扩展兼容最多先按 E2 探针记录；目标 workload 的质量、成本与可靠性仍需单独 E3 评测。

## 常见失败与定位顺序

| 症状 | 先检查 | 安全动作 |
| --- | --- | --- |
| 扩展输出淹没上下文 | schema、分页、截断和 artifact 引用 | 限制字段与字节数，不让模型自行总结无限输出 |
| 更新后权限扩大 | manifest/schema/依赖 diff | 禁用新版，回到已固定版本并重新审批 |
| 两个 tool 同名 | namespace 与注册顺序 | 停止注册，不按加载顺序覆盖 |
| Hook 卡住所有任务 | timeout、fail mode、递归深度 | 进入无 hook 安全模式，保留审计事件 |
| 写调用 timeout | 幂等键、远端状态查询 | 先对账，不直接重放 |
| 停用后旧 trace 无法读取 | reader 与 schema 版本 | 恢复只读 adapter 或执行可审计迁移 |
| MCP server 动态增加能力 | capability snapshot 与 diff | 新能力保持未授权，等待显式批准 |
| “本地”扩展仍然出站 | 依赖、遥测、DNS/网络策略 | 阻断网络并把声明与实际行为记为冲突 |

定位顺序从身份与版本开始，再看注册 schema、policy 决定、运行时 trace、外部副作用和结果映射。不要先让模型“换一种调用方式”；那可能绕过原本的拒绝。

## 审核清单

- 是否选择了满足需求的最小扩展层？
- 来源、不可变版本、内容 hash 和依赖是否可重建？
- 信任、安装、启用、注册和调用是否为不同状态？
- Manifest 的权限声明是否由真实隔离与 policy 落实？
- Tool/schema 合法与本次执行授权是否明确分离？
- Hook 是否声明顺序、timeout、fail mode 和递归防护？
- MCP host 是否继续承担本地授权、数据出站和结果校验？
- 更新是否比较 schema、权限、依赖、数据格式和历史 reader？
- 禁用、卸载、撤权、在途取消和外部补偿是否分别设计？
- 是否测试“不安装、不信任、不联网、无 Secret”的退化路径？
- Trace 是否保存实际扩展身份、schema hash、策略决定和副作用状态？
- 证据是否明确区分 E1 离线接缝、E2 真实兼容与 E3 任务质量？

下一步先用[工具设计](/foundations/tools)收窄 action 与结果契约，再用[指令层](/foundations/instructions)确定 skill 的适用范围、用[供应链清单](/security/supply-chain)审计来源。涉及跨进程能力时，对照[模型与工具协议](/foundations/protocols)和[Adapter 契约](/implementation/adapter-contract)设计能力快照、错误映射与停止路径。

## 检查题

1. 为什么“已发现”“已安装”“已信任”和“本次可调用”不能合并成一个布尔值？
2. 一个 skill 为什么不能替代 tool 的运行时权限检查？
3. MCP server 声称工具只读时，host 仍需验证哪些边界？
4. Hook 失败开放和失败关闭分别适合什么场景？
5. 扩展回退为何还要处理 schema、历史 trace 和已经产生的外部副作用？
