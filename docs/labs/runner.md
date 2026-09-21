# 离线运行器与输入身份

运行器把输入校验、执行、负例和结果连起来。本站保留旧固定 JSON 运行器，并增加原始文件与完整工作区研究，三者的输入格式和 hash 算法明确分开。

<span id="runner-真正负责什么"></span>
<span id="执行生命周期"></span>
<span id="结果结构与不变量"></span>
<span id="为什么不直接安装四个-framework"></span>
<span id="windows-powershell"></span>
<span id="macos-linux"></span>
<span id="修改或新增案例的设计顺序"></span>
<span id="检查题与下一步"></span>

<span id="离线-runner-与职责接缝"></span>

## 两种 hash

| 输入 | 算法 | 格式变化的影响 |
| --- | --- | --- |
| 原 `lab/fixtures/<case>/` JSON | 解析后排序键、紧凑序列化，再计算 SHA-256；三个文件 hash 组成 bundle | 缩进、换行与对象键顺序变化不改变 hash |
| `sources-v2` 与 `study-coding` 文件 | 原始 UTF-8 字节 SHA-256 | 空白、编码和正文变化都改变 hash |

Hash 固定输入身份，不证明输入真实或测试充分。历史 Eval 继续引用不可变 commit/path，不跟随当前文件变化。

<span id="单案例运行与业务断言"></span>

## 运行

前置为[统一环境](/labs/setup)：Python 3.12、uv 0.11.16；新工作区和浏览器实验还需要 Node.js 22+、Git 与 Chromium。

```bash
uv run --frozen --offline python scripts/run-labs.py all
npm run labs:source
npm run study:demo
```

第一条应有六个固定案例及对应负例；第二条验证原始文件和本地页面；第三条生成完整研究与报告。分别查看业务输出，不能把三条命令的结果混成一份模型成绩。

<span id="输入目录与契约"></span>
<span id="可控的-hash-失败练习"></span>
<span id="失败归因"></span>
<span id="验证、停止与回滚"></span>
<span id="验证停止与回滚"></span>

## 用临时输入验证失败

原运行器保留 `--fixtures-root`。以下测试在系统临时目录复制 fixture，再改写字段，预期在执行前得到 `hash mismatch`：

```bash
uv run --frozen --offline pytest -q lab/tests/test_m5_labs.py::test_cli_accepts_isolated_fixture_root_and_rejects_tampering
```

负例自测退出 0 表示内部坏输入已按预期非零退出。无需手工删除正式 fixture，也无需在教程复制递归删除命令。

## 输出与恢复

旧运行器只向终端输出，新研究保存 Run、Trace（轨迹）、Result（结果）、配置和测试产物。结果必须能回到原始输入、执行版本和独立验收。

发现输入漂移、错误产物通过或执行超出本例范围时停止。测试自己清理临时副本；新研究拒绝覆盖已有目录。保留失败记录，回退本轮实现后重跑相同输入。

## 已知限制

固定 JSON 运行器不调用真实产品。原始文件实验只覆盖列出的解析规则；完整研究只执行预审补丁。它们都是 E1，不构成通用代码沙箱、开放网页安全或真实模型质量证明。
