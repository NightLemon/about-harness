# Secret、隐私与数据流

## 数据清单

为每种输入记录 owner、purpose、classification、允许 provider/tool、保留期、加密、删除和公开条件。未知数据默认不外发。

## Secret

通过运行时 secret store 注入最小 scope/TTL；不进入 prompt、命令行参数、fixture、截图、trace 或 Git。工具只得到所需 credential handle，不返回 secret value。

## 脱敏

字段名、正则和熵扫描只是第一层；绝对路径、账号 ID、内部 URL、代码片段也可能识别个人/组织。机器扫描后人工抽查，原始 live trace 默认不公开。

## 删除

删除覆盖源数据、索引、memory、cache、artifact、日志和备份策略。无法立即物理删除时说明保留期和访问控制。

## 验证

使用合成 canary secret 做负例；断言它不出现在 result、trace、构建和 Git objects。真实凭据泄漏时先撤销，再清理历史。
