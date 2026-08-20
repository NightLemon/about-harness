# 文档：版本化问答与出处

## 目标、版本与输入

同一 handbook 有 v1/v2，另有无关文档。LlamaIndex seam 在检索前按 doc ID 选最新版本，再回答 `retention policy`；它不安装 LlamaIndex、不建立向量索引。

## 运行与预期

```powershell
uv run --frozen --offline python scripts/run-labs.py document
```

预期回答 45 天，引用 `handbook@v2`，`stale_versions_ignored=1`。负例引用 `handbook@v1` 必须失败。无匹配内容时应返回 `insufficient`，不能凭模型记忆补答案。

## 失败、清理与回滚

引用不存在、混用 v1/v2、或返回无出处答案都算失败。Runner 不生成索引，终止即可清理；真实索引修改需保留上版、重新索引并验证删除传播。

## 已知限制

OCR、表格、图片、chunking、embedding 和访问控制不在此 seam 中；E2 需固定 parser、LlamaIndex、embedding/model、索引版本与权限。

下一步：[跨 Harness 迁移](/labs/migration)。
