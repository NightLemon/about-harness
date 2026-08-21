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
