# 评测报告与公开结果

## 最小报告

报告写明 workload、任务抽样、模型/provider/adapter/harness、版本、surface、指令/config/fixture hash、重复、split、矩阵缺口、失败处理、指标、区间、安全、token/费用、排除项与证据等级。Development 与 holdout 必须分开；矩阵不完整、证据低于目标或存在安全违规时明确 `promotion_eligible=false`。结论句必须带边界，例如“在这 20 个锁定任务和预算内”。

## 公开前门禁

```powershell
npm run results:redact
npm run eval:validate
npm run eval:summary
```

`lab/results/public/` 只放聚合结果与精选合成/脱敏 trace。禁止 `raw_trace`、原始 prompt、credential、authorization、secret、私人路径、真实账号和未授权源代码。机器扫描后仍需人工抽查。

## 如何表达不确定

- 样本不足：结论不足；
- 配置改善但区间支持明显退化：不晋级；
- 质量提高但安全回退：否决；
- 成本/延迟超预算：保持旧默认或只在深度路由使用；
- 只有 E1：只能声明流程/门禁通过，不能声明模型更优。

公开结果污染时立即隔离，不用覆盖干净文件掩盖事件；保留取证 hash，撤销凭据并按事件响应处理。

回到[实验环境](/labs/setup)运行六个案例。

## 推荐结构

报告先写一句有边界的结论，再列任务抽样、配置矩阵、失败计数、主指标与区间、安全门禁、成本/延迟、敏感性分析和未解决项。表格同时显示分子/分母，避免只写百分比；缺失 run 单独列出，不能按失败或成功静默填补。每张图都给数据文件和生成命令。

## 失败诊断与撤回

若公开表与 JSON summary 不一致，以固定源数据重新生成并停止传播旧图。发现私人路径或 credential，立即隔离公开结果、撤销凭据并检查历史与缓存；不要覆盖同名文件制造“从未发生”。模型 alias 或 fixture hash 不明时把结论降为不可比较。

## 检查题与下一步

读者能否从报告重建任务×配置矩阵？E1 结果中哪类句子明确禁止？先运行[评测实验室](/practice/evaluation)，再按[Secret 与隐私](/security/secrets-privacy)做人工抽查。
