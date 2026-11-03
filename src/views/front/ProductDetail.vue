<template>
    <div class="product-detail-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/category' }">商品分类</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: `/category?id=${product.category_id}` }">
            {{ product.category_name }}
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ product.name }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
  
      <div class="product-container">
        <!-- 商品主图区域 -->
        <div class="product-gallery">
          <el-card class="main-image-card">
            <div class="main-image-container">
              <el-image
                :src="mainImage"
                :preview-src-list="previewImages"
                fit="contain"
                :zoom-rate="1.2"
                :max-scale="7"
                :min-scale="0.2"
                class="main-image"
              />
            </div>
          </el-card>
  
          <!-- 缩略图列表 -->
          <div class="thumbnail-list">
            <div
              v-for="(image, index) in productImages"
              :key="index"
              :class="['thumbnail-item', { active: index === activeImageIndex }]"
              @click="changeMainImage(image, index)"
            >
              <el-image :src="image" fit="cover" />
            </div>
          </div>
        </div>
  
        <!-- 商品信息区域 -->
        <div class="product-info">
          <el-card class="info-card">
            <div class="product-header">
              <h1 class="product-title">{{ product.name }}</h1>
              <div class="product-meta">
                <span class="product-id">商品编号: {{ product.id }}</span>
                <span class="product-views">
                  <el-icon><View /></el-icon>
                  1234 人浏览
                </span>
              </div>
            </div>
  
            <div class="product-price-section">
              <div class="price-row">
                <span class="price-label">销售价</span>
                <div class="current-price">
                  <span class="currency">¥</span>
                  <span class="amount">{{ product.price.toFixed(2) }}</span>
                </div>
              </div>
              <div v-if="originalPrice" class="price-row">
                <span class="price-label">市场价</span>
                <span class="original-price">¥{{ originalPrice.toFixed(2) }}</span>
              </div>
            </div>
  
            <div class="product-specs">
              <div class="spec-item">
                <span class="spec-label">库存状态</span>
                <el-tag :type="getStockTagType(product.stock)" size="large">
                  {{ getStockText(product.stock) }}
                </el-tag>
              </div>
              <div class="spec-item">
                <span class="spec-label">发货地</span>
                <span class="spec-value">上海</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">运费</span>
                <span class="spec-value">免运费</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">服务</span>
                <span class="spec-value">7天无理由退换货</span>
              </div>
            </div>
  
            <!-- 购买选项 -->
            <div class="purchase-options">
              <div class="quantity-selector">
                <span class="option-label">购买数量</span>
                <div class="quantity-control">
                  <el-input-number
                    v-model="quantity"
                    :min="1"
                    :max="product.stock > 0 ? product.stock : 1"
                    :disabled="product.stock === 0"
                    size="large"
                    controls-position="right"
                  />
                  <span class="stock-tips" v-if="product.stock > 0">
                    库存 {{ product.stock }} 件
                  </span>
                  <span class="stock-tips error" v-else>
                    商品已售罄
                  </span>
                </div>
              </div>
  
              <div class="action-buttons">
                <el-button
                  type="primary"
                  size="large"
                  :disabled="product.stock === 0"
                  @click="addToCart"
                  class="cart-btn"
                >
                  <el-icon><ShoppingCart /></el-icon>
                  加入购物车
                </el-button>
                <el-button
                  type="danger"
                  size="large"
                  :disabled="product.stock === 0"
                  @click="buyNow"
                  class="buy-btn"
                >
                  立即购买
                </el-button>
                <el-button
                  type="text"
                  @click="toggleFavorite"
                  class="favorite-btn"
                >
                  <el-icon :color="isFavorite ? '#f56c6c' : '#999'">
                    <StarFilled v-if="isFavorite" />
                    <Star v-else />
                  </el-icon>
                  {{ isFavorite ? '已收藏' : '收藏' }}
                </el-button>
              </div>
            </div>
  
            <!-- 分享 -->
            <div class="share-section">
              <span class="share-label">分享:</span>
              <div class="share-buttons">
                <el-button type="text" size="small">
                  <el-icon><Share /></el-icon>
                  微信
                </el-button>
                <el-button type="text" size="small">
                  <el-icon><Share /></el-icon>
                  微博
                </el-button>
                <el-button type="text" size="small">
                  <el-icon><Share /></el-icon>
                  QQ
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>
  
      <!-- 商品详情区域 -->
      <div class="product-detail-section">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="商品详情" name="detail">
            <el-card class="detail-card">
              <div class="detail-content" v-html="product.description"></div>
              <div v-if="!product.description" class="no-detail">
                <el-empty description="暂无商品详情" />
              </div>
            </el-card>
          </el-tab-pane>
          
          <el-tab-pane label="规格参数" name="specs">
            <el-card class="specs-card">
              <el-table :data="specifications" style="width: 100%">
                <el-table-column prop="name" label="参数名称" width="200" />
                <el-table-column prop="value" label="参数值" />
              </el-table>
              <div v-if="specifications.length === 0" class="no-specs">
                <el-empty description="暂无规格参数" />
              </div>
            </el-card>
          </el-tab-pane>
          
          <el-tab-pane label="用户评价" name="reviews">
            <el-card class="reviews-card">
              <div class="review-header">
                <div class="review-stats">
                  <div class="rating-overall">
                    <span class="rating-score">4.8</span>
                    <span class="rating-text">综合评分</span>
                  </div>
                  <div class="rating-bars">
                    <div class="rating-bar" v-for="i in 5" :key="i">
                      <span class="star-label">{{ 6 - i }}星</span>
                      <el-progress
                        :percentage="80 - (i - 1) * 15"
                        :show-text="false"
                        :stroke-width="8"
                      />
                      <span class="bar-count">{{ 100 - (i - 1) * 25 }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="review-list">
                <div class="review-item" v-for="review in reviews" :key="review.id">
                  <div class="reviewer-info">
                    <el-avatar :size="40" :src="review.avatar" />
                    <div class="reviewer-details">
                      <span class="reviewer-name">{{ review.username }}</span>
                      <el-rate
                        v-model="review.rating"
                        disabled
                        show-score
                        text-color="#ff9900"
                        score-template="{value}"
                      />
                    </div>
                    <span class="review-time">{{ review.time }}</span>
                  </div>
                  <div class="review-content">
                    {{ review.content }}
                  </div>
                  <div class="review-images" v-if="review.images && review.images.length > 0">
                    <el-image
                      v-for="(img, index) in review.images"
                      :key="index"
                      :src="img"
                      :preview-src-list="review.images"
                      fit="cover"
                      class="review-image"
                    />
                  </div>
                </div>
              </div>
              
              <div class="no-reviews" v-if="reviews.length === 0">
                <el-empty description="暂无用户评价" />
              </div>
            </el-card>
          </el-tab-pane>
          
          <el-tab-pane label="常见问题" name="faq">
            <el-card class="faq-card">
              <el-collapse v-model="activeFaq">
                <el-collapse-item
                  v-for="item in faqs"
                  :key="item.id"
                  :name="item.id"
                  :title="item.question"
                >
                  {{ item.answer }}
                </el-collapse-item>
              </el-collapse>
              <div v-if="faqs.length === 0" class="no-faq">
                <el-empty description="暂无常见问题" />
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </div>
  
      <!-- 猜你喜欢 -->
      <div class="recommended-products">
        <div class="section-header">
          <h2>猜你喜欢</h2>
        </div>
        <el-row :gutter="20" v-loading="loadingRecommended">
          <el-col :span="6" v-for="item in recommendedProducts" :key="item.id">
            <el-card class="recommended-card" shadow="hover" @click="goToProduct(item.id)">
              <div class="recommended-image">
                <el-image :src="item.image_url" fit="cover" />
              </div>
              <div class="recommended-info">
                <h4>{{ item.name }}</h4>
                <p class="price">¥{{ item.price.toFixed(2) }}</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import {
    View,
    ShoppingCart,
    Star,
    StarFilled,
    Share
  } from '@element-plus/icons-vue'
  
  import api from '@/api/index'
  
  const route = useRoute()
  const router = useRouter()
  
  // 商品数据
  const product = ref({
    id: 0,
    name: '',
    price: 0,
    stock: 0,
    category_id: null,
    category_name: '',
    description: '',
    image_url: ''
  })
  
  const loading = ref(false)
  const loadingRecommended = ref(false)
  
  // 图片相关
  const mainImage = ref('')
  const activeImageIndex = ref(0)
  const productImages = ref([])
  const previewImages = computed(() => productImages.value)
  
  // 购买相关
  const quantity = ref(1)
  const isFavorite = ref(false)
  
  // 标签页
  const activeTab = ref('detail')
  
  // 规格参数
  const specifications = ref([
    { name: '品牌', value: '未知' },
    { name: '型号', value: '标准版' },
    { name: '颜色', value: '多种可选' },
    { name: '尺寸', value: '标准尺寸' },
    { name: '重量', value: '约1kg' },
    { name: '材质', value: '优质材料' }
  ])
  
  // 评价数据
  const reviews = ref([
    {
      id: 1,
      username: '用户1',
      avatar: '',
      rating: 5,
      time: '2025-12-15',
      content: '商品质量很好，物流也很快，非常满意！',
      images: []
    },
    {
      id: 2,
      username: '用户2',
      avatar: '',
      rating: 4,
      time: '2025-12-14',
      content: '还不错，性价比高，会再次购买',
      images: []
    }
  ])
  
  // 常见问题
  const faqs = ref([
    {
      id: 1,
      question: '商品支持退换货吗？',
      answer: '支持7天无理由退换货，商品不影响二次销售即可。'
    },
    {
      id: 2,
      question: '发货时间需要多久？',
      answer: '一般在下单后24小时内发货，具体请查看商品页面说明。'
    }
  ])
  
  const activeFaq = ref([1])
  
  // 推荐商品
  const recommendedProducts = ref([])
  
  // 计算属性
  const originalPrice = computed(() => {
    // 如果有原价，这里可以计算折扣
    return product.value.price * 1.2
  })
  
  // 方法
  const loadProduct = async () => {
    const productId = route.params.id
    if (!productId) {
      ElMessage.error('商品ID无效')
      router.push('/')
      return
    }
  
    loading.value = true
    try {
      const response = await api.products.getProduct(productId)
      product.value = response.data
      
      // 设置图片
      if (product.value.image_url) {
        productImages.value = [product.value.image_url]
        mainImage.value = product.value.image_url
      } else {
        productImages.value = ['/images/default-product.jpg']
        mainImage.value = '/images/default-product.jpg'
      }
      
      // 添加更多示例图片
      for (let i = 1; i <= 3; i++) {
        productImages.value.push(`/images/product-detail-${i}.jpg`)
      }
      
    } catch (error) {
      console.error('加载商品失败:', error)
      ElMessage.error('商品不存在或已被删除')
      router.push('/')
    } finally {
      loading.value = false
    }
  }
  
  const loadRecommendedProducts = async () => {
    loadingRecommended.value = true
    try {
      const response = await api.products.getProducts({
        page: 1,
        limit: 4,
        status: 'active'
      })
      recommendedProducts.value = response.data.products || []
    } catch (error) {
      console.error('加载推荐商品失败:', error)
    } finally {
      loadingRecommended.value = false
    }
  }
  
  const changeMainImage = (image, index) => {
    mainImage.value = image
    activeImageIndex.value = index
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
  
  const addToCart = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        ElMessage.warning('请先登录')
        router.push('/admin/login')
        return
      }
  
      await api.cart.addToCart(product.value.id, quantity.value)
      ElMessage.success('已添加到购物车')
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('添加到购物车失败:', error)
      ElMessage.error(error.response?.data?.message || '添加到购物车失败')
    }
  }
  
  const buyNow = () => {
    if (product.value.stock === 0) {
      ElMessage.warning('商品已售罄')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.warning('请先登录')
      router.push('/admin/login')
      return
    }
    
    // 演示项目未接入支付，模拟一笔购买成功
    ElMessage.success(`模拟购买成功：${product.value.name} ×${quantity.value}（演示项目，未接入支付）`)
  }
  
  const toggleFavorite = () => {
    isFavorite.value = !isFavorite.value
    ElMessage.success(isFavorite.value ? '已收藏' : '已取消收藏')
  }
  
  const goToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }
  
  // 生命周期
  onMounted(() => {
    loadProduct()
    loadRecommendedProducts()
  })
  
  // 停留在详情页时点"猜你喜欢"换商品：params 变化需重新加载
  watch(() => route.params.id, (id, old) => {
    if (id && id !== old) {
      quantity.value = 1
      loadProduct()
      loadRecommendedProducts()
      window.scrollTo({ top: 0 })
    }
  })
  </script>
  
  <style scoped>
  .product-detail-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #fff;
  }
  
  .breadcrumb {
    margin-bottom: 30px;
  }
  
  .product-container {
    display: flex;
    gap: 30px;
    margin-bottom: 40px;
  }
  
  /* 商品图库 */
  .product-gallery {
    flex: 0 0 450px;
  }
  
  .main-image-card {
    margin-bottom: 15px;
    border: none;
  }
  
  .main-image-container {
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .main-image {
    max-width: 100%;
    max-height: 100%;
    cursor: zoom-in;
  }
  
  .thumbnail-list {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .thumbnail-item {
    width: 80px;
    height: 80px;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .thumbnail-item:hover {
    border-color: #409EFF;
  }
  
  .thumbnail-item.active {
    border-color: #f56c6c;
  }
  
  .thumbnail-item .el-image {
    width: 100%;
    height: 100%;
  }
  
  /* 商品信息 */
  .product-info {
    flex: 1;
  }
  
  .info-card {
    border: none;
  }
  
  .product-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .product-title {
    font-size: 24px;
    color: #333;
    margin: 0 0 10px;
    line-height: 1.4;
  }
  
  .product-meta {
    display: flex;
    gap: 20px;
    color: #999;
    font-size: 14px;
  }
  
  .product-views {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  /* 价格区域 */
  .product-price-section {
    margin-bottom: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .price-row {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .price-label {
    width: 80px;
    color: #666;
    font-size: 14px;
  }
  
  .current-price {
    display: flex;
    align-items: baseline;
  }
  
  .currency {
    font-size: 20px;
    color: #f56c6c;
    font-weight: bold;
  }
  
  .amount {
    font-size: 32px;
    color: #f56c6c;
    font-weight: bold;
    margin-left: 2px;
  }
  
  .original-price {
    font-size: 16px;
    color: #999;
    text-decoration: line-through;
  }
  
  /* 规格信息 */
  .product-specs {
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .spec-item {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .spec-item:last-child {
    margin-bottom: 0;
  }
  
  .spec-label {
    width: 80px;
    color: #666;
    font-size: 14px;
  }
  
  .spec-value {
    color: #333;
    font-size: 14px;
  }
  
  /* 购买选项 */
  .purchase-options {
    margin-bottom: 30px;
  }
  
  .quantity-selector {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .option-label {
    width: 80px;
    color: #666;
    font-size: 14px;
  }
  
  .quantity-control {
    flex: 1;
  }
  
  .stock-tips {
    margin-left: 15px;
    color: #67C23A;
    font-size: 14px;
  }
  
  .stock-tips.error {
    color: #f56c6c;
  }
  
  .action-buttons {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
  }
  
  .cart-btn, .buy-btn {
    flex: 1;
    min-width: 150px;
  }
  
  .favorite-btn {
    flex: 0 0 auto;
  }
  
  /* 分享区域 */
  .share-section {
    display: flex;
    align-items: center;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  
  .share-label {
    color: #666;
    font-size: 14px;
    margin-right: 15px;
  }
  
  .share-buttons {
    display: flex;
    gap: 10px;
  }
  
  /* 商品详情区域 */
  .product-detail-section {
    margin-bottom: 40px;
  }
  
  .detail-tabs {
    background: #fff;
  }
  
  .detail-card, .specs-card, .reviews-card, .faq-card {
    border: none;
    margin-top: 20px;
  }
  
  .detail-content {
    padding: 20px;
    line-height: 1.8;
    color: #333;
  }
  
  .detail-content img {
    max-width: 100%;
    height: auto;
  }
  
  .no-detail, .no-specs, .no-reviews, .no-faq {
    padding: 60px 0;
  }
  
  /* 评价区域 */
  .review-header {
    margin-bottom: 30px;
  }
  
  .review-stats {
    display: flex;
    gap: 40px;
    align-items: center;
  }
  
  .rating-overall {
    text-align: center;
  }
  
  .rating-score {
    font-size: 36px;
    font-weight: bold;
    color: #f56c6c;
    display: block;
  }
  
  .rating-text {
    font-size: 14px;
    color: #666;
  }
  
  .rating-bars {
    flex: 1;
  }
  
  .rating-bar {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 10px;
  }
  
  .star-label {
    width: 40px;
    color: #666;
    font-size: 14px;
  }
  
  .bar-count {
    width: 40px;
    color: #999;
    font-size: 14px;
    text-align: right;
  }
  
  .review-list {
    margin-top: 30px;
  }
  
  .review-item {
    padding: 20px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .review-item:last-child {
    border-bottom: none;
  }
  
  .reviewer-info {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    gap: 15px;
  }
  
  .reviewer-details {
    flex: 1;
  }
  
  .reviewer-name {
    display: block;
    color: #333;
    font-weight: 500;
    margin-bottom: 5px;
  }
  
  .review-time {
    color: #999;
    font-size: 14px;
  }
  
  .review-content {
    color: #333;
    line-height: 1.6;
    margin-bottom: 15px;
  }
  
  .review-images {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .review-image {
    width: 80px;
    height: 80px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  /* 猜你喜欢 */
  .recommended-products {
    margin-top: 40px;
  }
  
  .section-header {
    margin-bottom: 20px;
  }
  
  .section-header h2 {
    font-size: 20px;
    color: #333;
    margin: 0;
    padding-bottom: 10px;
    border-bottom: 2px solid #f56c6c;
  }
  
  .recommended-card {
    margin-bottom: 20px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .recommended-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .recommended-image {
    height: 150px;
    overflow: hidden;
    border-radius: 4px;
  }
  
  .recommended-image .el-image {
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease;
  }
  
  .recommended-card:hover .recommended-image .el-image {
    transform: scale(1.05);
  }
  
  .recommended-info {
    padding: 15px 0 0;
  }
  
  .recommended-info h4 {
    font-size: 14px;
    color: #333;
    margin: 0 0 10px;
    height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .recommended-info .price {
    font-size: 18px;
    color: #f56c6c;
    font-weight: bold;
    margin: 0;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .product-container {
      flex-direction: column;
    }
    
    .product-gallery {
      flex: none;
    }
    
    .recommended-products .el-col {
      width: 100%;
    }
  }
  </style>