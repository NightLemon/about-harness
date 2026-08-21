export const publicationExcludes = [
  'reviews/**',
  'meta/changelog.md',
  'meta/review-method.md'
]

export const nonPublicRoutes = [
  'reviews',
  'meta/changelog',
  'meta/review-method'
]

export const publicSmokeRoutes = [
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
  'meta/publishing'
]

export function isPublishedMarkdown(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '')
  return normalized.endsWith('.md') &&
    !normalized.startsWith('.vitepress/') &&
    !normalized.startsWith('reviews/') &&
    !['meta/changelog.md', 'meta/review-method.md'].includes(normalized)
}
