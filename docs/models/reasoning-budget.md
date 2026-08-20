# 针对模型的推理预算

不同 provider 的 reasoning effort、thinking budget 或产品档位不是统一单位。比较时以目标任务的成功、延迟、token/费用和失败类型为准。

## 调节顺序

1. 先修目标、验收、上下文和工具反馈；
2. 以开箱默认建立基线；
3. 对需要规划/综合的任务逐档增加预算；
4. 对机械、局部任务测试降低预算和更窄工具；
5. 设最大 model calls、steps、timeout 和 cost；
6. 建立升级与回退触发条件。

## 不该增加预算的信号

缺文件、tool schema 错误、权限被拒、测试不可运行、来源冲突或 adapter 丢字段。增加推理只会让模型更长地猜。

## 报告

每档至少记录任务级成功、失败分类、P50/P90 延迟、input/output/reasoning/cache token、费用与人工介入。没有可比 usage 字段时不要用估算精确排名。
