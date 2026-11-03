<template>
    <div class="category-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>商品分类</el-breadcrumb-item>
          <el-breadcrumb-item v-if="currentCategory">{{ currentCategory.name }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
  
      <div class="category-container">
        <!-- 侧边栏分类 -->
        <div class="sidebar">
          <el-card class="category-sidebar" shadow="never">
            <template #header>
              <div class="sidebar-header">
                <h3>商品分类</h3>
                <el-button type="text" @click="resetFilter">重置</el-button>
              </div>
            </template>
            
            <!-- 分类列表 -->
            <el-menu
              :default-active="activeCategoryId"
              class="category-menu"
              @select="handleCategorySelect"
            >
              <el-menu-item index="all">
                <span>全部商品</span>
              </el-menu-item>
              <el-menu-item 
                v-for="category in categories" 
                :key="category.id"
                :index="category.id.toString()"
              >
                <span>{{ category.name }}</span>
                <el-tag v-if="category.product_count > 0" size="small" type="info">
                  {{ category.product_count }}
                </el-tag>
              </el-menu-item>
            </el-menu>
          </el-card>
  
          <!-- 筛选条件 -->
          <el-card class="filter-sidebar" shadow="never">
            <template #header>
              <h3>筛选条件</h3>
            </template>
            
            <!-- 价格筛选 -->
            <div class="filter-group">
              <h4>价格区间</h4>
              <div class="price-range">
                <el-input-number
                  v-model="filter.minPrice"
                  :min="0"
                  :max="filter.maxPrice || 10000"
                  placeholder="最低价"
                  size="small"
                />
                <span class="range-separator">-</span>
                <el-input-number
                  v-model="filter.maxPrice"
                  :min="filter.minPrice || 0"
                  :max="10000"
                  placeholder="最高价"
                  size="small"
                />
              </div>
            </div>
  
            <!-- 库存筛选 -->
            <div class="filter-group">
              <h4>库存状态</h4>
              <el-radio-group v-model="filter.stockStatus">
                <el-radio label="all">全部</el-radio>
                <el-radio label="in_stock">仅显示有货</el-radio>
                <el-radio label="low_stock">库存紧张</el-radio>
              </el-radio-group>
            </div>
  
            <!-- 排序方式 -->
            <div class="filter-group">
              <h4>排序方式</h4>
              <el-select v-model="filter.sortBy" size="small" placeholder="排序方式">
                <el-option label="默认排序" value="default"></el-option>
                <el-option label="价格从低到高" value="price_asc"></el-option>
                <el-option label="价格从高到低" value="price_desc"></el-option>
                <el-option label="销量最高" value="sales_desc"></el-option>
                <el-option label="最新上架" value="newest"></el-option>
              </el-select>
            </div>
  
            <!-- 筛选按钮 -->
            <div class="filter-actions">
              <el-button type="primary" @click="applyFilter" :loading="loading">
                应用筛选
              </el-button>
              <el-button @click="resetFilter">重置</el-button>
            </div>
          </el-card>
        </div>
  
        <!-- 主内容区 -->
        <div class="main-content">
          <!-- 搜索栏 -->
          <el-card class="search-card">
            <div class="search-header">
              <div class="search-stats">
                <span>找到 {{ pagination.total }} 件商品</span>
                <span v-if="searchKeyword" class="search-keyword">
                  搜索词: {{ searchKeyword }}
                  <el-button type="text" @click="clearSearch">清除</el-button>
                </span>
              </div>
              <div class="view-mode">
                <el-button-group>
                  <el-button
                    :type="viewMode === 'grid' ? 'primary' : 'default'"
                    @click="viewMode = 'grid'"
                  >
                    <el-icon><Grid /></el-icon>
                  </el-button>
                  <el-button
                    :type="viewMode === 'list' ? 'primary' : 'default'"
                    @click="viewMode = 'list'"
                  >
                    <el-icon><List /></el-icon>
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </el-card>
  
          <!-- 商品列表 -->
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="6" animated />
          </div>
  
          <div v-else-if="products.length === 0" class="empty-container">
            <el-empty description="没有找到相关商品">
              <el-button type="primary" @click="resetFilter">查看全部商品</el-button>
            </el-empty>
          </div>
  
          <!-- 网格视图 -->
          <div v-else-if="viewMode === 'grid'" class="product-grid">
            <el-row :gutter="20">
              <el-col :span="8" v-for="product in products" :key="product.id">
                <el-card class="product-card" shadow="hover" @click="goToProduct(product.id)">
                  <div class="product-image">
                    <el-image
                      :src="product.image_url || '/images/default-product.jpg'"
                      fit="cover"
                      lazy
                    />
                    <div class="product-badges">
                      <el-tag v-if="product.stock <= 10 && product.stock > 0" size="small" type="danger">
                        仅剩 {{ product.stock }} 件
                      </el-tag>
                      <el-tag v-else-if="product.stock === 0" size="small" type="info">
                        已售罄
                      </el-tag>
                    </div>
                  </div>
                  <div class="product-info">
                    <h4 class="product-title">{{ product.name }}</h4>
                    <p class="product-category">{{ product.category_name }}</p>
                    <div class="product-price">
                      <span class="current-price">¥{{ product.price.toFixed(2) }}</span>
                    </div>
                    <div class="product-actions">
                      <el-button
                        type="primary"
                        size="small"
                        @click.stop="addToCart(product.id)"
                        :disabled="product.stock === 0"
                      >
                        加入购物车
                      </el-button>
                      <el-button
                        type="text"
                        size="small"
                        @click.stop="goToProduct(product.id)"
                      >
                        查看详情
                      </el-button>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
  
          <!-- 列表视图 -->
          <div v-else class="product-list">
            <el-table :data="products" style="width: 100%" @row-click="handleRowClick">
              <el-table-column width="100">
                <template #default="{ row }">
                  <el-image
                    :src="row.image_url || '/images/default-product.jpg'"
                    :preview-src-list="[row.image_url]"
                    fit="cover"
                    style="width: 80px; height: 80px;"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="name" label="商品名称" min-width="200">
                <template #default="{ row }">
                  <div class="product-name">
                    <h4>{{ row.name }}</h4>
                    <p class="product-desc">{{ truncateDescription(row.description) }}</p>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="category_name" label="分类" width="120" />
              <el-table-column prop="price" label="价格" width="120">
                <template #default="{ row }">
                  <span class="price">¥{{ row.price.toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stock" label="库存" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="getStockTagType(row.stock)"
                    size="small"
                  >
                    {{ getStockText(row.stock) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    size="small"
                    @click.stop="addToCart(row.id)"
                    :disabled="row.stock === 0"
                  >
                    加入购物车
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="goToProduct(row.id)"
                  >
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
  
          <!-- 分页 -->
          <div v-if="products.length > 0" class="pagination-container">
            <el-pagination
              v-model:current-page="pagination.current"
              v-model:page-size="pagination.size"
              :total="pagination.total"
              :page-sizes="[12, 24, 36, 48]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Grid, List } from '@element-plus/icons-vue'
  
  import api from '@/api/index'
  
  const route = useRoute()
  const router = useRouter()
  
  // 数据状态
  const categories = ref([])
  const products = ref([])
  const currentCategory = ref(null)
  const loading = ref(false)
  const viewMode = ref('grid') // 'grid' or 'list'
  
  // 筛选条件
  const filter = reactive({
    categoryId: 'all',
    minPrice: null,
    maxPrice: null,
    stockStatus: 'all',
    sortBy: 'default'
  })
  
  // 分页
  const pagination = reactive({
    current: 1,
    size: 12,
    total: 0
  })
  
  // 搜索关键词
  const searchKeyword = computed(() => route.query.search || '')
  const activeCategoryId = computed(() => filter.categoryId.toString())
  
  // 辅助函数
  const truncateDescription = (text) => {
    if (!text) return ''
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }
  
  const getStockTagType = (stock) => {
    if (stock === 0) return 'info'
    if (stock <= 10) return 'danger'
    return 'success'
  }
  
  const getStockText = (stock) => {
    if (stock === 0) return '已售罄'
    if (stock <= 10) return `仅剩 ${stock} 件`
    return '有货'
  }
  
  // 方法
  const loadCategories = async () => {
    try {
      const response = await api.categories.getCategories()
      // 获取每个分类的商品数量
      const categoriesWithCount = await Promise.all(
        response.data.map(async (category) => {
          try {
            const productResponse = await api.categories.getCategoryProducts(category.id, {
              page: 1,
              limit: 1
            })
            return {
              ...category,
              product_count: productResponse.data.pagination?.total || 0
            }
          } catch (error) {
            return {
              ...category,
              product_count: 0
            }
          }
        })
      )
      categories.value = categoriesWithCount
    } catch (error) {
      console.error('加载分类失败:', error)
      ElMessage.error('加载分类失败')
    }
  }
  
  const loadProducts = async () => {
    loading.value = true
    try {
      const params = {
        page: pagination.current,
        limit: pagination.size,
        status: 'active'
      }
  
      // 添加分类筛选
      if (filter.categoryId !== 'all') {
        params.category_id = filter.categoryId
      }
  
      // 添加价格筛选
      if (filter.minPrice !== null) {
        params.min_price = filter.minPrice
      }
      if (filter.maxPrice !== null) {
        params.max_price = filter.maxPrice
      }
  
      // 添加库存筛选
      if (filter.stockStatus === 'in_stock') {
        params.min_stock = 1
      } else if (filter.stockStatus === 'low_stock') {
        params.max_stock = 10
        params.min_stock = 1
      }
  
      // 添加排序
      switch (filter.sortBy) {
        case 'price_asc':
          params.sort_by = 'price'
          params.sort_order = 'ASC'
          break
        case 'price_desc':
          params.sort_by = 'price'
          params.sort_order = 'DESC'
          break
        case 'newest':
          params.sort_by = 'create_time'
          params.sort_order = 'DESC'
          break
      }
  
      // 添加搜索关键词
      if (searchKeyword.value) {
        params.name = searchKeyword.value
      }
  
      const response = await api.products.getProducts(params)
      
      products.value = response.data.products || []
      pagination.total = response.data.pagination?.total || 0
  
      // 如果有分类ID，获取分类信息
      if (filter.categoryId !== 'all') {
        const category = categories.value.find(cat => cat.id.toString() === filter.categoryId)
        currentCategory.value = category || null
      } else {
        currentCategory.value = null
      }
  
    } catch (error) {
      console.error('加载商品失败:', error)
      ElMessage.error('加载商品失败')
    } finally {
      loading.value = false
    }
  }
  
  const handleCategorySelect = (categoryId) => {
    filter.categoryId = categoryId === 'all' ? 'all' : parseInt(categoryId)
    pagination.current = 1
    loadProducts()
  }
  
  const applyFilter = () => {
    pagination.current = 1
    loadProducts()
  }
  
  const resetFilter = () => {
    filter.categoryId = 'all'
    filter.minPrice = null
    filter.maxPrice = null
    filter.stockStatus = 'all'
    filter.sortBy = 'default'
    pagination.current = 1
    loadProducts()
  }
  
  const clearSearch = () => {
    router.replace({ query: {} })
  }
  
  const goToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }
  
  const handleRowClick = (row) => {
    goToProduct(row.id)
  }
  
  const addToCart = async (productId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        ElMessage.warning('请先登录')
        router.push('/admin/login')
        return
      }
  
      await api.cart.addToCart(productId)
      ElMessage.success('已添加到购物车')
    } catch (error) {
      console.error('添加到购物车失败:', error)
      ElMessage.error(error.response?.data?.message || '添加到购物车失败')
    }
  }
  
  const handleSizeChange = (size) => {
    pagination.size = size
    pagination.current = 1
    loadProducts()
  }
  
  const handleCurrentChange = (page) => {
    pagination.current = page
    loadProducts()
  }
  
  // 监听路由变化
  watch(
    () => route.query.search,
    (newSearch) => {
      if (newSearch) {
        filter.categoryId = 'all'
        pagination.current = 1
        loadProducts()
      }
    }
  )
  
  // 初始化
  onMounted(() => {
    // 从路由参数中获取初始分类ID
    const categoryId = route.query.id
    if (categoryId) {
      filter.categoryId = categoryId
    }
  
    // 从路由参数中获取初始搜索关键词
    if (route.query.search) {
      filter.categoryId = 'all'
    }
  
    loadCategories()
    loadProducts()
  })
  </script>
  
  <style scoped>
  .category-page {
    min-height: 100vh;
    background-color: #f8f9fa;
    padding-bottom: 40px;
  }
  
  .breadcrumb {
    max-width: 1200px;
    margin: 20px auto;
    padding: 0 20px;
  }
  
  .category-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    gap: 20px;
  }
  
  /* 侧边栏样式 */
  .sidebar {
    flex: 0 0 200px;
  }
  
  .category-sidebar, .filter-sidebar {
    margin-bottom: 20px;
    border: 1px solid #e8e8e8;
  }
  
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .category-menu {
    border-right: none;
  }
  
  .category-menu .el-menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 50px;
    line-height: 50px;
  }
  
  /* 筛选条件样式 */
  .filter-group {
    margin-bottom: 20px;
  }
  
  .filter-group h4 {
    margin: 0 0 10px;
    color: #333;
    font-size: 14px;
  }
  
  .price-range {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .range-separator {
    color: #999;
  }
  
  .filter-actions {
    margin-top: 20px;
    text-align: center;
  }
  
  /* 主内容区样式 */
  .main-content {
    flex: 1;
  }
  
  .search-card {
    margin-bottom: 20px;
  }
  
  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .search-stats {
    font-size: 14px;
    color: #666;
  }
  
  .search-keyword {
    margin-left: 20px;
    color: #409EFF;
  }
  
  /* 商品网格视图 */
  .product-grid {
    margin-bottom: 30px;
  }
  
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
    border-radius: 4px;
  }
  
  .product-image .el-image {
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease;
  }

  .product-image :deep(.el-image__inner) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .product-card :deep(.el-card__body) {
    padding: 12px;
  }
  
  .product-card:hover .product-image .el-image {
    transform: scale(1.05);
  }
  
  .product-badges {
    position: absolute;
    top: 10px;
    right: 10px;
  }
  
  .product-info {
    padding: 15px 0 0;
  }
  
  .product-title {
    font-size: 16px;
    color: #333;
    margin: 0 0 5px;
    height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .product-category {
    color: #999;
    font-size: 12px;
    margin: 0 0 10px;
  }
  
  .product-price {
    margin-bottom: 10px;
  }
  
  .current-price {
    font-size: 18px;
    color: #f56c6c;
    font-weight: bold;
  }
  
  .old-price {
    font-size: 14px;
    color: #999;
    text-decoration: line-through;
    margin-left: 5px;
  }
  
  .product-actions {
    display: flex;
    gap: 10px;
  }
  
  /* 商品列表视图 */
  .product-list {
    margin-bottom: 30px;
  }
  
  .product-name h4 {
    margin: 0 0 5px;
    color: #333;
  }
  
  .product-desc {
    color: #999;
    font-size: 12px;
    margin: 0;
    width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .price {
    font-size: 16px;
    color: #f56c6c;
    font-weight: bold;
  }
  
  /* 加载状态 */
  .loading-container {
    padding: 40px 0;
  }
  
  .empty-container {
    padding: 80px 0;
  }
  
  /* 分页 */
  .pagination-container {
    text-align: center;
    padding: 20px 0;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .category-container {
      flex-direction: column;
    }
    
    .sidebar {
      flex: none;
    }
    
    .product-grid .el-col {
      width: 100%;
    }
    
    .product-list .el-table-column {
      display: none;
    }
    
    .product-list .el-table-column:first-child,
    .product-list .el-table-column:last-child {
      display: table-cell;
    }
  }
  </style>