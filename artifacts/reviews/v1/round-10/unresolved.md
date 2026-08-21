# Round 10 未决项

- 开放 P0：0
- 开放 P1：0
- 开放 P2：0
- 开放 P3：0

## 不属于本轮缺陷的边界

- 当前证据仍为 E1；未取得 A3，未调用真实模型 API，也没有产生费用。E2/E3 的真实比较继续保持未运行。
- 未取得 A4；没有 remote、push、PR、GitHub Actions 远程 run、Pages 或发布。Release candidate 只能证明本地可发布性，不能证明线上部署成功。
- 外链门禁仍是离线 URL 结构检查；Round 10 的三份官方来源复核只绑定当次浏览器 DOM 指纹，不是永久网页快照。
- Node.js 22 是 CI/发布最低基线；Round 10 本地验证使用 Node.js 24.14.0。两者不等于承诺未来任意 Node 主版本都兼容。
- 正式 20-task × 3-repeat 矩阵仍只有 12 条 E1 合成样例，缺少的 108 个 cell 会继续阻断模型配置晋级。

上述项目已在 release known limitations 中继续公开，但不阻断本轮三个已证实 finding 的关闭。
