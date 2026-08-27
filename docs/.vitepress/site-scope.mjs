export const excludedSiteRoutes = []

export const siteSmokeRoutes = [
  '',
  'guide/start',
  'guide/roadmap',
  'implementation/minimal-harness-python',
  'models/adaptation',
  'harnesses/codex',
  'harnesses/pi',
  'harnesses/claude-code',
  'labs/coding',
  'labs/browser',
  'labs/research',
  'labs/data',
  'labs/document',
  'labs/migration',
  'security/supply-chain'
]

export function isPublishedMarkdown(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '')
  return normalized.endsWith('.md') &&
    !normalized.startsWith('.vitepress/')
}
