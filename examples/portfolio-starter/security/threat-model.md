# Security Review

## 范围与数据流

填写 Task、主体、环境、资产、Provider、Tool、State、Trace 与公开 artifact。标出 trust、provenance 和 authority 的变化。

## 威胁与控制

| ID | 主体/入口/边界/动作/损害 | Priority/confidence | Prevent | Detect | Contain | Recover | Test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | 不可信文件诱导读取并外发凭据 | high / medium | Tool 与数据流最小化 | Policy/Trace 告警 | 禁出口、撤销身份 | 轮换、对账、回归 | 未运行 |
| T-02 | Timeout 后重复写入外部对象 | high / low | 幂等键、intent | 目标查询 | 停止重试 | 复用/补偿 | 未运行 |
| T-03 | 检索文本诱导摘要隐藏反证，没有调用任何工具 | high / medium | 来源与指令分离 | 独立核对引用、反证及任务约束 | 阻止确定性结论交付 | 恢复可信输入并重做验收 | 未运行 |

T-03 的目标是回答完整性。没有网络、写入或工具调用不能证明安全；验收要检查答案是否忠实保留来源冲突。

## auto / ask / deny

| Action | Default | Bound resource/parameters | Reason |
| --- | --- | --- | --- |
| Task 范围内只读 | auto | 待填写 | 可逆、低影响 |
| 工作区内限定写 | auto/ask | path/version/diff | 待填写 |
| 外发、发布、费用、删除 | ask/deny | subject/target/hash/expiry | 高影响 |
| Task 外工具或未知目标 | deny | 不适用 | 未获授权 |

## 事件演练

记录检测、停止传播、隔离/撤销、影响对账、根因、恢复、回归和残余风险。安全负例尚未运行时保持 E0/untested。
