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
      { text: '模型优化', link: '/optimization/model-fit' },
      { text: 'Harness 指南', link: '/harnesses/comparison' },
      { text: '审阅记录', link: '/meta/changelog' }
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '学习路径', link: '/guide/start' },
          { text: '知识地图', link: '/guide/roadmap' }
        ]
      },
      {
        text: '基础原理',
        collapsed: false,
        items: [
          { text: '什么是 Harness', link: '/foundations/what-is-harness' },
          { text: 'Agent 循环', link: '/foundations/agent-loop' },
          { text: '上下文工程', link: '/foundations/context' },
          { text: '工具与协议', link: '/foundations/tools' },
          { text: '指令与扩展层', link: '/foundations/instructions' },
          { text: '安全与权限', link: '/foundations/security' }
        ]
      },
      {
        text: '模型适配',
        items: [
          { text: '模型—Harness 匹配', link: '/optimization/model-fit' },
          { text: '提示与任务契约', link: '/optimization/prompting' },
          { text: '上下文与工具调优', link: '/optimization/context-tools' },
          { text: '实验方法', link: '/optimization/experiment' }
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
          { text: '审阅方法', link: '/meta/review-method' },
          { text: '迭代记录', link: '/meta/changelog' },
          { text: '站点依赖安全', link: '/meta/dependency-security' },
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
