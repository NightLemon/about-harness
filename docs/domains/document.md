# 文档 Agent 模式

## 文档不是一个字符串

需要记录文档 ID、版本、日期、许可、页/段锚点、解析器与 chunk hash。OCR、表格、脚注和图像会引入结构损失。

## Harness 重点

版本过滤、chunk provenance、检索/重排、引用、过时检测、访问控制、删除与重新索引。回答前检查来源版本，不把旧政策与新政策混合。

## 失败模式

引用不存在、检索到旧版本、跨用户数据泄漏、表格错列、只凭摘要回答、索引未随删除更新、license 不明内容进入 fixture。

## 指标

Answer correctness、citation precision/coverage、版本选择、过时拒答、权限隔离、检索召回和延迟。M5 使用本地版本化小文档并要求返回出处。
