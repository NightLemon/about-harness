import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'About Harness',
  description: '从模型到 agent 工作环境：系统学习、配置、实验与评测 AI agent harness',
  base: process.env.DOCS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#6d5dfc' }],
    ['meta', { name: 'author', content: 'About Harness contributors' }]
  ],
  themeConfig: {
    logo: { src: '/logo.svg', alt: 'About Harness' },
    nav: [
      { text: '学习路径', link: '/guide/start' },
      { text: '知识地图', link: '/guide/roadmap' },
      { text: '模型优化', link: '/optimization/model-fit' },
      { text: 'Harness 指南', link: '/harnesses/comparison' },
      { text: '实验与评测', link: '/labs/setup' },
      { text: '项目状态', link: '/meta/changelog' }
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '前置知识', link: '/guide/prerequisites' },
          { text: '学习路径', link: '/guide/start' },
          { text: '知识地图', link: '/guide/roadmap' },
          { text: '作品集与评分', link: '/guide/portfolio' }
        ]
      },
      {
        text: '基础原理',
        collapsed: false,
        items: [
          { text: '什么是 Harness', link: '/foundations/what-is-harness' },
          { text: '系统架构', link: '/foundations/architecture' },
          { text: 'Agent 循环', link: '/foundations/agent-loop' },
          { text: '上下文工程', link: '/foundations/context' },
          { text: '指令系统', link: '/foundations/instructions' },
          { text: '记忆生命周期', link: '/foundations/memory' },
          { text: '推理预算', link: '/foundations/reasoning' },
          { text: '工具设计', link: '/foundations/tools' },
          { text: '模型与工具协议', link: '/foundations/protocols' },
          { text: '状态与可靠执行', link: '/foundations/state-reliability' },
          { text: '可观测性', link: '/foundations/observability' },
          { text: '多 Agent 编排', link: '/foundations/multi-agent' },
          { text: '人在循环中', link: '/foundations/human-control' },
          { text: '安全与权限', link: '/foundations/security' }
        ]
      },
      {
        text: '模型与协议',
        items: [
          { text: '指定模型适配', link: '/models/adaptation' },
          { text: '协议兼容性', link: '/models/protocol-compatibility' },
          { text: '推理预算', link: '/models/reasoning-budget' },
          { text: 'OpenAI', link: '/models/openai' },
          { text: 'Anthropic', link: '/models/anthropic' },
          { text: 'Google', link: '/models/google' },
          { text: 'Qwen', link: '/models/qwen' },
          { text: 'DeepSeek', link: '/models/deepseek' },
          { text: 'Llama', link: '/models/llama' }
        ]
      },
      {
        text: '优化方法',
        items: [
          { text: '模型—Harness 匹配', link: '/optimization/model-fit' },
          { text: '提示与任务契约', link: '/optimization/prompting' },
          { text: '上下文与工具调优', link: '/optimization/context-tools' },
          { text: '记忆优化', link: '/optimization/memory' },
          { text: '推理与路由', link: '/optimization/reasoning-routing' },
          { text: '问题诊断', link: '/optimization/debugging' },
          { text: '实验方法', link: '/optimization/experiment' }
        ]
      },
      {
        text: 'Agent Framework',
        items: [
          { text: 'Framework 对照', link: '/frameworks/comparison' },
          { text: 'LangGraph', link: '/frameworks/langgraph' },
          { text: 'OpenAI Agents SDK', link: '/frameworks/openai-agents-sdk' },
          { text: 'Google ADK', link: '/frameworks/google-adk' },
          { text: 'AutoGen', link: '/frameworks/autogen' }
        ]
      },
      {
        text: '领域模式',
        items: [
          { text: 'Coding Agent', link: '/domains/coding' },
          { text: '浏览器 Agent', link: '/domains/browser' },
          { text: '研究 Agent', link: '/domains/research' },
          { text: '数据 Agent', link: '/domains/data' },
          { text: '文档 Agent', link: '/domains/document' }
        ]
      },
      {
        text: '安全专题',
        items: [
          { text: '威胁模型', link: '/security/threat-model' },
          { text: 'Prompt Injection', link: '/security/prompt-injection' },
          { text: 'Secret 与隐私', link: '/security/secrets-privacy' },
          { text: '供应链安全', link: '/security/supply-chain' },
          { text: '事件响应', link: '/security/incident-response' }
        ]
      },
      {
        text: '参考实现',
        items: [
          { text: 'Python 最小 Harness', link: '/implementation/minimal-harness-python' },
          { text: 'TypeScript 映射', link: '/implementation/typescript-mapping' },
          { text: 'Adapter 契约', link: '/implementation/adapter-contract' },
          { text: '扩展点', link: '/implementation/extensions' },
          { text: '测试策略', link: '/implementation/testing' }
        ]
      },
      {
        text: 'Harness 实战',
        items: [
          { text: '横向比较', link: '/harnesses/comparison' },
          { text: 'Codex', link: '/harnesses/codex' },
          { text: 'Pi', link: '/harnesses/pi' },
          { text: 'Claude Code', link: '/harnesses/claude-code' }
        ]
      },
      {
        text: '实验教程',
        items: [
          { text: '环境准备', link: '/labs/setup' },
          { text: '离线 Runner', link: '/labs/runner' },
          { text: 'Coding 案例', link: '/labs/coding' },
          { text: '浏览器案例', link: '/labs/browser' },
          { text: '研究案例', link: '/labs/research' },
          { text: '数据案例', link: '/labs/data' },
          { text: '文档案例', link: '/labs/document' },
          { text: '跨 Harness 迁移', link: '/labs/migration' }
        ]
      },
      {
        text: '评测系统',
        items: [
          { text: '评测方法', link: '/evaluation/method' },
          { text: '任务与运行 Schema', link: '/evaluation/task-schema' },
          { text: '指标与区间', link: '/evaluation/metrics' },
          { text: 'Judge 设计', link: '/evaluation/judges' },
          { text: '回归与晋级', link: '/evaluation/regression' },
          { text: '结果报告', link: '/evaluation/reporting' }
        ]
      },
      {
        text: '实践手册',
        items: [
          { text: '模型适配卡', link: '/practice/model-playbook' },
          { text: '端到端适配案例', link: '/practice/end-to-end' },
          { text: '评测实验室', link: '/practice/evaluation' },
          { text: '问题诊断', link: '/practice/debugging' }
        ]
      },
      {
        text: '参考与项目',
        collapsed: true,
        items: [
          { text: '术语表', link: '/references/glossary' },
          { text: '资料来源', link: '/references/sources' },
          { text: '事实注册表', link: '/references/fact-registry' },
          { text: '兼容性矩阵', link: '/references/compatibility' },
          { text: '审阅方法', link: '/meta/review-method' },
          { text: '迭代记录', link: '/meta/changelog' },
          { text: 'V1 Review 状态', link: '/reviews/v1' },
          { text: 'Legacy Review 说明', link: '/reviews/legacy' },
          { text: '站点依赖安全', link: '/meta/dependency-security' },
          { text: '隐私与公开结果', link: '/meta/privacy' },
          { text: '维护与事实刷新', link: '/meta/maintenance' },
          { text: '发布到 GitHub Pages', link: '/meta/publishing' }
        ]
      }
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
