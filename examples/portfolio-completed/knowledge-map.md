# 知识地图：集合边界任务

任务 demo-collection 要保留集合全部元素，包括末项。相同执行链用于其余五个任务：

```text
固定任务与配置 → 临时 Git 仓库 → HarnessRunner
                                   ↓
                              ReplayAdapter 提议
                                   ↓
                  权限与预算 → Workspace 读取/固定补丁/测试
                                   ↓
                    WorkspaceValidator 重读文件、diff、验证器
                                   ↓
                         独立测试 → Run/Trace/Result
                                   ↓
                         EvalRun → 完整矩阵与报告
```

模型替身拥有回放游标，控制器拥有步骤和终态，临时仓库拥有当前源码事实，验证器拥有业务验收决定。展示轨迹用于定位，不是供应方完整协议状态。配置选择预审补丁与请求预算，不能修改任务验收。

[任务](../../lab/results/public/study-demo/demo-collection-candidate/task.json)、[轨迹](../../lab/results/public/study-demo/demo-collection-candidate/trace.json) 与 [结果](../../lab/results/public/study-demo/demo-collection-candidate/result.json) 共同验证这张图。此路径不包含真实模型、远端仓库或持久分布式执行。
