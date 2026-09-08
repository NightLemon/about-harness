# Claude Code：从安装到受控本地任务

本页固定包 `@anthropic-ai/claude-code@2.1.263`。2026-09-08 已检查包身份并实际运行 --help；以下模型任务仍需用户自己的账号、明确型号与单独调用授权。[FACT:claude-cli-entry]

<span id="控制面心智模型"></span>
<span id="claude-md、rules-与-memory"></span>
<span id="claudemdrules-与-memory"></span>
<span id="settings-与-permission-分层"></span>
<span id="allow、ask、deny-怎么验证"></span>
<span id="allowaskdeny-怎么验证"></span>
<span id="allow"></span>
<span id="ask"></span>
<span id="deny"></span>
<span id="sandbox-network"></span>
<span id="hook-的正确位置"></span>
<span id="静态示例文件"></span>
<span id="运行静态验证"></span>
<span id="真实资格测试顺序"></span>
<span id="_2-context-资格"></span>
<span id="2-context-资格"></span>
<span id="_3-permission-资格"></span>
<span id="3-permission-资格"></span>
<span id="_4-sandbox-network"></span>
<span id="4-sandbox-network"></span>
<span id="_5-tool-hook"></span>
<span id="5-tool-hook"></span>
<span id="_6-resume-compaction"></span>
<span id="6-resume-compaction"></span>
<span id="_7-model-a-b"></span>
<span id="7-model-ab"></span>
<span id="模型适配卡"></span>
<span id="tool、mcp、plugin-与-subagent"></span>
<span id="toolmcpplugin-与-subagent"></span>
<span id="状态、恢复与外部副作用"></span>
<span id="状态恢复与外部副作用"></span>

<span id="在-claude-code-中适配指定模型"></span>

## 前置与安装

需要[统一工具链](/guide/prerequisites)中的 Node.js 22、Python 3.12、uv 0.11.16 和 Git。首次执行下载指定包；不会修改全局默认版本：

```bash
npm exec --yes --package=@anthropic-ai/claude-code@2.1.263 -- claude --help
```

预期帮助中包含本页使用的 model、工具或权限选项。选项不存在时停止并核对包版本，不替换为绕过权限的启动方式。

<span id="冻结运行身份"></span>
<span id="_1-版本与配置发现"></span>
<span id="1-版本与配置发现"></span>

## 配置与身份

先在 About Harness 仓库根目录准备本地输入；此步骤不启动产品或模型：

```bash
npm run product:prepare -- --product claude-code --output lab/results/local/claude-code-demo
cd lab/results/local/claude-code-demo
python -I -B verify.py
git status --short
```

预期准备命令退出 0，最后的测试命令退出 1，工作树干净。目录内包含 README.md、带末项缺陷的 solution.py、固定 verify.py 及产品指令/配置。已存在的目录不会被覆盖。后续产品命令都在这个练习目录执行。


[FACT:claude-memory] [FACT:claude-settings]

准备命令生成本例所需的指令和权限；仓库中的通用参考另见 `examples/harnesses/claude-code/` 中的 CLAUDE.md 与 .claude/settings.json。先记录 cwd、起始 commit、实际加载的指令和配置来源；把 MODEL_ID 替换为可核验型号。通过产品官方认证流程准备账号，凭据不写入示例或日志。

allow 规则控制自动批准，不表示其他资源技术上不可达。需要限制工具集合时使用 --tools；deny、ask、sandbox 和执行身份分别验证。共享设置不能证明最终有效设置，因为个人与 managed 配置也可能参与。

## 第一个只读任务

**以下命令启动真实模型，另行授权后再执行。** 在合成练习仓库中运行：

```bash
npm exec --yes --package=@anthropic-ai/claude-code@2.1.263 -- claude --model MODEL_ID --tools Read,Glob,Grep --permission-mode default --print "只读取 README.md 和 solution.py，报告路径与内容依据，不修改文件。"
```

预期返回可核对的文件引用；用 `git status --short` 确认未修改文件。权限不足、指令来源未知或实际模型无法定位时停止。

## 再做一次本地修改

初始失败已复现。记录 `git rev-parse HEAD` 与初始 diff，然后运行：

```bash
npm exec --yes --package=@anthropic-ai/claude-code@2.1.263 -- claude --model MODEL_ID --tools Read,Glob,Grep,Edit,Bash --permission-mode default "运行 python -I -B verify.py 复现失败，只修改 solution.py，再运行同一测试；不改依赖、不联网、不做远端操作。完成时报告实际命令和剩余问题。"
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

当前只有包与帮助入口的 E1 检查，没有真实模型运行、跨平台权限证明或产品质量结论。接口事实来源：[官方资料](https://code.claude.com/docs/en/permissions)；与本地版本不符时记录冲突，暂停相应步骤。
