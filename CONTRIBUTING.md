# 参与贡献

本项目接受事实错误、教程失败和内容建议。首版不承诺外部 PR 的响应时限；若仓库尚未公开，可先在本地保存最小复现。

## 报告前请准备

- 页面、标题或锚点；
- 你实际使用的版本、操作系统、harness surface 与命令；
- 预期结果、实际结果和最小复现；
- 是否涉及凭据、私人数据或有副作用操作；
- 对产品事实的官方来源与核对日期。

不要提交 secret、账号标识、私人仓库内容、完整未脱敏 trace 或无法再分发的 fixture。

## 本地检查

```bash
npm ci
npm run check
npm run facts:check
npm run reviews:check
```

Python、TypeScript、实验和全量 `npm run verify` 门禁会在相应里程碑建立。在命令尚不存在时，不要用伪造输出代替。

## 内容变更

稳定原理需要解释机制和边界；易变产品事实需要官方来源、版本和核对日期；建议需要工作负载与证据等级。教程还需包含失败路径、验证和恢复。

## Review 证据

普通内容贡献不自动构成 v1 review。计数轮次必须满足 [`docs/meta/review-method.md`](docs/meta/review-method.md) 的完整证据契约。
