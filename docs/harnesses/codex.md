# Codex：从安装到受控本地任务

本页固定包 `@openai/codex@0.153.4`。2026-09-08 已检查包身份并实际运行 --help；以下模型任务仍需用户自己的账号、明确型号与单独调用授权。[FACT:codex-cli-entry]

<span id="控制面心智模型"></span>
<span id="agents-md-项目知识-不是权限边界"></span>
<span id="agentsmd项目知识不是权限边界"></span>
<span id="sandbox、approval-与-network-分开验证"></span>
<span id="sandboxapproval-与-network-分开验证"></span>
<span id="sandbox"></span>
<span id="approval"></span>
<span id="network"></span>
<span id="静态示例的文件职责"></span>
<span id="输入与安全基线"></span>
<span id="运行静态验证"></span>
<span id="真实资格测试的最小顺序"></span>
<span id="_1-config-discovery"></span>
<span id="1-config-discovery"></span>
<span id="_2-read-only-smoke"></span>
<span id="2-read-only-smoke"></span>
<span id="_3-policy-probes"></span>
<span id="3-policy-probes"></span>
<span id="_4-local-reversible-edit"></span>
<span id="4-local-reversible-edit"></span>
<span id="_5-resume-cancel"></span>
<span id="5-resumecancel"></span>
<span id="_6-model-comparison"></span>
<span id="6-model-comparison"></span>
<span id="模型适配卡"></span>
<span id="工具、mcp、skill-与-subagent"></span>
<span id="工具mcpskill-与-subagent"></span>
<span id="状态、恢复与-git"></span>
<span id="状态恢复与-git"></span>

<span id="在-codex-中适配指定模型"></span>

## 前置与安装

需要[统一工具链](/guide/prerequisites)中的 Node.js 22、Python 3.12、uv 0.11.16 和 Git。首次执行下载指定包；不会修改全局默认版本：

```bash
npm exec --yes --package=@openai/codex@0.153.4 -- codex --help
```

预期帮助中包含本页使用的 model、工具或权限选项。选项不存在时停止并核对包版本，不替换为绕过权限的启动方式。

<span id="先冻结一次运行身份"></span>
<span id="配置层-显式记录最终有效值"></span>
<span id="配置层显式记录最终有效值"></span>

## 配置与身份

先在 About Harness 仓库根目录准备本地输入；此步骤不启动产品或模型：

```bash
npm run product:prepare -- --product codex --output lab/results/local/codex-demo
cd lab/results/local/codex-demo
python -I -B verify.py
git status --short
```

预期准备命令退出 0，最后的测试命令退出 1，工作树干净。目录内包含 README.md、带末项缺陷的 solution.py、固定 verify.py 及产品指令/配置。已存在的目录不会被覆盖。后续产品命令都在这个练习目录执行。


官方配置、安全与 AGENTS 文档于 2026-09-21 复核；这是 E0 来源核验，与 2026-09-08 固定包帮助入口的 E1 记录分开。[FACT:codex-agents-md] [FACT:codex-config] [FACT:codex-sandbox-approval]

准备命令生成本例所需的指令和权限；仓库中的通用参考另见 `examples/harnesses/codex/` 中的 AGENTS.md 与 .codex/config.toml。先记录 cwd、起始 commit、实际加载的指令和配置来源；把 MODEL_ID 替换为可核验型号。通过产品官方认证流程准备账号，凭据不写入示例或日志。

sandbox_mode 控制执行范围，approval_policy 控制询问。workspace-write 不是“只能读取工作区”；它通常限制可写范围，不默认禁止读取工作区外文件。按有效配置分别验证允许读取、受保护路径写入拒绝和网络；只有额外配置读取隔离时，才把范围外读取失败作为断言。探针使用合成文件，不读取真实私人数据。

当前官方文档还提供 permission profile（权限配置档），由 `default_permissions` 与 `permissions.<name>` 选择文件系统和网络策略；它不替代独立的 `approval_policy`。旧 `untrusted` approval 模式已退役，也不同于项目 trust。[FACT:codex-permission-profiles] [FACT:codex-retired-approval] 本页固定包命令保留已经核对的选项；不要假定滚动文档中的新配置都适用于该版本。记录目标 surface 的有效 profile、approval 和 managed restrictions，冲突时先停止核对。

`AGENTS.md` 是项目指令，不是强制权限。工具授权在 handler 前核对，操作系统沙箱的拒绝可能发生在进程执行时，应分别记录拦截层。Git worktree 只隔离工作树；文件读取、进程与网络仍需实际执行环境控制。

## 第一个只读任务

**以下命令启动真实模型，另行授权后再执行。** 在合成练习仓库中运行：

```bash
npm exec --yes --package=@openai/codex@0.153.4 -- codex --model MODEL_ID --sandbox read-only --ask-for-approval on-request "只读取 README.md 和 solution.py，报告路径与内容依据，不修改文件。"
```

预期返回可核对的文件引用；用 `git status --short` 确认未修改文件。权限不足、指令来源未知或实际模型无法定位时停止。

## 再做一次本地修改

初始失败已复现。记录 `git rev-parse HEAD` 与初始 diff，然后运行：

```bash
npm exec --yes --package=@openai/codex@0.153.4 -- codex --model MODEL_ID --sandbox workspace-write --ask-for-approval on-request "运行 python -I -B verify.py 复现失败，只修改 solution.py，再运行同一测试；不改依赖、不联网、不做远端操作。完成时报告实际命令和剩余问题。"
```

完成后手动运行 `python -I -B verify.py`、`git diff -- solution.py` 与 `git status --short`。预期测试退出 0、所有集合边界案例通过，diff 仅含 solution.py。这里的自然语言范围是任务要求；高风险能力还需前述执行层控制。最终验收由你或独立测试读取实际文件，不能只接受模型总结。

<span id="失败归因"></span>

<span id="失败清理与回滚"></span>

## 失败、清理与回滚

拒绝操作后确认文件 hash 不变；工具超时后核对进程与实际状态，不立即重复写入。结束会话，检查未跟踪文件和本轮生成物；只撤销自己的练习补丁或配置提交，个人会话与设置不随 Git 自动恢复。

停止产品会话后，在这个由本轮准备的新练习仓库中复核 diff，再用 `git restore -- solution.py` 撤销自己的候选；测试应重新退出 1。返回 About Harness 仓库根目录后，共享示例可用 `npm run examples:check` 静态检查，但静态通过不证明产品权限生效。运行时再分别测试允许、拒绝与询问，保留结果。

<span id="来源与证据边界"></span>
<span id="已知限制与检查题"></span>

## 已知限制与来源

当前只有包与帮助入口的 E1 检查，没有真实模型运行、跨平台权限证明或产品质量结论。接口事实来源：[官方资料](https://learn.chatgpt.com/docs/config-file/config-basic)；与本地版本不符时记录冲突，暂停相应步骤。
