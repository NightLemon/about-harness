# 第 1 轮：术语与范围

日期：2026-08-20

## 审阅目标

检查 `model`、`agent`、`harness`、`provider`、`adapter` 与 `surface` 的边界，确认读者不会把项目误解为模型训练、推理服务器或同名 CI/CD 产品。

## 检查方式

- 全仓搜索上述术语的首次出现和解释位置。
- 对照“什么是 Harness”、学习路径和术语表的定义。
- 检查正文从通用概念切换到具体产品时是否说明 surface/provider。

## 发现与修正

| 严重性 | 发现 | 修正 |
| --- | --- | --- |
| P2 | 只排除了同名 CI/CD 产品，没有说明训练框架、推理服务器与非软件 agent 是否在范围内 | 在基础定义页加入“本项目的范围”，明确主线和非目标 |
| P2 | `surface` 在 Codex/Claude Code 页面多次出现，但术语表没有定义 | 增加 surface，并说明它不等于 provider |
| P3 | `adapter`、`host`、`runtime/controller` 用于故障定位，但缺少统一释义 | 在术语表补齐职责定义 |
| P3 | generic `harness` 大小写不一致可能被误以为专名 | 增加写作约定，标题/句首可大写、普通概念小写 |

## 验证

运行 `npm run docs:check`，并在下一轮检查新增页面是否能从导航到达。

## 未决项

通用 agent harness 的范围仍很大；本阶段先深挖软件/coding agent。未来可新增浏览器 agent、研究 agent 与文档 agent 的专章，而不是在定义页堆叠浅介绍。

