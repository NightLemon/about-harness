# 模型与工具协议

协议兼容是 adapter 能否可靠映射消息、工具和错误；它不是“HTTP 请求能成功”。

## 模型协议检查

| 面 | 要验证的语义 |
| --- | --- |
| 身份 | 精确 model ID、provider、adapter、版本/解析日期 |
| 消息 | role、system/developer、multi-part content、assistant history |
| 工具 | JSON Schema 子集、必填/额外字段、并行调用、call ID |
| 流式 | delta 顺序、tool arguments 拼接、取消与断连 |
| 停止 | completed、length、tool、content filter、error 的映射 |
| Usage | input/output/cache/reasoning token 与费用字段 |
| 错误 | 认证、限流、timeout、schema、server 与取消是否可区分 |

## 工具协议

工具必须声明 schema、副作用、幂等性、timeout、错误码和结果上限。MCP 连接 host/client/server 的能力描述与消息交换，但 host 仍负责授权；“可发现”不等于“允许执行”。[FACT:mcp-spec]

## 兼容探针

用无副作用 fixture 逐项探测，保存原始请求/响应的脱敏摘要。一个探针通过只能证明目标版本的窄能力；真实任务效果仍需 E2/E3。

## 漂移

Provider alias、默认模型、schema 支持和错误格式会变化。固定 model ID/adapter 版本，冲突时保留网页、`--help` 和实际探针三类证据。
