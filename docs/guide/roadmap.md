# Harness 知识地图

这张图表示概念依赖。运行过程中的策略、观测和验收可以交错发生，图上的上下顺序不是固定的执行串行关系。[FACT:boundary-harness]

```text
任务与责任边界
  ├─ 上下文、指令、记忆 → 模型与适配器 → 动作提议
  ├─ 工具契约、权限、人工批准 → 实际执行
  └─ 状态、轨迹、回执 → 恢复与独立验收
                         ↓
                 实验 → 评测 → 选择与迁移
```

<span id="先看依赖-而不是看目录"></span>
<span id="先看依赖而不是看目录"></span>
<span id="一、对象与责任边界"></span>
<span id="一对象与责任边界"></span>
<span id="二、一次运行如何成立"></span>
<span id="二一次运行如何成立"></span>
<span id="三、可靠执行与人工控制"></span>
<span id="三可靠执行与人工控制"></span>
<span id="四、指定模型适配"></span>
<span id="四指定模型适配"></span>
<span id="五、harness、framework-与领域模式"></span>
<span id="五harnessframework-与领域模式"></span>
<span id="六、实验与评测"></span>
<span id="六实验与评测"></span>
<span id="七、安全、事实与维护"></span>
<span id="七安全事实与维护"></span>
<span id="四条可独立完成的学习路径"></span>
<span id="路径-a-先理解一次运行"></span>
<span id="路径-a先理解一次运行"></span>
<span id="路径-b-适配一个指定模型"></span>
<span id="路径-b适配一个指定模型"></span>
<span id="路径-c-修复一个失败任务"></span>
<span id="路径-c修复一个失败任务"></span>
<span id="路径-d-迁移-harness"></span>
<span id="路径-d迁移-harness"></span>
<span id="五个学习检查点"></span>
<span id="按症状查漏"></span>
<span id="三种内容不要混读"></span>
<span id="完成检查"></span>

<span id="harness-完整知识地图"></span>

## 运行机制

| 概念 | 主要问题 | 入口 |
| --- | --- | --- |
| 定义与架构 | 模型、Harness、执行环境各负责什么 | [定义](/foundations/what-is-harness)、[架构](/foundations/architecture) |
| 循环与推理 | 何时继续、验证、重试或停止 | [循环](/foundations/agent-loop)、[推理](/foundations/reasoning) |
| 上下文与指令 | 此刻看什么、规则怎样生效 | [上下文](/foundations/context)、[指令](/foundations/instructions) |
| 记忆 | 哪些信息跨任务保留、何时失效 | [生命周期与实验](/foundations/memory) |
| 工具与协议 | 动作和结果如何准确传递 | [工具](/foundations/tools)、[协议](/foundations/protocols) |
| 状态与观测 | 如何恢复并定位第一处分歧 | [可靠执行](/foundations/state-reliability)、[可观测性](/foundations/observability) |
| 多智能体与人工 | 谁拥有结果、预算和授权 | [编排](/foundations/multi-agent)、[人工控制](/foundations/human-control) |
| 安全 | 不可信内容能触达什么能力 | [安全原理](/foundations/security)、[威胁模型](/security/threat-model) |

## 从机制到具体系统

[Python 实现](/implementation/minimal-harness-python)展示单循环；[框架对照](/frameworks/comparison)展示四种编排入口；[Harness 对照](/harnesses/comparison)展示产品配置。三者分别是代码实现、开发框架和工作产品。

[模型适配](/models/adaptation)依赖[协议资格](/models/protocol-compatibility)，配置优化依赖[实验设计](/optimization/experiment)与[评测指标](/evaluation/metrics)。

## 领域分支

[编码](/domains/coding)关注仓库和测试；[浏览器](/domains/browser)关注页面观察与动作；[研究](/domains/research)关注来源与主张；[数据](/domains/data)关注单位、缺失值与计算；[文档](/domains/document)关注解析、版本和引用。

这些分支共用运行机制，各自需要不同的业务验证器。学习顺序见[学习路径](/guide/start)，最终产物见[作品集](/guide/portfolio)。
