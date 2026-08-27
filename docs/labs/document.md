# 文档：版本化问答与出处

## 目标、版本与输入

同一 handbook 有 v1/v2，另有无关文档。LlamaIndex seam 在检索前按 doc ID 选最新版本，再回答 `retention policy`；它不安装 LlamaIndex、不建立向量索引。容器与三平台本地入口见[实验环境](/labs/setup)。

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

## 前置条件与固定版本

使用 Python 3.11+、`uv 0.11.16` 与版本化本地 fixture，不安装 LlamaIndex 或 embedding 模型。运行前由 manifest 验证文档 bundle hash。

## 断言检查表

确认答案、source ID、版本和引用位置同时匹配；旧版被过滤，无匹配内容走 `insufficient`。回答文本正确但出处错误仍失败。修改文档后产生新 hash 与结果，不能继续引用旧 run；解析器、OCR 或索引变化也应触发重跑。

机器字段为兼容既有 schema 可能仍叫 `integration`，正文只称离线职责接缝。下一步运行[跨 Harness 迁移](/labs/migration)。
