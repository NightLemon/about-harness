# 端到端案例：从补丁到实际研究报告

这是一条已经实现的离线执行链。固定候选经过真实 Git 工作区和 Python 测试，结果自动形成研究记录；读者可以从报告回到任一失败，而不依赖纸面数字。

<span id="案例性质与学习目标"></span>
<span id="场景与不可变约束"></span>
<span id="开始前建立证据目录"></span>
<span id="阶段-0-写决策问题"></span>
<span id="阶段-0写决策问题"></span>
<span id="阶段-1-确认身份与协议"></span>
<span id="阶段-1确认身份与协议"></span>
<span id="身份不是模型自报"></span>
<span id="先运行资格探针"></span>
<span id="阶段-2-冻结工程基线"></span>
<span id="阶段-2冻结工程基线"></span>
<span id="项目指令只写仓库知识"></span>
<span id="按阶段暴露工具"></span>
<span id="task-先于-prompt"></span>
<span id="阶段-3-跑小探针形成假设"></span>
<span id="阶段-3跑小探针形成假设"></span>
<span id="阶段-4-设计配对实验"></span>
<span id="阶段-4设计配对实验"></span>
<span id="任务与重复"></span>
<span id="development-与-holdout"></span>
<span id="预注册晋级条件"></span>
<span id="样本单位"></span>
<span id="阶段-6-读轨迹-避免错误归因"></span>
<span id="阶段-6读轨迹避免错误归因"></span>
<span id="阶段-7-形成受限路由"></span>
<span id="阶段-7形成受限路由"></span>
<span id="阶段-9-固化外循环"></span>
<span id="阶段-9固化外循环"></span>
<span id="复核清单"></span>
<span id="检查题与下一步"></span>

<span id="端到端模型适配案例-从资格探针到受限晋级"></span>

## 准备与运行

使用[统一工具链](/guide/prerequisites)：Node.js 22+、Python 3.12、uv 0.11.16 和 Git。输入为六个编码任务及 `examples/study/config.json`。

```bash
npm run study:demo
```

运行后打开命令给出的 `report.md`。预期研究是 `study-v1.2`、`study_kind=learning`，六任务 × 两配置 × 一次运行，共 12 个完整单元；开发与留出各三任务。固定候选六项通过，基线六项失败。

## 跟踪集合边界任务

1. 初始实现 `value[:-1]` 丢掉最后一项；固定测试先在初始仓库失败。
2. ReplayAdapter 提出读取、应用预审补丁、运行测试三个动作。
3. Policy（策略） 限制工具名称；工作区工具进一步限制文件和补丁身份。
4. 基线补丁保留原缺陷，候选改为 `list(value)`；Git 实际检查并应用 diff。
5. 测试工具执行 `python -I -B verify.py`，返回逐项断言和源码 hash。
6. 完成提议中的 `tests_passed=true` 不参与验收。WorkspaceValidator 重新读取当前文件、检查测试脚本与变更范围，再独立执行测试。
7. 候选 completed；基线被退回验收，并在调用预算内停止。两条结果均保存。

## 配置和记录如何关联

```text
Task + 原始输入 hash + 实际配置
  → 临时 Git 仓库与 base commit
  → HarnessRunner / ReplayAdapter / 工作区工具
  → 独立测试与 Result / Trace
  → EvalRun 的产物引用
  → 完整矩阵 / 失败对照 / 报告
```

配置中的 `variant` 选择实际补丁，`max_model_calls` 限制实际调用。每个单元独立创建仓库，不继承上一单元的修改。报告中的时间来自运行计时，模型用量为离线零费用，不是手填成绩。

<span id="阶段-5-先验证数据完整性"></span>
<span id="阶段-5先验证数据完整性"></span>
<span id="在当前仓库验证方法骨架"></span>
<span id="常见失败与处置"></span>

## 验证结果与失败

```bash
npm run study:check
```

检查完整矩阵和产物 hash，并拒绝伪造完成、坏产物、重复单元、已有目录覆盖与配置漂移。可以降低副本中的调用预算，验证候选在补丁或验收前停止；不要修改默认数据来迎合结果。

当前决定是保留通过独立测试的固定候选作为这些任务的回归基线。学习研究不触发真实模型配置晋级，`promotion_eligible=false` 与“研究已完整执行”并不矛盾。

<span id="阶段-8-shadow、晋级与回退"></span>
<span id="阶段-8shadow晋级与回退"></span>
<span id="清理、回滚与证据边界"></span>
<span id="清理回滚与证据边界"></span>

## 清理、回退与边界

临时仓库自动删除，报告和失败记录保留；已有输出目录不能覆盖。失败后恢复自己的配置或实现，使用新目录重跑。没有真实模型或远端写入。

这条 E1 证明执行与验收贯通，不证明模型会生成这些补丁。任意模型代码执行需要另建隔离设计；可选真实模型入口先只提供计算工具，见[Responses 接入](/models/openai)。已填写作品集见[综合项目](/guide/capstone)。
