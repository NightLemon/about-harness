# 隐私、凭据与公开结果

## 默认数据边界

项目使用合成或可再分发 fixture，默认离线运行。首版不加载 analytics，不托管凭据，不收集真实用户任务或后台遥测。

## 禁止进入仓库

- API key、cookie、token、私钥和完整环境变量；
- 个人姓名、邮箱、账号 ID、绝对用户路径；
- 私人仓库源码、客户数据、内部 URL 和未脱敏 trace；
- 无法证明许可或来源的文档、截图与数据集。

## Trace 最小化

公开 trace 只保留复现所需事件。工具参数、stdout/stderr、页面内容和模型输出先通过 secret/路径/标识符扫描，再由人工抽查。原始 live trace 默认不进入 `lab/results/public/`。

本地门禁：

```bash
npm run secrets:check
npm run results:redact
```

前者扫描已跟踪与待提交文件中的高置信凭据、私钥和个人绝对路径；后者只允许公开目录包含 `.json` 与 `.jsonl`，逐个 JSON 值或 JSONL 记录检查敏感字段和内容。字段名会先去除大小写、下划线、连字符等表示差异，因此 `raw_prompt`、`rawPrompt` 与 `Raw-Prompt` 都按同一敏感键处理；未知格式、符号链接和解析失败默认拒绝。两个门禁都通过仍不替代人工抽查。

视觉证据只截取本地合成站点和本项目公开页面。截图前关闭账号、通知、浏览器个人资料和其他可能暴露身份的 UI；`artifacts/visual/` 不得保存真实账号或私人网页。

## 发现泄漏时

立即停止后续里程碑，隔离 artifact，撤销相关凭据，保存不含秘密的取证摘要并请求用户。不要只删除最新文件；Git 历史或构建缓存可能仍包含数据。没有 remote 时仍需检查本地 commit、tag、cache 和截图。

## 发布约束

M9 前不执行任何远程操作。未来发布只使用通过脱敏、许可与 secret 门禁的 release candidate；失败不得以“只是示例”为由豁免。
