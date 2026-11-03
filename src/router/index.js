import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

// 前台页面
import Home from '@/views/front/Home.vue'
import Category from '@/views/front/Category.vue'
import ProductDetail from '@/views/front/ProductDetail.vue'
import Cart from '@/views/front/Cart.vue'
import Message from '@/views/front/Message.vue'

// 后台页面
import Login from '@/views/admin/Login.vue'
import Dashboard from '@/views/admin/Dashboard.vue'
import CategoryManagement from '@/views/admin/CategoryManagement.vue'
import ProductManagement from '@/views/admin/ProductManagement.vue'
import Profile from '@/views/admin/Profile.vue'

// 路由守卫：检查用户是否登录和权限
const checkAuth = (to, from, next) => {
  const token = localStorage.getItem('token')
  const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
  
  // 如果是登录页面，已登录的用户直接跳转到仪表盘
  if (to.path === '/admin/login') {
    if (token && userInfo.role === '超级管理员') {
      ElMessage.info('您已登录，正在跳转到管理后台')
      next('/admin/dashboard')
    } else {
      next()
    }
    return
  }
  
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    if (!token) {
      ElMessage.warning('请先登录')
      next('/admin/login')
      return
    }
    
    // 检查管理员权限
    if (to.meta.requiresAdmin && userInfo.role !== '超级管理员') {
      ElMessage.error('权限不足，需要管理员权限')
      next('/')
      return
    }
    
    // 检查用户权限
    if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(userInfo.role)) {
      ElMessage.error('权限不足')
      next('/')
      return
    }
    
    next()
  } else {
    next()
  }
}

// 路由配置
const routes = [
  // 前台路由
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页 - 商城系统',
      keepAlive: true
    }
  },
  {
    path: '/category',
    name: 'Category',
    component: Category,
    meta: {
      title: '商品分类 - 商城系统',
      keepAlive: true
    }
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: ProductDetail,
    props: true,
    meta: {
      title: '商品详情 - 商城系统',
      keepAlive: false
    }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: Cart,
    meta: {
      title: '购物车 - 商城系统',
      requiresAuth: true,
      keepAlive: true
    }
  },
  {
    path: '/message',
    name: 'Message',
    component: Message,
    meta: {
      title: '我的消息 - 商城系统',
      requiresAuth: true,
      keepAlive: true
    }
  },
  
  // 后台路由
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: Login,
    meta: {
      title: '后台登录 - 商城系统',
      guestOnly: true
    }
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: '仪表盘 - 后台管理',
      requiresAuth: true,
      requiresAdmin: true,
      keepAlive: true
    }
  },
  {
    path: '/admin/categories',
    name: 'CategoryManagement',
    component: CategoryManagement,
    meta: {
      title: '分类管理 - 后台管理',
      requiresAuth: true,
      requiresAdmin: true,
      keepAlive: true
    }
  },
  {
    path: '/admin/products',
    name: 'ProductManagement',
    component: ProductManagement,
    meta: {
      title: '商品管理 - 后台管理',
      requiresAuth: true,
      requiresAdmin: true,
      keepAlive: true
    }
  },
  {
    path: '/admin/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      title: '个人中心 - 后台管理',
      requiresAuth: true,
      keepAlive: false
    }
  },
  
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

// 创建路由器实例
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  // 检查认证状态
  checkAuth(to, from, next)
})

// 全局后置钩子
router.afterEach((to, from) => {
  // 可以在这里添加页面访问统计
  if (to.meta.requiresAuth) {
    console.log(`用户访问了需要认证的页面: ${to.path}`)
  }
})

// 错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('页面加载失败，请刷新重试')
})

// 导出路由器实例
export default router