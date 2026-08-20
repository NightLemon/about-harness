# Judge 与人工评分

## 何时使用

编译、测试、schema、hash、安全策略等能确定判断的内容不要交给模型 judge。只在可读性、解释质量或开放式研究覆盖等无法完全规则化的维度使用 judge，并保留人工抽样。

## 控制偏差

盲化配置名、随机或轮换候选顺序、固定 rubric 与 prompt hash、保存 judge 模型/provider/version、让 judge 引用具体证据。用人工标注集检查一致性；位置偏差、自偏好和冗长偏好必须单独测。

## 失败与升级

Judge 输出 schema 无效、引用不存在、候选身份泄漏或与人工基准分歧超阈值时，结果进入人工复核，不自动晋级。Judge 也是模型调用；当前 A3 未授权，所以 M5 只交付协议，不运行 judge。

下一步：[回归](/evaluation/regression)。
