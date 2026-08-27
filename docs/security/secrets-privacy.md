# Secret、隐私与公开结果

Secret（凭据秘密）与个人数据一旦进入 prompt、trace 或 Git，往往会被复制到多个难以同时删除的位置。正确顺序是先缩小数据流，再扫描与人工复核。

## 建立数据清单

为每种输入记录 owner、purpose、classification、允许的 provider/tool、保留期、加密、删除和公开条件。未知数据默认不外发；模型输出也不能绕过原输入的分类。公开示例只使用合成或可再分发 fixture。

## 凭据处理

通过运行时 secret store 注入最小 scope 和 TTL。工具只接收需要的 credential handle，不把 secret value 放进 prompt、命令行参数、fixture、截图、trace 或 Git。生产与实验凭据分离；撤销、轮换和审计路径在运行前确定。

## 脱敏不是一次正则

字段名、正则与熵扫描只能发现部分风险。个人绝对路径、账号 ID、内部 URL、专有代码片段和输出组合也可能重新识别个人或组织。公开结果先执行：

```bash
npm run secrets:check
npm run results:redact
```

随后人工抽查工具参数、stdout/stderr、页面内容、模型输出和文件名。公开目录只接受约定的 JSON/JSONL；解析失败、未知格式和符号链接默认拒绝。门禁通过不等于隐私风险为零。

## 删除与事件

删除请求需覆盖源数据、索引、memory、cache、artifact、日志和备份策略；无法立即物理删除时说明保留期与访问控制。发现真实凭据时先停止运行和自动重试，再撤销凭据、隔离结果、判断 Git 与构建缓存是否受影响，最后加入不含真实秘密的回归 canary。仅删除工作树文件不足以清除历史。

## 验证练习

使用合成 canary secret 运行负例，并断言它不出现在 result、trace、构建产物和 `git grep` 中。再构造个人路径与 `rawPrompt` 字段，确认扫描器拒绝。失败时保留脱敏错误摘要，清除临时 fixture 后恢复原配置。

## 已知限制与下一步

静态扫描看不到未落盘的外发，也可能漏掉编码、分片或语义泄漏。真实系统还需 provider 数据策略、网络出口日志、访问审计和删除验证。结合[威胁模型](/security/threat-model)与[事件响应](/security/incident-response)完成闭环。
