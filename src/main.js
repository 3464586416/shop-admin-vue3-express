import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 导入全局样式
import '@/assets/style.css'

const app = createApp(App)

app.use(store)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, {
  locale: zhCn,
  size: 'default'
})
app.use(router)
app.mount('#app')

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err)
  console.error('Component:', vm)
  console.error('Info:', info)
}

// 全局属性
app.config.globalProperties.$filters = {
  formatPrice(value) {
    if (typeof value !== 'number') {
      value = parseFloat(value)
    }
    return '¥' + value.toFixed(2)
  },
  formatDate(date) {
    if (!date) return ''
    return new Date(date).toLocaleString('zh-CN')
  },
  truncate(text, length = 50) {
    if (!text) return ''
    if (text.length <= length) return text
    return text.substring(0, length) + '...'
  }
}