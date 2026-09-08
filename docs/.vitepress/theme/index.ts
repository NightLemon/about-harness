import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import RouteRedirect from './RouteRedirect.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) { app.component('RouteRedirect', RouteRedirect) }
} satisfies Theme

