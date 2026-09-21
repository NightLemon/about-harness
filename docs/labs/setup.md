# 实验环境与入口

本站分三层练习：最小固定契约、真实本地文件与浏览器、完整任务研究。它们默认使用离线数据；四个真实框架另有独立环境。

<span id="学习目标与证据边界"></span>
<span id="前置条件与固定版本"></span>
<span id="准备依赖"></span>
<span id="三条执行路径"></span>
<span id="单案例快速检查"></span>
<span id="本地完整案例与评测结构"></span>
<span id="windows-powershell"></span>
<span id="windowspowershell"></span>
<span id="macos-linux-posix-shell"></span>
<span id="macos-linuxposix-shell"></span>
<span id="隔离容器"></span>
<span id="如何读结果-而不是只看绿色"></span>
<span id="如何读结果而不是只看绿色"></span>
<span id="为什么只能是-e1"></span>
<span id="完成条件与下一步"></span>

<span id="实验环境与统一约定"></span>

## 前置与版本

需要 Node.js 22+、Python 3.12、uv 0.11.16 和 Git。历史复核记录（`maintenance/verification-results.json`，2026-09-08）使用 Node.js 22.23.2、Python 3.12.13；当前复现另记实际版本，依赖由锁文件固定。[环境准备](/guide/prerequisites)说明首次下载与离线运行的区别。

<span id="实验由四层组成"></span>

## 选择实验

| 入口 | 实际执行 | 核对重点 |
| --- | --- | --- |
| `npm run lab:smoke` | FakeAdapter 与最小循环 | 工具步骤、策略和完成验收 |
| `npm run study:demo` | 六任务 × 两配置的临时 Git 工作区、固定补丁、真实测试 | 完整 12 单元与产物关联 |
| `npm run labs:source` | Markdown/HTML/CSV 和 Playwright | 解析、计算、引用及观察更新 |
| `npm run labs:all` | 原有六个固定 JSON 契约 | 规范化 hash 与历史负例 |
| `npm run frameworks:check` | 四个实际框架运行时 | 工具回传、状态、恢复和终止 |
| `npm run model:probe` | Responses 模拟传输 | 串行调用、ID、用量与错误 |
| `npm run ecosystem:workshop` | 合成能力、工具与候选记录 | 授权不扩张、共享预算、选择失败与弃权边界 |

原六案例的命令和固定 hash 仍可复现。其历史输出中的品牌标签是旧映射字段，不能作为上游框架运行证据；新领域输出使用通用名称。

## 统一断言

命令退出 0 后，还要核对本例的业务条件：完整研究必须有 12 个唯一单元；研究材料保留 30/45 冲突和删除流程缺口；CSV 的两条已知分数合计 10；文档引用 v2 的具体块；浏览器刷新后旧观察失效。

运行器输出 `E1` 只说明离线执行范围。真实框架使用假模型仍是 E1，真实模型可用性探针才是 E2。

## 公开结果先制作副本，再扫描

```bash
npm run results:redact
```

名称中的 redact 不表示自动脱敏：该命令只扫描 `lab/results/public/` 中的 JSON、JSONL、Markdown 和 patch，拒绝已知敏感键、路径、凭据模式和不支持的文件类型；不会改写内容或生成安全副本。预期退出 0，但仍需人工核对来源与公开范围。失败时隔离原始产物，在受限位置制作最小化脱敏副本并复扫，不发布原文，也不排除整份文件来绕过检查。

## 容器与平台

Windows PowerShell 与 macOS/Linux 可逐行使用 npm 入口。现有容器保留原六个 JSON 实验：

```bash
docker compose build --pull=false labs-all
docker compose run --rm labs-all
```

容器固定 image digest，使用 `network_mode: none` 和只读文件系统。它不包含新增浏览器、框架和完整 Git 研究的全部依赖，不能替代宿主的完整验证。

<span id="失败注入与停止条件"></span>
<span id="常见失败归因"></span>
<span id="清理、回滚与记录模板"></span>
<span id="清理回滚与记录模板"></span>

## 失败、清理与回滚

缺依赖回到准备步骤；hash 不符先核对输入；负例未拒绝则停止采用结果。研究输出目录必须是新目录，避免覆盖证据。`Ctrl+C` 停止当前命令，`docker compose down --remove-orphans` 清理实验容器。

临时仓库和浏览器上下文自动释放；报告保留。源代码回退前检查精确 diff，只撤销自己的候选。实验不包含真实账号、模型费用或发布动作。
