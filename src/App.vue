<template>
  <div id="app">
    <!-- 前台布局 -->
    <template v-if="!isAdminRoute">
      <front-layout>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </front-layout>
    </template>
    
    <!-- 后台管理布局 -->
    <template v-else>
      <admin-layout v-if="isAuthenticated">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </admin-layout>
      <router-view v-else />
    </template>
    
    <!-- 全局Loading -->
    <el-loading 
      v-model:loading="globalLoading" 
      :text="loadingText"
      :fullscreen="true"
      background="rgba(0, 0, 0, 0.8)"
    />
    
    <!-- 全局消息提示容器 -->
    <div id="global-message-container"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import FrontLayout from '@/components/layout/FrontLayout.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ElLoading } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useStore()

const globalLoading = ref(false)
const loadingText = ref('加载中...')

// 计算属性
const isAdminRoute = computed(() => {
  return route.path.startsWith('/admin')
})

const isAuthenticated = computed(() => {
  return store.getters['auth/isAuthenticated']
})

// 监听路由变化
watch(() => route.path, (newPath) => {
  // 页面访问统计
  if (typeof gtag !== 'undefined') {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: newPath
    })
  }
  
  // 滚动到顶部
  window.scrollTo(0, 0)
})

// 全局加载控制
const startLoading = (text = '加载中...') => {
  loadingText.value = text
  globalLoading.value = true
}

const stopLoading = () => {
  globalLoading.value = false
}

// 挂载全局方法
onMounted(() => {
  // 检查用户登录状态
  if (localStorage.getItem('token')) {
    store.dispatch('auth/checkAuth')
  }
  
  // 监听网络状态
  window.addEventListener('online', () => {
    ElMessage({
      type: 'success',
      message: '网络已恢复连接',
      duration: 3000
    })
  })
  
  window.addEventListener('offline', () => {
    ElMessage({
      type: 'warning',
      message: '网络连接已断开',
      duration: 0,
      showClose: true
    })
  })
})

// 暴露全局方法
window.$app = {
  startLoading,
  stopLoading,
  router,
  store
}
</script>

<style lang="scss">
#app {
  font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  min-height: 100vh;
  background-color: #f5f7fa;
}

// 全局过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 全局滚动条样式
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

// 全局图片样式
img {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

// 全局链接样式
a {
  color: #409EFF;
  text-decoration: none;
  transition: color 0.3s;
  
  &:hover {
    color: #66b1ff;
  }
}

// 全局工具类
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-left {
  text-align: left;
}

.mt-0 { margin-top: 0 !important; }
.mt-1 { margin-top: 0.25rem !important; }
.mt-2 { margin-top: 0.5rem !important; }
.mt-3 { margin-top: 1rem !important; }
.mt-4 { margin-top: 1.5rem !important; }
.mt-5 { margin-top: 3rem !important; }

.mb-0 { margin-bottom: 0 !important; }
.mb-1 { margin-bottom: 0.25rem !important; }
.mb-2 { margin-bottom: 0.5rem !important; }
.mb-3 { margin-bottom: 1rem !important; }
.mb-4 { margin-bottom: 1.5rem !important; }
.mb-5 { margin-bottom: 3rem !important; }

.p-0 { padding: 0 !important; }
.p-1 { padding: 0.25rem !important; }
.p-2 { padding: 0.5rem !important; }
.p-3 { padding: 1rem !important; }
.p-4 { padding: 1.5rem !important; }
.p-5 { padding: 3rem !important; }

.w-100 { width: 100% !important; }
.h-100 { height: 100% !important; }

.d-flex { display: flex !important; }
.flex-column { flex-direction: column !important; }
.justify-center { justify-content: center !important; }
.justify-between { justify-content: space-between !important; }
.align-center { align-items: center !important; }
.flex-wrap { flex-wrap: wrap !important; }

// 卡片样式
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  padding: 20px;
  margin-bottom: 20px;
  
  .card-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 15px;
    color: #303133;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
  }
}

// 按钮组样式
.btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

// 表单组样式
.form-group {
  margin-bottom: 20px;
  
  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #606266;
  }
  
  .form-error {
    color: #f56c6c;
    font-size: 12px;
    margin-top: 4px;
  }
}

// 表格样式
.table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  overflow: hidden;
  
  .table-header {
    padding: 20px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

// 响应式断点
@media (max-width: 768px) {
  .hidden-sm {
    display: none !important;
  }
  
  .container {
    padding-left: 10px;
    padding-right: 10px;
  }
}

@media (max-width: 576px) {
  .hidden-xs {
    display: none !important;
  }
}
</style>