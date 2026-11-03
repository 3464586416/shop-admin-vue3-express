<template>
    <div class="home-page">
      <!-- 顶部导航 -->
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
  
      <!-- 轮播图 -->
      <div class="carousel-section">
        <el-carousel :interval="4000" height="400px" arrow="always">
          <el-carousel-item v-for="item in banners" :key="item.id">
            <img :src="item.image" class="carousel-image" :alt="item.title" />
            <div class="carousel-caption">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
  
      <!-- 热门分类 -->
      <div class="category-section">
        <div class="section-header">
          <h2>热门分类</h2>
          <router-link to="/category" class="view-all">查看全部 →</router-link>
        </div>
        <el-row :gutter="20">
          <el-col :span="6" v-for="category in hotCategories" :key="category.id">
            <div class="category-card" @click="goToCategory(category.id)">
              <div class="category-icon">
                <el-image :src="category.icon || '/images/default-category.png'" fit="cover" />
              </div>
              <div class="category-info">
                <h4>{{ category.name }}</h4>
                <p class="product-count">{{ category.product_count }} 件商品</p>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
  
      <!-- 推荐商品 -->
      <div class="product-section">
        <div class="section-header">
          <h2>推荐商品</h2>
          <el-tabs v-model="activeTab" @tab-click="handleTabChange">
            <el-tab-pane label="最新上架" name="newest"></el-tab-pane>
            <el-tab-pane label="热销商品" name="hot"></el-tab-pane>
            <el-tab-pane label="特价商品" name="discount"></el-tab-pane>
          </el-tabs>
        </div>
        
        <el-row :gutter="20" v-loading="loading">
          <el-col :span="6" v-for="product in recommendedProducts" :key="product.id">
            <el-card class="product-card" shadow="hover" @click="goToProduct(product.id)">
              <div class="product-image">
                <el-image 
                  :src="product.image_url || '/images/default-product.jpg'" 
                  fit="cover"
                  :preview-src-list="[product.image_url]"
                />
                <div v-if="product.stock <= 10 && product.stock > 0" class="stock-warning">
                  仅剩 {{ product.stock }} 件
                </div>
                <div v-else-if="product.stock === 0" class="out-of-stock">
                  已售罄
                </div>
              </div>
              <div class="product-info">
                <h3 class="product-title">{{ product.name }}</h3>
                <p class="product-desc" :title="product.description">
                  {{ truncateDescription(product.description) }}
                </p>
                <div class="product-footer">
                  <span class="product-price">¥{{ product.price.toFixed(2) }}</span>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click.stop="addToCart(product.id)"
                    :disabled="product.stock === 0"
                  >
                    加入购物车
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <div class="load-more" v-if="hasMore">
          <el-button @click="loadMoreProducts" :loading="loadingMore">
            加载更多
          </el-button>
        </div>
      </div>
  
      <!-- 特色服务 -->
      <div class="service-section">
        <el-row :gutter="20">
          <el-col :span="6" v-for="service in services" :key="service.id">
            <div class="service-item">
              <el-icon :size="40" :color="service.color">
                <component :is="service.icon" />
              </el-icon>
              <div class="service-info">
                <h4>{{ service.title }}</h4>
                <p>{{ service.description }}</p>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
  
      <!-- 页脚 -->
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
  import { ref, reactive, onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import {
    Search,
    ShoppingCart,
    ChatDotRound,
    User,
    Goods,
    Present,
    Discount,
    Box
  } from '@element-plus/icons-vue'
  
  import api from '@/api/index'
  
  const router = useRouter()
  
  // 用户信息
  const userInfo = ref(null)
  const cartCount = ref(0)
  const unreadCount = ref(0)
  
  // 搜索相关
  const searchKeyword = ref('')
  
  // 分类相关
  const hotCategories = ref([])
  
  // 商品相关
  const activeTab = ref('newest')
  const recommendedProducts = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(8)
  const hasMore = ref(true)
  
  // 轮播图数据
  const banners = ref([
    { id: 1, image: '/images/banner1.jpg', title: '新品上市', description: '最新科技产品，抢先体验' },
    { id: 2, image: '/images/banner2.jpg', title: '夏季大促', description: '全场商品满减优惠' },
    { id: 3, image: '/images/banner3.jpg', title: '会员专享', description: '会员独享优惠券' }
  ])
  
  // 服务特色
  const services = ref([
    { id: 1, icon: 'Goods', title: '正品保障', description: '100%正品，假一赔十', color: '#409EFF' },
    { id: 2, icon: 'Present', title: '满减优惠', description: '满199减30，上不封顶', color: '#F56C6C' },
    { id: 3, icon: 'Box', title: '快速物流', description: '当日达，急速发货', color: '#67C23A' },
    { id: 4, icon: 'Discount', title: '售后无忧', description: '7天无理由退换货', color: '#E6A23C' }
  ])
  
  // 计算属性
  const truncateDescription = (text) => {
    if (!text) return ''
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }
  
  // 方法
  const handleSearch = () => {
    if (searchKeyword.value.trim()) {
      router.push(`/category?search=${encodeURIComponent(searchKeyword.value.trim())}`)
    }
  }
  
  const goToCategory = (categoryId) => {
    router.push(`/category?id=${categoryId}`)
  }
  
  const goToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }
  
  const handleTabChange = () => {
    currentPage.value = 1
    hasMore.value = true
    loadRecommendedProducts()
  }
  
  const loadRecommendedProducts = async () => {
    if (loading.value) return
    
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        limit: pageSize.value,
        status: 'active'
      }
      
      // 根据选中的标签添加不同的查询参数
      switch (activeTab.value) {
        case 'newest':
          params.sort_by = 'create_time'
          params.sort_order = 'DESC'
          break
        case 'hot':
          // 这里可以根据实际的销量字段排序
          break
        case 'discount':
          // 这里可以根据折扣信息查询
          break
      }
      
      const response = await api.products.getProducts(params)
      
      if (currentPage.value === 1) {
        recommendedProducts.value = response.data.products || []
      } else {
        recommendedProducts.value.push(...(response.data.products || []))
      }
      
      const total = response.data.pagination?.total || 0
      hasMore.value = recommendedProducts.value.length < total
      
    } catch (error) {
      console.error('加载推荐商品失败:', error)
      ElMessage.error('加载商品失败')
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }
  
  const loadMoreProducts = () => {
    if (loadingMore.value || !hasMore.value) return
    
    loadingMore.value = true
    currentPage.value++
    loadRecommendedProducts()
  }
  
  const addToCart = async (productId) => {
    try {
      // 检查用户是否登录
      if (!userInfo.value) {
        ElMessage.warning('请先登录')
        router.push('/admin/login')
        return
      }
      
      await api.cart.addToCart(productId)
      ElMessage.success('已添加到购物车')
      
      // 更新购物车数量
      await getCartCount()
      
    } catch (error) {
      console.error('添加到购物车失败:', error)
      ElMessage.error(error.response?.data?.message || '添加到购物车失败')
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
  
  const getHotCategories = async () => {
    try {
      const response = await api.categories.getCategoryStats()
      hotCategories.value = response.data.slice(0, 4)
    } catch (error) {
      console.error('获取热门分类失败:', error)
    }
  }
  
  const loadUserInfo = () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user_info')
    
    if (token && userStr) {
      try {
        userInfo.value = JSON.parse(userStr)
        // 加载用户相关数据
        getCartCount()
        getUnreadCount()
      } catch (error) {
        console.error('解析用户信息失败:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
      }
    }
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
  
  // 生命周期
  onMounted(() => {
    loadUserInfo()
    getHotCategories()
    loadRecommendedProducts()
  })
  </script>
  
  <style scoped>
  .home-page {
    min-height: 100vh;
    background-color: #f8f9fa;
  }
  
  /* 头部样式 */
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
  
  /* 轮播图样式 */
  .carousel-section {
    max-width: 1200px;
    margin: 20px auto;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .carousel-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .carousel-caption {
    position: absolute;
    bottom: 40px;
    left: 40px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  }
  
  .carousel-caption h3 {
    font-size: 32px;
    margin-bottom: 10px;
  }
  
  /* 分类区域样式 */
  .category-section, .product-section {
    max-width: 1200px;
    margin: 40px auto;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
  }
  
  .section-header h2 {
    font-size: 24px;
    color: #333;
    margin: 0;
  }
  
  .view-all {
    color: #409EFF;
    text-decoration: none;
    font-size: 14px;
  }
  
  .view-all:hover {
    text-decoration: underline;
  }
  
  .category-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .category-card:hover {
    background: #e9ecef;
    transform: translateY(-5px);
  }
  
  .category-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 15px;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .category-info h4 {
    margin: 0 0 5px;
    color: #333;
    font-size: 16px;
  }
  
  .product-count {
    color: #999;
    font-size: 14px;
  }
  
  /* 商品卡片样式 */
  .product-card {
    margin-bottom: 20px;
    border: none;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .product-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }
  
  .product-image {
    position: relative;
    height: 200px;
    overflow: hidden;
  }
  
  .product-image .el-image {
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease;
  }
  
  .product-card:hover .product-image .el-image {
    transform: scale(1.05);
  }
  
  .stock-warning {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #f56c6c;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .out-of-stock {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #909399;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .product-info {
    padding: 15px 0 0;
  }
  
  .product-title {
    font-size: 16px;
    color: #333;
    margin: 0 0 10px;
    height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .product-desc {
    color: #999;
    font-size: 14px;
    margin: 0 0 15px;
    height: 42px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .product-price {
    font-size: 18px;
    color: #f56c6c;
    font-weight: bold;
  }
  
  /* 服务区域样式 */
  .service-section {
    max-width: 1200px;
    margin: 40px auto;
    padding: 30px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  }
  
  .service-item {
    display: flex;
    align-items: center;
    padding: 20px;
  }
  
  .service-item .el-icon {
    flex: 0 0 40px;
    margin-right: 15px;
  }
  
  .service-info h4 {
    margin: 0 0 5px;
    color: #333;
    font-size: 16px;
  }
  
  .service-info p {
    margin: 0;
    color: #999;
    font-size: 14px;
  }
  
  /* 加载更多 */
  .load-more {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  
  /* 页脚样式 */
  .main-footer {
    background: #2c3e50;
    color: #fff;
    padding: 40px 0 20px;
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
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .header-container {
      flex-direction: column;
      padding: 10px;
    }
    
    .logo {
      flex: none;
      margin-bottom: 10px;
    }
    
    .header-search {
      width: 100%;
      max-width: 100%;
      margin: 10px 0;
    }
    
    .carousel-section {
      margin: 10px;
    }
    
    .category-section, .product-section, .service-section {
      margin: 20px 10px;
      padding: 15px;
    }
    
    .footer-links {
      flex-direction: column;
    }
    
    .link-column {
      margin-bottom: 20px;
    }
  }
  </style>