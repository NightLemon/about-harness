# 评测报告与公开结果

## 最小报告

报告写明 workload、任务抽样、模型/provider/adapter/harness、版本、surface、指令/config/fixture hash、重复、split、失败处理、指标、区间、安全、成本、排除项与证据等级。结论句必须带边界，例如“在这 20 个锁定任务和预算内”。

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
