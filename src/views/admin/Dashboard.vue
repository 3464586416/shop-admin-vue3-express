<template>
    <div class="admin-layout">
      <!-- 侧边栏 -->
      <div :class="['sidebar', { 'collapsed': sidebarCollapsed }]">
        <div class="sidebar-header">
          <div class="logo" @click="toggleSidebar">
            <el-icon :size="24" color="#409EFF"><Platform /></el-icon>
            <span v-if="!sidebarCollapsed">商城后台</span>
          </div>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          router
          :collapse="sidebarCollapsed"
          class="admin-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/admin/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          
          <el-sub-menu index="content">
            <template #title>
              <el-icon><Grid /></el-icon>
              <span>内容管理</span>
            </template>
            <el-menu-item index="/admin/categories">
              分类管理
            </el-menu-item>
            <el-menu-item index="/admin/products">
              商品管理
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="order">
            <template #title>
              <el-icon><ShoppingCart /></el-icon>
              <span>订单管理</span>
            </template>
            <el-menu-item index="/admin/orders">
              所有订单
            </el-menu-item>
            <el-menu-item index="/admin/orders/pending">
              待处理订单
            </el-menu-item>
            <el-menu-item index="/admin/orders/completed">
              已完成订单
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="user">
            <template #title>
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </template>
            <el-menu-item index="/admin/users">
              用户列表
            </el-menu-item>
            <el-menu-item index="/admin/users/admins">
              管理员列表
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="message">
            <template #title>
              <el-icon><Message /></el-icon>
              <span>消息管理</span>
            </template>
            <el-menu-item index="/admin/messages">
              消息列表
            </el-menu-item>
            <el-menu-item index="/admin/messages/send">
              发送消息
            </el-menu-item>
          </el-sub-menu>
          
          <el-menu-item index="/admin/settings">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
        </el-menu>
        
        <div class="sidebar-footer" v-if="!sidebarCollapsed">
          <div class="system-info">
            <p>版本：V1.0.0</p>
            <p>时间：{{ currentTime }}</p>
          </div>
        </div>
      </div>
  
      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 顶部导航 -->
        <div class="topbar">
          <div class="topbar-left">
            <el-button
              type="text"
              @click="toggleSidebar"
              class="toggle-button"
            >
              <el-icon :size="20">
                <Fold v-if="!sidebarCollapsed" />
                <Expand v-else />
              </el-icon>
            </el-button>
            
            <el-breadcrumb separator="/" class="breadcrumb">
              <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">
                首页
              </el-breadcrumb-item>
              <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
                {{ item.title }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <div class="topbar-right">
            <el-button class="back-home-btn" @click="router.push('/')">
              <el-icon><HomeFilled /></el-icon>
              <span class="back-home-text">返回前台</span>
            </el-button>
            <div class="user-info">
              <el-dropdown @command="handleUserCommand">
                <div class="user-dropdown">
                  <el-avatar :size="36" :src="userInfo.avatar || '/images/default-avatar.jpg'" />
                  <span class="user-name">{{ userInfo.username }}</span>
                  <el-icon><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">
                      <el-icon><User /></el-icon>
                      个人中心
                    </el-dropdown-item>
                    <el-dropdown-item command="messages">
                      <el-icon><Message /></el-icon>
                      我的消息
                      <el-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" type="danger" />
                    </el-dropdown-item>
                    <el-dropdown-item divided command="logout">
                      <el-icon><SwitchButton /></el-icon>
                      退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
  
        <!-- 内容区域 -->
        <div class="content-wrapper">
          <!-- 仪表盘内容 -->
          <div class="dashboard-content">
            <!-- 欢迎横幅 -->
            <div class="welcome-banner">
              <div class="banner-content">
                <h1>欢迎回来，{{ userInfo.username }}</h1>
                <p>今天是 {{ currentDate }}，{{ getGreeting() }}！</p>
              </div>
              <div class="banner-actions">
                <el-button type="primary" @click="quickActions.addProduct">
                  <el-icon><Plus /></el-icon>
                  新增商品
                </el-button>
                <el-button @click="quickActions.viewOrders">
                  <el-icon><List /></el-icon>
                  查看订单
                </el-button>
              </div>
            </div>
  
            <!-- 统计卡片 -->
            <div class="stats-grid">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-content">
                      <div class="stat-icon" style="background: #409EFF20; color: #409EFF;">
                        <el-icon><ShoppingCart /></el-icon>
                      </div>
                      <div class="stat-info">
                        <div class="stat-value">{{ stats.today_orders || 0 }}</div>
                        <div class="stat-label">今日订单</div>
                      </div>
                      <div class="stat-trend">
                        <span :class="getTrendClass(stats.orders_trend)">
                          <el-icon><Top v-if="stats.orders_trend > 0" /><Bottom v-else /></el-icon>
                          {{ Math.abs(stats.orders_trend || 0) }}%
                        </span>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-content">
                      <div class="stat-icon" style="background: #67C23A20; color: #67C23A;">
                        <el-icon><Money /></el-icon>
                      </div>
                      <div class="stat-info">
                        <div class="stat-value">¥{{ (stats.today_sales || 0).toLocaleString() }}</div>
                        <div class="stat-label">今日销售额</div>
                      </div>
                      <div class="stat-trend">
                        <span :class="getTrendClass(stats.sales_trend)">
                          <el-icon><Top v-if="stats.sales_trend > 0" /><Bottom v-else /></el-icon>
                          {{ Math.abs(stats.sales_trend || 0) }}%
                        </span>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-content">
                      <div class="stat-icon" style="background: #E6A23C20; color: #E6A23C;">
                        <el-icon><User /></el-icon>
                      </div>
                      <div class="stat-info">
                        <div class="stat-value">{{ stats.today_users || 0 }}</div>
                        <div class="stat-label">今日用户</div>
                      </div>
                      <div class="stat-trend">
                        <span :class="getTrendClass(stats.users_trend)">
                          <el-icon><Top v-if="stats.users_trend > 0" /><Bottom v-else /></el-icon>
                          {{ Math.abs(stats.users_trend || 0) }}%
                        </span>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                
                <el-col :span="6">
                  <el-card class="stat-card" shadow="hover">
                    <div class="stat-content">
                      <div class="stat-icon" style="background: #F56C6C20; color: #F56C6C;">
                        <el-icon><Goods /></el-icon>
                      </div>
                      <div class="stat-info">
                        <div class="stat-value">{{ stats.total_products || 0 }}</div>
                        <div class="stat-label">商品总数</div>
                      </div>
                      <div class="stat-trend">
                        <span class="trend-up">
                          <el-icon><Top /></el-icon>
                          持续更新
                        </span>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
  
            <!-- 图表和表格区域 -->
            <div class="dashboard-grid">
              <el-row :gutter="20">
                <!-- 销售趋势图 -->
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <div class="card-header">
                        <span>销售趋势</span>
                        <el-select v-model="salesPeriod" size="small" style="width: 120px;">
                          <el-option label="近7天" value="7"></el-option>
                          <el-option label="近30天" value="30"></el-option>
                          <el-option label="近90天" value="90"></el-option>
                        </el-select>
                      </div>
                    </template>
                    <div v-loading="salesChart.loading" class="chart-container">
                      <div v-if="salesChart.data.length === 0" class="chart-empty">
                        暂无销售数据
                      </div>
                      <div v-else ref="salesChartRef" style="height: 300px;"></div>
                    </div>
                  </el-card>
                </el-col>
  
                <!-- 商品分类分布 -->
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <div class="card-header">
                        <span>商品分类分布</span>
                      </div>
                    </template>
                    <div v-loading="categoryChart.loading" class="chart-container">
                      <div v-if="categoryChart.data.length === 0" class="chart-empty">
                        暂无分类数据
                      </div>
                      <div v-else ref="categoryChartRef" style="height: 300px;"></div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
  
            <!-- 数据表格区域 -->
            <div class="dashboard-grid">
              <el-row :gutter="20">
                <!-- 最新订单 -->
                <el-col :span="12">
                  <el-card class="table-card">
                    <template #header>
                      <div class="card-header">
                        <span>最新订单</span>
                        <router-link to="/admin/orders" class="view-all">
                          查看全部
                        </router-link>
                      </div>
                    </template>
                    <el-table
                      :data="recentOrders"
                      style="width: 100%"
                      v-loading="recentOrdersLoading"
                      @row-click="viewOrderDetail"
                    >
                      <el-table-column prop="order_number" label="订单号" width="180" />
                      <el-table-column label="用户" width="120">
                        <template #default="{ row }">
                          {{ row.customer_name || '未知用户' }}
                        </template>
                      </el-table-column>
                      <el-table-column label="金额" width="100">
                        <template #default="{ row }">
                          ¥{{ row.total_price?.toFixed(2) || '0.00' }}
                        </template>
                      </el-table-column>
                      <el-table-column label="状态" width="100">
                        <template #default="{ row }">
                          <el-tag :type="getOrderStatusType(row.status)" size="small">
                            {{ getOrderStatusText(row.status) }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="create_time" label="下单时间" />
                    </el-table>
                    <div v-if="recentOrders.length === 0 && !recentOrdersLoading" class="table-empty">
                      暂无订单数据
                    </div>
                  </el-card>
                </el-col>
  
                <!-- 热门商品 -->
                <el-col :span="12">
                  <el-card class="table-card">
                    <template #header>
                      <div class="card-header">
                        <span>热门商品</span>
                        <router-link to="/admin/products" class="view-all">
                          查看全部
                        </router-link>
                      </div>
                    </template>
                    <el-table
                      :data="topProducts"
                      style="width: 100%"
                      v-loading="topProductsLoading"
                      @row-click="viewProductDetail"
                    >
                      <el-table-column label="商品" width="300">
                        <template #default="{ row }">
                          <div class="product-cell">
                            <el-image
                              :src="row.image_url || '/images/default-product.jpg'"
                              style="width: 40px; height: 40px; margin-right: 10px;"
                              fit="cover"
                            />
                            <span>{{ row.name }}</span>
                          </div>
                        </template>
                      </el-table-column>
                      <el-table-column label="销量" width="80">
                        <template #default="{ row }">
                          {{ row.sale_count || 0 }}
                        </template>
                      </el-table-column>
                      <el-table-column label="销售额" width="120">
                        <template #default="{ row }">
                          ¥{{ (row.total_sales || 0).toFixed(2) }}
                        </template>
                      </el-table-column>
                      <el-table-column label="库存" width="80">
                        <template #default="{ row }">
                          <el-tag
                            :type="getStockTagType(row.stock)"
                            size="small"
                          >
                            {{ row.stock || 0 }}
                          </el-tag>
                        </template>
                      </el-table-column>
                    </el-table>
                    <div v-if="topProducts.length === 0 && !topProductsLoading" class="table-empty">
                      暂无商品数据
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
  
            <!-- 系统状态 -->
            <div class="system-status">
              <el-card>
                <template #header>
                  <span>系统状态</span>
                </template>
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="status-item">
                      <div class="status-label">服务器状态</div>
                      <div class="status-value">
                        <el-tag type="success" size="large">运行正常</el-tag>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="status-item">
                      <div class="status-label">数据库连接</div>
                      <div class="status-value">
                        <el-tag type="success" size="large">正常</el-tag>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="status-item">
                      <div class="status-label">在线用户</div>
                      <div class="status-value">
                        <div class="online-users">{{ onlineUsers }}</div>
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </el-card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import * as echarts from 'echarts'
  import {
    Platform,
    HomeFilled,
    Grid,
    ShoppingCart,
    User,
    Message,
    Setting,
    Fold,
    Expand,
    ArrowDown,
    SwitchButton,
    Plus,
    List,
    Top,
    Bottom,
    Money,
    Goods
  } from '@element-plus/icons-vue'
  import { format } from 'date-fns'
  
  import api from '@/api/index'
  
  const router = useRouter()
  const route = useRoute()
  
  // 用户信息
  const userInfo = ref({})
  const unreadCount = ref(0)
  
  // 侧边栏状态
  const sidebarCollapsed = ref(false)
  const activeMenu = computed(() => route.path)
  
  // 面包屑
  const breadcrumbs = computed(() => {
    const path = route.path
    const paths = path.split('/').filter(p => p)
    
    const breadcrumbs = []
    let currentPath = ''
    
    paths.forEach((p, index) => {
      currentPath += '/' + p
      const title = getBreadcrumbTitle(p, index)
      if (title) {
        breadcrumbs.push({
          path: currentPath,
          title: title
        })
      }
    })
    
    return breadcrumbs
  })
  
  // 当前时间
  const currentTime = ref('')
  const currentDate = computed(() => format(new Date(), 'yyyy年MM月dd日'))
  
  // 统计数据
  const stats = reactive({
    today_orders: 0,
    today_sales: 0,
    today_users: 0,
    total_products: 0,
    orders_trend: 0,
    sales_trend: 0,
    users_trend: 0
  })
  
  // 图表数据
  const salesPeriod = ref('7')
  const salesChart = reactive({
    loading: false,
    data: []
  })
  const categoryChart = reactive({
    loading: false,
    data: []
  })
  const salesChartRef = ref()
  const categoryChartRef = ref()
  
  // 表格数据
  const recentOrders = ref([])
  const recentOrdersLoading = ref(false)
  const topProducts = ref([])
  const topProductsLoading = ref(false)
  
  // 系统状态
  const onlineUsers = ref(0)
  
  // 快速操作
  const quickActions = {
    addProduct: () => {
      router.push('/admin/products?action=create')
    },
    viewOrders: () => {
      router.push('/admin/orders')
    }
  }
  
  // 辅助函数
  const getBreadcrumbTitle = (path, index) => {
    const titles = {
      'admin': '后台',
      'dashboard': '仪表盘',
      'categories': '分类管理',
      'products': '商品管理',
      'orders': '订单管理',
      'users': '用户管理',
      'messages': '消息管理',
      'settings': '系统设置'
    }
    return titles[path] || path
  }
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 6) return '凌晨好'
    if (hour < 12) return '早上好'
    if (hour < 14) return '中午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }
  
  const getTrendClass = (trend) => {
    return trend > 0 ? 'trend-up' : 'trend-down'
  }
  
  const getOrderStatusType = (status) => {
    const types = {
      'pending': 'warning',
      'paid': 'primary',
      'shipped': 'info',
      'completed': 'success',
      'cancelled': 'danger'
    }
    return types[status] || 'info'
  }
  
  const getOrderStatusText = (status) => {
    const texts = {
      'pending': '待付款',
      'paid': '已付款',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    }
    return texts[status] || status
  }
  
  const getStockTagType = (stock) => {
    if (stock === 0) return 'danger'
    if (stock <= 10) return 'warning'
    return 'success'
  }
  
  // 方法
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  const handleMenuSelect = (index) => {
    activeMenu.value = index
  }
  
  const handleUserCommand = async (command) => {
    switch (command) {
      case 'profile':
        router.push('/admin/profile')
        break
      case 'messages':
        router.push('/message')
        break
      case 'logout':
        await handleLogout()
        break
    }
  }
  
  const handleLogout = async () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      ElMessage.success('已退出登录')
      router.push('/admin/login')
    } catch (error) {
      console.error('退出登录失败:', error)
      ElMessage.error('退出登录失败')
    }
  }
  
  const loadUserInfo = () => {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        userInfo.value = JSON.parse(userStr)
      } catch (error) {
        console.error('解析用户信息失败:', error)
        router.push('/admin/login')
      }
    } else {
      router.push('/admin/login')
    }
  }
  
  const loadDashboardStats = async () => {
    try {
      const response = await api.admin.getDashboardStats()
      Object.assign(stats, response.data.today_stats)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      if (error.response?.status === 401) {
        router.push('/admin/login')
      }
    }
  }
  
  const loadSalesChart = async () => {
    salesChart.loading = true
    try {
      const response = await api.admin.getSalesChart({
        period: salesPeriod.value
      })
      salesChart.data = response.data
      
      // 渲染图表
      await nextTick()
      renderSalesChart()
    } catch (error) {
      console.error('加载销售图表失败:', error)
    } finally {
      salesChart.loading = false
    }
  }
  
  const loadCategoryChart = async () => {
    categoryChart.loading = true
    try {
      const response = await api.categories.getCategoryStats()
      categoryChart.data = response.data
      
      // 渲染图表
      await nextTick()
      renderCategoryChart()
    } catch (error) {
      console.error('加载分类图表失败:', error)
    } finally {
      categoryChart.loading = false
    }
  }
  
  const loadRecentOrders = async () => {
    recentOrdersLoading.value = true
    try {
      const response = await api.orders.getRecentOrders({
        limit: 5
      })
      recentOrders.value = response.data.orders || []
    } catch (error) {
      console.error('加载最新订单失败:', error)
    } finally {
      recentOrdersLoading.value = false
    }
  }
  
  const loadTopProducts = async () => {
    topProductsLoading.value = true
    try {
      const response = await api.admin.getTopProducts({
        limit: 5
      })
      topProducts.value = response.data || []
    } catch (error) {
      console.error('加载热门商品失败:', error)
    } finally {
      topProductsLoading.value = false
    }
  }
  
  const renderSalesChart = () => {
    if (!salesChartRef.value || salesChart.data.length === 0) return
    
    const chart = echarts.init(salesChartRef.value)
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: salesChart.data.map(item => item.period),
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '销售额 (¥)'
      },
      series: [
        {
          name: '销售额',
          type: 'bar',
          data: salesChart.data.map(item => item.sales_amount),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }
      ]
    }
    
    chart.setOption(option)
    
    // 响应式调整
    window.addEventListener('resize', () => {
      chart.resize()
    })
  }
  
  const renderCategoryChart = () => {
    if (!categoryChartRef.value || categoryChart.data.length === 0) return
    
    const chart = echarts.init(categoryChartRef.value)
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: categoryChart.data.map(item => item.name)
      },
      series: [
        {
          name: '商品数量',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: categoryChart.data.map(item => ({
            value: item.product_count,
            name: item.name
          }))
        }
      ]
    }
    
    chart.setOption(option)
    
    // 响应式调整
    window.addEventListener('resize', () => {
      chart.resize()
    })
  }
  
  const viewOrderDetail = (order) => {
    router.push(`/admin/orders/${order.id}`)
  }
  
  const viewProductDetail = (product) => {
    router.push(`/admin/products/${product.id}`)
  }
  
  const updateTime = () => {
    currentTime.value = format(new Date(), 'HH:mm:ss')
  }
  
  // 生命周期
  onMounted(() => {
    loadUserInfo()
    loadDashboardStats()
    loadSalesChart()
    loadCategoryChart()
    loadRecentOrders()
    loadTopProducts()
    
    // 更新时间
    updateTime()
    const timer = setInterval(updateTime, 1000)
    
    // 清理定时器
    onUnmounted(() => {
      clearInterval(timer)
    })
  })
  
  // 监听销售周期变化
  watch(salesPeriod, () => {
    loadSalesChart()
  })
  </script>
  
  <style scoped>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background-color: #f0f2f5;
  }
  
  /* 侧边栏样式 */
  .sidebar {
    width: 256px;
    background: #001529;
    color: #fff;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
  }
  
  .sidebar.collapsed {
    width: 64px;
  }
  
  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .logo:hover {
    opacity: 0.8;
  }
  
  .admin-menu {
    flex: 1;
    border-right: none;
    background: transparent;
    --el-menu-bg-color: transparent;
    --el-menu-text-color: rgba(255,255,255,0.8);
    --el-menu-hover-bg-color: rgba(255,255,255,0.1);
    --el-menu-hover-text-color: #fff;
    --el-menu-active-color: #fff;
  }
  
  .admin-menu:not(.el-menu--collapse) {
    width: 256px;
  }
  
  .admin-menu :deep(.el-sub-menu .el-menu) {
    background: #001529;
  }
  
  .admin-menu :deep(.el-menu-item),
  .admin-menu :deep(.el-sub-menu__title) {
    color: rgba(255,255,255,0.8);
  }
  
  .admin-menu :deep(.el-menu-item:hover),
  .admin-menu :deep(.el-sub-menu__title:hover) {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  
  .admin-menu :deep(.el-menu-item.is-active) {
    background: #1890ff !important;
    color: #fff !important;
  }
  
  .admin-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: #fff;
  }
  
  .sidebar-footer {
    padding: 20px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 12px;
    color: rgba(255,255,255,0.6);
  }
  
  .system-info p {
    margin: 5px 0;
  }
  
  /* 主内容区样式 */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  /* 顶部导航样式 */
  .topbar {
    background: #fff;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f0f0f0;
    box-shadow: 0 1px 4px rgba(0,21,41,0.08);
    z-index: 10;
  }
  
  .topbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .toggle-button {
    padding: 8px;
  }
  
  .breadcrumb {
    line-height: 1;
  }
  
  .topbar-right {
    display: flex;
    align-items: center;
  }
  
  .user-info {
    margin-left: 16px;
  }
  
  .user-dropdown {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  
  .user-dropdown:hover {
    background: #f5f5f5;
  }
  
  .user-name {
    font-weight: 500;
  }
  
  /* 内容区域样式 */
  .content-wrapper {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }
  
  /* 欢迎横幅 */
  .welcome-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    border-radius: 8px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .banner-content h1 {
    font-size: 28px;
    margin: 0 0 12px;
  }
  
  .banner-content p {
    font-size: 16px;
    margin: 0;
    opacity: 0.9;
  }
  
  .banner-actions {
    display: flex;
    gap: 12px;
  }
  
  /* 统计卡片 */
  .stats-grid {
    margin-bottom: 24px;
  }
  
  .stat-card {
    border: none;
  }
  
  .stat-content {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }
  
  .stat-icon .el-icon {
    font-size: 28px;
  }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 14px;
    color: #999;
  }
  
  .stat-trend {
    font-size: 14px;
    font-weight: 500;
  }
  
  .trend-up {
    color: #67C23A;
  }
  
  .trend-down {
    color: #F56C6C;
  }
  
  /* 图表卡片 */
  .chart-card,
  .table-card {
    border: none;
    margin-bottom: 24px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .card-header span {
    font-size: 16px;
    font-weight: 500;
  }
  
  .view-all {
    color: #409EFF;
    text-decoration: none;
    font-size: 14px;
  }
  
  .view-all:hover {
    text-decoration: underline;
  }
  
  .chart-container {
    position: relative;
  }
  
  .chart-empty {
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }
  
  /* 表格相关 */
  .product-cell {
    display: flex;
    align-items: center;
  }
  
  .table-empty {
    padding: 40px 0;
    text-align: center;
    color: #999;
  }
  
  /* 系统状态 */
  .system-status {
    margin-top: 24px;
  }
  
  .status-item {
    text-align: center;
    padding: 20px 0;
  }
  
  .status-label {
    font-size: 14px;
    color: #999;
    margin-bottom: 12px;
  }
  
  .status-value .el-tag {
    min-width: 80px;
  }
  
  .online-users {
    font-size: 28px;
    font-weight: 600;
    color: #409EFF;
  }
  
  /* 响应式设计 */
  @media (max-width: 1200px) {
    .stats-grid .el-col {
      width: 50%;
      margin-bottom: 20px;
    }
    
    .dashboard-grid .el-col {
      width: 100%;
      margin-bottom: 20px;
    }
  }
  
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: -256px;
      top: 0;
      bottom: 0;
      z-index: 1000;
    }
    
    .sidebar.show {
      left: 0;
    }
    
    .main-content {
      margin-left: 0;
    }
    
    .welcome-banner {
      flex-direction: column;
      text-align: center;
      gap: 20px;
    }
    
    .stats-grid .el-col {
      width: 100%;
    }
  }
  </style>