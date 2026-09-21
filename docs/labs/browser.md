# 浏览器实验：观察、动作和过期状态

本例启动真实 Playwright Chromium，只访问本地 HTML。页面刷新后观察身份变化，运行器拒绝基于旧观察继续提取，也拒绝导航到外域。

<span id="先看证据结论"></span>
<span id="威胁故事"></span>
<span id="实际执行链"></span>
<span id="四个-fixture-文件分别承担什么"></span>
<span id="逐字段解释输出"></span>
<span id="records"></span>
<span id="injection-refused"></span>
<span id="injectionrefused"></span>
<span id="side-effects"></span>
<span id="sideeffects"></span>
<span id="integration-与-mode"></span>
<span id="negative-rejected"></span>
<span id="negativerejected"></span>
<span id="当前-url-policy-的精确边界"></span>
<span id="前置条件与固定版本"></span>
<span id="命令"></span>
<span id="预期输出"></span>
<span id="结果如何进入-eval"></span>
<span id="从当前-e1-升级到真实浏览器的路线"></span>
<span id="阶段-a-本地-html-仍不启动浏览器"></span>
<span id="阶段-a本地-html仍不启动浏览器"></span>
<span id="阶段-b-隔离浏览器-只访问本地-origin"></span>
<span id="阶段-b隔离浏览器只访问本地-origin"></span>
<span id="阶段-c-模型只读观察"></span>
<span id="阶段-c模型只读观察"></span>
<span id="阶段-d-受控动作与人工关口"></span>
<span id="阶段-d受控动作与人工关口"></span>
<span id="真实浏览器实验必须新增的记录"></span>
<span id="回归矩阵"></span>
<span id="当前离线实验"></span>
<span id="未来真实浏览器实验"></span>
<span id="完成检查表"></span>
<span id="检查题"></span>

<span id="浏览器实验-本地页面与-prompt-injection"></span>

## 前置、版本与输入

按[统一环境](/labs/setup)准备 Node.js 22+ 与锁定的 Playwright/Chromium。输入为 `lab/fixtures/sources-v2/catalog.html`，原始文件 hash 由 manifest 核对。无模型、登录态和上传工具。

<span id="运行正例"></span>
<span id="运行直接契约测试"></span>

## 运行与断言

```bash
node scripts/browser-lab.mjs
```

预期退出 0，返回 Alpha/Beta 两条记录；动作包含本地导航、刷新按钮点击和观察核对。`observation_id=catalog-2`，旧观察与外域导航两个负例都被拒绝，`external_requests=0`。

页面里的命令式文字仅作为数据。这里没有注入分类器，不输出“模型识别攻击”的结论。

## 它如何工作

临时服务绑定 loopback；浏览器上下文拦截非本地请求。观察来自真实 DOM，记录绑定行元素；刷新按钮改变观察身份。提取前再次核对身份，随后独立比较实际字段。

<span id="失败分类与定位"></span>
<span id="停止、清理、回滚与限制"></span>
<span id="停止清理回滚与限制"></span>

## 失败、清理与回滚

```bash
node scripts/browser-lab.mjs --inject-failure
```

故意损坏返回字段，预期非零退出并报告 `browser artifact verification failed`。错误字段、过期观察或外域请求未被拒绝时停止。浏览器上下文、进程与临时服务在 finally 中关闭；不保留用户 profile。

回退页面或控制逻辑后，重跑正常和失败命令。历史 JSON 例仍可用：`uv run --frozen --offline python scripts/run-labs.py browser`；其中 `injection_refused` 来自预先标注请求，不是短语检测。

## 已知限制

E1 覆盖一个固定本地页面和两类控制负例，不覆盖开放网站、登录、iframe、下载、表单提交或模型抵抗提示注入。完整领域设计见[浏览器模式](/domains/browser)。
