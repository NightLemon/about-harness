# Harness 验证记录

输入是 [六项预审任务](../../lab/results/public/study-demo/fixtures/tasks.json)，配置为 baseline 与 candidate。工具只接受 solution.py、reviewed-candidate 补丁 ID 和无额外参数的固定测试命令。

以 demo-collection 为例，先运行初始错误源码并确认退出 1，再执行预审补丁。候选将切片改为完整列表；[实际工作区差异](../../lab/results/public/study-demo/demo-collection-candidate/workspace.json) 与 [测试回执](../../lab/results/public/study-demo/demo-collection-candidate/test-2.json) 可相互核对。模型提议完成后，验收器再次运行测试，因此不能用前一次工具声称成功取代最终验收。

| 检查 | 证据与结果 |
| --- | --- |
| 正常完成 | candidate 六项完成，见各 Result |
| 失败测试 | baseline 六项 verification 失败；完成文本仍写 tests_passed=true，也无法通过 |
| 未修改的假完成 | test_study_demo.py 的假完成负例拒绝 |
| 越界修改、篡改验证器、额外文件 | 同文件三类损坏负例拒绝，未执行验证命令 |
| 预算实际生效 | max_model_calls=1 的测试只完成读取，结果为 budget |
| 错误产物与身份漂移 | check-study.mjs 的 hash 和关联负例拒绝 |

复核命令为 `npm run study:check` 与 `uv run --frozen --offline pytest lab/tests/test_study_demo.py`。实现见 [study_demo.py](../../lab/src/about_harness/study_demo.py)。

临时仓库正常或异常退出时清理，已写的失败证据保留。此完整研究未实现跨进程恢复：中断后使用新目录重新开始。通用检查点与未知副作用恢复另在 reliability-workshop 验证，不能冒充本研究具有该能力。
