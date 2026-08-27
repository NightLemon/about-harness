# Harness 测试策略

## 测试金字塔

1. 契约：JSON Schema、dataclass、TypeScript union 正反例；
2. 单元：预算、policy、memory、redaction、retry、idempotency；
3. 集成：fake/replay loop、checkpoint 与取消传播；
4. 领域案例：六个固定 fixture；
5. Live smoke：独立授权后的 E2；
6. 正式比较：任务量、重复与 holdout 达标的 E3。

## 当前命令

```bash
uv run pytest
uv run ruff check
uv run pyright
npm run lab:typecheck
npm run lab:smoke
```

测试输出记录命令、版本、退出码和 artifact hash。自动重试不能掩盖失败；flaky 测试先分类基础设施与产品行为，再决定隔离或修复。

## 必测停止路径

完成、max steps、model/cost budget、非有限成本、调用边界 timeout、取消、拒权、tool error、错误类型 action 都要有断言。重试测试同时断言 trace 延迟和 sleeper 收到的实际延迟；恢复测试同时断言 adapter position、幂等缓存和 checkpoint，防止“恢复”重复副作用。

## 负例与回滚

Secret/path 必须被脱敏，未授权工具不得执行，污染记忆默认不检索，live adapter 不得读取凭据。失败时保留日志和最近完整 checkpoint，使用精确 revert 而非覆盖用户改动。

## 一个完整故障注入

让 fake adapter 先返回可重试 timeout、再返回同一带幂等键的写工具调用。测试断言退避次数有限、checkpoint 保存 adapter position、恢复后工具结果来自幂等缓存，trace 同时记录第一次失败与最终状态。只断言最后 `status=success` 会漏掉重复副作用。

## 结果解释

单元测试通过证明固定输入下代码满足断言；schema 通过只证明结构合法；离线案例通过提供 E1；真实 smoke 才能证明目标版本有限可用。任何层都不能自动升级为模型质量。Flaky run 保留原记录，并按 provider、runner、fixture 或并发分类。

## 检查题与下一步

哪一个负例能证明取消会传播到子任务？恢复测试怎样发现重复写入？运行[离线 Runner](/labs/runner)，再按[回归集](/evaluation/regression)组织长期门禁。
