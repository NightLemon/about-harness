<script setup lang="ts">
import { onMounted } from 'vue'
import { useData, withBase } from 'vitepress'
import links from '../legacy-links.json'

const { page } = useData()
onMounted(() => {
  const route = '/' + page.value.relativePath.replace(/\.md$/, '')
  const entry = (links as Record<string, { target: string; anchors: Record<string, string> }>)[route]
  if (!entry) return
  let anchor = ''
  try { anchor = decodeURIComponent(window.location.hash.slice(1)) } catch { /* malformed old fragment */ }
  const mapped = entry.anchors[anchor]
  window.location.replace(withBase(entry.target + (mapped ? '#' + encodeURIComponent(mapped) : '')))
})
</script>

<template><p>正在打开合并后的正文。也可使用上方链接继续阅读。</p></template>
