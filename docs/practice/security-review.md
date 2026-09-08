# 安全评审工作表

本页把具体风险连接到控制和验证结果。威胁分类见[威胁建模](/security/threat-model)，事故流程见[事故响应](/security/incident-response)。

<span id="在当前仓库执行安全复核"></span>
<span id="当前证据边界"></span>
<span id="第一步冻结评审范围"></span>
<span id="第二步画数据流不先列攻击名称"></span>
<span id="trustprovenance-和-authority-分开填"></span>
<span id="第三步建立资产与损害表"></span>
<span id="第四步枚举主体和可控入口"></span>
<span id="用目录查漏不用目录代替分析"></span>
<span id="第六步排序风险并公开置信度"></span>
<span id="第七步让控制覆盖完整事故链"></span>
<span id="第八步设计-autoaskdeny"></span>
<span id="第九步为威胁预注册测试"></span>
<span id="第十步设计事件-runbook"></span>
<span id="工作例只读浏览器目录提取"></span>
<span id="安全评审要交付什么"></span>
<span id="最终证据包"></span>
<span id="第一步-冻结评审范围"></span>
<span id="写出安全目标与失败证据"></span>
<span id="第二步-画数据流-不先列攻击名称"></span>
<span id="trust、provenance-和-authority-分开填"></span>
<span id="第三步-建立资产与损害表"></span>
<span id="第四步-枚举主体和可控入口"></span>
<span id="用目录查漏-不用目录代替分析"></span>
<span id="第六步-排序风险-并公开置信度"></span>
<span id="第七步-让控制覆盖完整事故链"></span>
<span id="控制也有失败模式"></span>
<span id="第八步-设计-auto、ask、deny"></span>
<span id="第九步-为威胁预注册测试"></span>
<span id="最小安全测试矩阵"></span>
<span id="第十步-设计事件-runbook"></span>
<span id="关闭条件"></span>
<span id="工作例-只读浏览器目录提取"></span>
<span id="数据流与关键威胁"></span>
<span id="写出评审决定"></span>
<span id="agent-安全评审工作表-从数据流到可执行负例"></span>

## 填写模板

| 项目 | 必填内容 |
| --- | --- |
| 范围 | 任务、版本、环境、数据、主体和允许副作用 |
| 数据流 | 入口、来源、权限变化、存储与外发位置 |
| 资产 | 需要保护的对象、拥有者、受损方式及影响 |
| 威胁 | 谁通过哪个入口控制什么，怎样跨过边界 |
| 风险 | 可能性、严重性、证据置信度和优先级 |
| 控制 | 预防、检测、遏制、恢复；责任人和残余风险 |
| 测试 | 攻击输入、正常对照、预期拒绝位置、实际断言与产物 |
| 决定 | 允许范围、阻断项、未知项、复核时间和回退 |

来源可信度、内容出处和动作授权分别填写。风险高但缺少证据时标明不确定性，不把“不知道”当成低风险。授权应绑定动作、参数和有效期。

## 填好示例：固定编码补丁

| 威胁及资产 | 当前控制 | 验证与残余风险 |
| --- | --- | --- |
| 模型声称成功，错误文件被交付 | 验收器忽略完成文本，重读工作区并独立运行测试 | 假完成负例被拒绝；测试覆盖面仍由任务设计决定 |
| 工具修改范围外文件 | 只允许预审补丁；核对 git diff 和未跟踪文件 | 范围外修改、额外文件负例被拒绝 |
| 篡改验证脚本绕过业务验收 | 验证脚本 hash 与固定版本一致才执行 | 篡改脚本负例被拒绝；固定输入本身仍需人工预审 |
| 运行任意模型代码 | 仅执行固定 Python 验证器及已审源码 | 本例不是通用沙箱；不能据此开放任意代码执行 |
| 混入错误报告或替换来源 | EvalRun 引用 Run、Trace、Result、配置及原始材料 hash | 坏 hash、身份漂移、坏执行产物检查失败；hash 不等于来源真实性 |
| 凭据和个人路径进入公开证据 | 合成材料、便携相对引用、公开扫描 | 扫描是辅助检查；发布前仍需复核内容 |

当前决定：允许 E1 本地教学运行；真实模型、远端写入和产品迁移均未授权。完整记录见 `examples/portfolio-completed/security.md`。

<span id="前置条件与输入"></span>
<span id="命令"></span>
<span id="预期结果与人工断言"></span>
<span id="最终检查表"></span>
<span id="检查题与下一步"></span>
<span id="第五步把威胁写成可验证场景"></span>
<span id="第五步-把威胁写成可验证场景"></span>

## 执行与验收

前置为[固定工具链](/guide/prerequisites)，输入为预审的 `study-coding` 任务和安全测试：

```bash
uv run --frozen --offline pytest lab/tests/test_study_demo.py
npm run study:check
npm run results:redact
npm run secrets:check
```

检查正常候选通过、攻击或损坏输入被拒绝；不能只展示负例而漏掉正常任务。扫描通过不证明没有所有秘密，也不证明真实产品隔离。

<span id="失败、停止、清理和回滚"></span>
<span id="失败停止清理和回滚"></span>

## 失败、清理与回退

出现范围外修改或未知结果时停止后续动作，保留最小取证材料，限制访问并核对实际影响。不要把完整私密轨迹复制到公开 issue。运行器只清理自己的临时目录，报告和失败回执保留。修复后用原失败和正常对照复测；回退代码不能撤销已经发生的外部副作用。
