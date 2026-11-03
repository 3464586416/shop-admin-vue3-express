<template>
  <div class="front-layout">
    <el-header class="main-header">
      <div class="header-container">
        <div class="logo">
          <router-link to="/">
            <span class="logo-text">商城系统</span>
          </router-link>
        </div>

        <div class="header-search">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品..."
            @keyup.enter="handleSearch"
            class="search-input"
          >
            <template #append>
              <el-button @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="header-nav">
          <el-menu mode="horizontal" :ellipsis="false" router>
            <el-menu-item index="/">首页</el-menu-item>
            <el-menu-item index="/category">分类</el-menu-item>
            <el-menu-item index="/cart">
              <el-badge :value="cartCount" :max="99">
                <span>购物车</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/message">
              <el-badge :value="unreadCount" :max="99" type="danger">
                <span>消息</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item v-if="!userInfo" index="/admin/login">登录</el-menu-item>
            <el-sub-menu v-else index="user-menu">
              <template #title>
                <el-avatar :size="30" :src="userInfo.avatar || '/images/default-avatar.jpg'" />
                <span style="margin-left: 8px">{{ userInfo.username }}</span>
              </template>
              <el-menu-item index="/admin/dashboard" v-if="userInfo.role === '超级管理员'">
                后台管理
              </el-menu-item>
              <el-menu-item index="/admin/profile">个人中心</el-menu-item>
              <el-menu-item @click="handleLogout">退出登录</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </div>
      </div>
    </el-header>

    <main class="front-main">
      <slot />
    </main>

    <el-footer class="main-footer">
      <div class="footer-container">
        <div class="footer-links">
          <div class="link-column">
            <h4>购物指南</h4>
            <a href="#">购物流程</a>
            <a href="#">会员介绍</a>
            <a href="#">常见问题</a>
          </div>
          <div class="link-column">
            <h4>配送方式</h4>
            <a href="#">配送服务</a>
            <a href="#">配送费用</a>
            <a href="#">配送时间</a>
          </div>
          <div class="link-column">
            <h4>售后服务</h4>
            <a href="#">退换货政策</a>
            <a href="#">维修服务</a>
            <a href="#">投诉建议</a>
          </div>
          <div class="link-column">
            <h4>关于我们</h4>
            <a href="#">公司简介</a>
            <a href="#">联系我们</a>
            <a href="#">招聘信息</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2025 商城系统 版权所有</p>
          <p>地址：XXX省XXX市XXX区XXX路XXX号</p>
        </div>
      </div>
    </el-footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const userInfo = ref(null)
const cartCount = ref(0)
const unreadCount = ref(0)
const searchKeyword = ref('')

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push(`/category?search=${encodeURIComponent(searchKeyword.value.trim())}`)
  }
}

const getCartCount = async () => {
  try {
    if (userInfo.value) {
      const response = await api.cart.getCartCount()
      cartCount.value = response.data.count || 0
    }
  } catch (error) {
    console.error('获取购物车数量失败:', error)
  }
}

const getUnreadCount = async () => {
  try {
    if (userInfo.value) {
      const response = await api.messages.getUnreadCount()
      unreadCount.value = response.data.unread_count || 0
    }
  } catch (error) {
    console.error('获取未读消息数量失败:', error)
  }
}

// 已登录时不清零角标，等接口回填，避免切页数字闪烁
const refreshUser = () => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user_info')
  if (token && userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
      getCartCount()
      getUnreadCount()
      return
    } catch (error) {
      console.error('解析用户信息失败:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
    }
  }
  userInfo.value = null
  cartCount.value = 0
  unreadCount.value = 0
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user_info')
  userInfo.value = null
  cartCount.value = 0
  unreadCount.value = 0
  ElMessage.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  refreshUser()
  // 页面内加购/删购后不切路由也能刷新角标
  window.addEventListener('cart-updated', getCartCount)
})

onUnmounted(() => {
  window.removeEventListener('cart-updated', getCartCount)
})

watch(() => route.fullPath, refreshUser)
</script>

<style scoped>
.front-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.front-main {
  flex: 1;
}

.main-header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 100%;
}

.logo {
  flex: 0 0 150px;
}

.logo-text {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  text-decoration: none;
}

.header-search {
  flex: 1;
  max-width: 400px;
  margin: 0 40px;
}

.search-input {
  border-radius: 20px;
}

.header-nav {
  flex: 0 0 auto;
}

/* el-menu 默认 overflow:hidden 会把角标上沿裁掉 */
.header-nav :deep(.el-menu--horizontal) {
  overflow: visible;
}

.header-nav :deep(.el-badge__content) {
  top: 6px;
}

.main-footer {
  background: #2c3e50;
  color: #fff;
  padding: 40px 0 20px;
  height: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-links {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.link-column {
  flex: 1;
  padding: 0 20px;
}

.link-column h4 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #fff;
}

.link-column a {
  display: block;
  color: #bdc3c7;
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.3s ease;
}

.link-column a:hover {
  color: #409EFF;
}

.footer-bottom {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #34495e;
  color: #95a5a6;
  font-size: 14px;
}

.footer-bottom p {
  margin: 5px 0;
}
</style>
