# 前置知识与环境

阅读需要理解基本函数、JSON 和命令退出码。运行实验还需要 Git、Node.js 22+、Python 3.12 与 uv；不需要模型账号或显卡。

<span id="这页解决什么问题"></span>
<span id="适合谁"></span>
<span id="按目标选择环境"></span>
<span id="版本与锁定方式"></span>
<span id="首次准备与离线边界"></span>
<span id="准备练习工作负载"></span>
<span id="凭据、隐私与费用"></span>
<span id="凭据隐私与费用"></span>
<span id="清理与回滚"></span>
<span id="概念自检与完成条件"></span>

## 固定工具链

本轮复核环境为 Node.js 22.23.2、Python 3.12.13、uv 0.11.16。Node 项目最低版本仍为 22，Python 库最低版本仍为 3.11；框架示例固定使用 Python 3.12。

```bash
node --version
python --version
uv --version
git --version
git status --short
```

依赖解析分别由根目录和各框架示例的锁文件固定。版本与计划不符或工作树存在不明改动时，先确定基线，不删除锁文件或其他人的改动。

## 首次准备

以下步骤会获取依赖，属于环境准备：

```bash
npm ci
uv sync --frozen --python 3.12
npx playwright install chromium
```

Linux 构建机需要 Chromium 系统依赖时使用 `npx playwright install --with-deps chromium`。框架示例另行准备：

```bash
npm run frameworks:prepare
```

准备完成后，实验使用 `uv run --frozen --offline`，缺包时明确失败，不临时更换版本。

<span id="从快到慢验证"></span>

## 选择验证入口

| 目标 | 命令 | 预期 |
| --- | --- | --- |
| 运行核心循环 | `npm run lab:smoke` | completed，1 个工具步骤，Result 1.1 |
| 运行完整研究 | `npm run study:demo` | 12 个实际单元和报告 |
| 原始材料与本地浏览器 | `npm run labs:source` | 文件解析、计算、引用与页面动作通过 |
| 真实框架的离线示例 | `npm run frameworks:check` | 四个运行时及错误产物负例通过 |
| 全仓验证 | `npm run verify` | 核心、框架、文档与站点检查通过 |

<span id="常见失败与定位顺序"></span>

## 失败与恢复

先记录命令、版本和首个错误，按安装、输入、运行、验收分类。缺缓存回到准备步骤；输入 hash 改变则核对修改来源；已有结果目录更换新目录，保留旧证据。

`Ctrl+C` 停止当前命令。实验只清理自己创建的临时仓库、浏览器上下文和进程；输出报告由用户保留。源码修改用限定 `git diff` 审核后精确撤销。

## 边界

离线实验和假模型运行提供 E1 工程证据。框架能运行不代表真实模型已接入；真实 API、费用、远端写入与发布需要单独授权。
