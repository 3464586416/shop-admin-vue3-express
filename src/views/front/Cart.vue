<template>
    <div class="cart-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>购物车</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
  
      <div class="cart-container">
        <!-- 购物车为空 -->
        <div v-if="cartItems.length === 0 && !loading" class="empty-cart">
          <el-empty description="购物车还是空的">
            <template #image>
              <el-icon :size="100" color="#C0C4CC">
                <ShoppingCart />
              </el-icon>
            </template>
            <el-button type="primary" @click="goToCategory">去逛逛</el-button>
          </el-empty>
        </div>
  
        <!-- 购物车有商品 -->
        <div v-else class="cart-content">
          <el-card class="cart-card">
            <template #header>
              <div class="cart-header">
                <div class="header-left">
                  <el-checkbox
                    v-model="allSelected"
                    :indeterminate="isIndeterminate"
                    @change="handleSelectAll"
                  >
                    全选
                  </el-checkbox>
                  <span class="item-count">已选择 {{ selectedCount }} 件商品</span>
                </div>
                <div class="header-right">
                  <el-button type="text" @click="clearCart" :loading="clearing">
                    清空购物车
                  </el-button>
                </div>
              </div>
            </template>
  
            <!-- 购物车列表 -->
            <div class="cart-list">
              <div v-for="item in cartItems" :key="item.id" class="cart-item">
                <div class="item-check">
                  <el-checkbox
                    v-model="item.selected"
                    @change="handleItemSelect(item)"
                    :disabled="item.product_stock === 0"
                  />
                </div>
                
                <div class="item-info">
                  <el-image
                    :src="item.product_image || '/images/default-product.jpg'"
                    :preview-src-list="[item.product_image]"
                    fit="cover"
                    class="item-image"
                  />
                  <div class="item-details">
                    <h4 class="item-title" @click="goToProduct(item.product_id)">
                      {{ item.product_name }}
                    </h4>
                    <p class="item-spec">规格：默认</p>
                    <div class="item-status">
                      <el-tag
                        v-if="item.product_status === 'active' && item.product_stock > 0"
                        type="success"
                        size="small"
                      >
                        有货
                      </el-tag>
                      <el-tag
                        v-else-if="item.product_status === 'active' && item.product_stock === 0"
                        type="info"
                        size="small"
                      >
                        已售罄
                      </el-tag>
                      <el-tag v-else type="danger" size="small">
                        已下架
                      </el-tag>
                      
                      <span v-if="item.product_stock > 0 && item.quantity > item.product_stock" class="stock-warning">
                        库存仅剩 {{ item.product_stock }} 件
                      </span>
                    </div>
                  </div>
                </div>
  
                <div class="item-price">
                  <div class="price-current">¥{{ item.product_price.toFixed(2) }}</div>
                  <div class="price-total">
                    小计：¥{{ (item.product_price * item.quantity).toFixed(2) }}
                  </div>
                </div>
  
                <div class="item-quantity">
                  <el-input-number
                    v-model="item.quantity"
                    :min="1"
                    :max="Math.min(item.product_stock, 99)"
                    :disabled="item.product_stock === 0 || item.product_status !== 'active'"
                    size="small"
                    controls-position="right"
                    @change="updateQuantity(item)"
                  />
                </div>
  
                <div class="item-actions">
                  <el-button
                    type="text"
                    size="small"
                    @click="removeItem(item.id)"
                    :loading="item.deleting"
                  >
                    删除
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="addToFavorites(item.product_id)"
                  >
                    移入收藏夹
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
  
          <!-- 购物车汇总 -->
          <el-card class="summary-card" shadow="always">
            <div class="summary-content">
              <div class="summary-info">
                <div class="selected-info">
                  <span>已选 {{ selectedCount }} 件商品</span>
                  <span class="total-price">
                    合计：<span class="price">¥{{ selectedTotal.toFixed(2) }}</span>
                  </span>
                </div>
                <div class="discount-info" v-if="selectedTotal > 0">
                  <span>已节省：¥0.00</span>
                </div>
              </div>
              
              <div class="summary-actions">
                <el-button
                  type="primary"
                  size="large"
                  :disabled="selectedCount === 0"
                  @click="checkout"
                  :loading="checkingOut"
                >
                  去结算 ({{ selectedCount }})
                </el-button>
                <el-button @click="continueShopping">继续购物</el-button>
              </div>
            </div>
          </el-card>
  
          <!-- 推荐商品 -->
          <div class="recommended-products">
            <div class="section-header">
              <h3>猜你喜欢</h3>
            </div>
            <el-row :gutter="20" v-loading="loadingRecommended">
              <el-col :span="6" v-for="product in recommendedProducts" :key="product.id">
                <el-card class="product-card" shadow="hover" @click="goToProduct(product.id)">
                  <div class="product-image">
                    <el-image :src="product.image_url || '/images/default-product.jpg'" fit="cover" />
                  </div>
                  <div class="product-info">
                    <h4>{{ product.name }}</h4>
                    <p class="price">¥{{ product.price.toFixed(2) }}</p>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ShoppingCart } from '@element-plus/icons-vue'
  
  import api from '@/api/index'
  
  const router = useRouter()
  
  // 购物车数据
  const cartItems = ref([])
  const loading = ref(false)
  const clearing = ref(false)
  const checkingOut = ref(false)
  
  // 推荐商品
  const recommendedProducts = ref([])
  const loadingRecommended = ref(false)
  
  // 计算属性
  const allSelected = computed({
    get: () => {
      const validItems = cartItems.value.filter(item => 
        item.product_status === 'active' && item.product_stock > 0
      )
      if (validItems.length === 0) return false
      return validItems.every(item => item.selected)
    },
    set: (value) => {
      cartItems.value.forEach(item => {
        if (item.product_status === 'active' && item.product_stock > 0) {
          item.selected = value
        }
      })
    }
  })
  
  const isIndeterminate = computed(() => {
    const validItems = cartItems.value.filter(item => 
      item.product_status === 'active' && item.product_stock > 0
    )
    const selectedValidItems = validItems.filter(item => item.selected)
    return selectedValidItems.length > 0 && selectedValidItems.length < validItems.length
  })
  
  const selectedCount = computed(() => {
    return cartItems.value.filter(item => item.selected).length
  })
  
  const selectedTotal = computed(() => {
    return cartItems.value
      .filter(item => item.selected)
      .reduce((total, item) => {
        return total + (item.product_price * item.quantity)
      }, 0)
  })
  
  // 方法
  const loadCartItems = async () => {
    loading.value = true
    try {
      const response = await api.cart.getCart()
      cartItems.value = response.data.items.map(item => ({
        ...item,
        selected: false,
        deleting: false
      }))
    } catch (error) {
      console.error('加载购物车失败:', error)
      if (error.response?.status === 401) {
        ElMessage.warning('请先登录')
        router.push('/admin/login')
      } else {
        ElMessage.error('加载购物车失败')
      }
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
  
  const handleSelectAll = (checked) => {
    cartItems.value.forEach(item => {
      if (item.product_status === 'active' && item.product_stock > 0) {
        item.selected = checked
      }
    })
  }
  
  const handleItemSelect = (item) => {
    // 如果商品已下架或库存为0，不允许选中
    if (item.product_status !== 'active' || item.product_stock === 0) {
      item.selected = false
    }
  }
  
  const updateQuantity = async (item) => {
    try {
      await api.cart.updateQuantity(item.id, item.quantity)
      
      // 如果数量超过库存，调整数量
      if (item.quantity > item.product_stock) {
        item.quantity = item.product_stock
        ElMessage.warning(`库存仅剩 ${item.product_stock} 件`)
      }
    } catch (error) {
      console.error('更新数量失败:', error)
      ElMessage.error('更新数量失败')
    }
  }
  
  const removeItem = async (cartItemId) => {
    try {
      await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
        type: 'warning'
      })
      
      const item = cartItems.value.find(item => item.id === cartItemId)
      if (item) {
        item.deleting = true
      }
      
      await api.cart.removeItem(cartItemId)
      await loadCartItems()
      window.dispatchEvent(new Event('cart-updated'))
      
      ElMessage.success('删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除商品失败:', error)
        ElMessage.error('删除失败')
      }
    }
  }
  
  const clearCart = async () => {
    try {
      await ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
        type: 'warning'
      })
      
      clearing.value = true
      await api.cart.clearCart()
      await loadCartItems()
      
      ElMessage.success('购物车已清空')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('清空购物车失败:', error)
        ElMessage.error('清空失败')
      }
    } finally {
      clearing.value = false
    }
  }
  
  const addToFavorites = (productId) => {
    // 这里可以调用收藏接口
    ElMessage.success('已添加到收藏夹')
  }
  
  const checkout = async () => {
    const selectedItems = cartItems.value.filter(item => item.selected)
    
    // 检查选中的商品是否都有货
    const unavailableItems = selectedItems.filter(item => 
      item.product_status !== 'active' || item.product_stock === 0
    )
    
    if (unavailableItems.length > 0) {
      ElMessage.error('选中的商品中包含已下架或无货商品，请重新选择')
      return
    }
    
    // 检查库存
    const outOfStockItems = selectedItems.filter(item => item.quantity > item.product_stock)
    if (outOfStockItems.length > 0) {
      ElMessage.error('部分商品库存不足，请调整数量')
      return
    }
    
    checkingOut.value = true
    try {
      // 这里可以跳转到结算页面或直接创建订单
      const response = await api.orders.createOrder()
      
      if (response.data.order_id) {
        ElMessage.success('订单创建成功')
        router.push(`/orders/${response.data.order_id}`)
      } else {
        // 如果后端没有返回订单ID，跳转到订单列表
        router.push('/orders')
      }
    } catch (error) {
      console.error('结算失败:', error)
      ElMessage.error(error.response?.data?.message || '结算失败')
    } finally {
      checkingOut.value = false
    }
  }
  
  const continueShopping = () => {
    router.push('/category')
  }
  
  const goToCategory = () => {
    router.push('/category')
  }
  
  const goToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }
  
  // 生命周期
  onMounted(() => {
    loadCartItems()
    loadRecommendedProducts()
  })
  </script>
  
  <style scoped>
  .cart-page {
    min-height: 100vh;
    background-color: #f8f9fa;
    padding-bottom: 40px;
  }
  
  .breadcrumb {
    max-width: 1200px;
    margin: 20px auto;
    padding: 0 20px;
  }
  
  .cart-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  /* 空购物车样式 */
  .empty-cart {
    background: #fff;
    border-radius: 8px;
    padding: 80px 0;
    text-align: center;
    margin-top: 20px;
  }
  
  /* 购物车内容样式 */
  .cart-content {
    margin-top: 20px;
  }
  
  .cart-card {
    border: none;
    margin-bottom: 20px;
  }
  
  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .item-count {
    color: #666;
    font-size: 14px;
  }
  
  /* 购物车列表样式 */
  .cart-list {
    border-top: 1px solid #f0f0f0;
  }
  
  .cart-item {
    display: flex;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .cart-item:last-child {
    border-bottom: none;
  }
  
  .item-check {
    width: 60px;
    text-align: center;
  }
  
  .item-info {
    flex: 1;
    display: flex;
    gap: 15px;
  }
  
  .item-image {
    width: 120px;
    height: 120px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
  }
  
  .item-details {
    flex: 1;
  }
  
  .item-title {
    font-size: 16px;
    color: #333;
    margin: 0 0 10px;
    cursor: pointer;
    transition: color 0.3s ease;
  }
  
  .item-title:hover {
    color: #409EFF;
  }
  
  .item-spec {
    color: #999;
    font-size: 14px;
    margin: 0 0 10px;
  }
  
  .item-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .stock-warning {
    color: #f56c6c;
    font-size: 12px;
  }
  
  .item-price {
    width: 150px;
    text-align: right;
  }
  
  .price-current {
    font-size: 18px;
    color: #f56c6c;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .price-total {
    color: #999;
    font-size: 14px;
  }
  
  .item-quantity {
    width: 120px;
    text-align: center;
  }
  
  .item-actions {
    width: 100px;
    text-align: center;
  }
  
  .item-actions .el-button {
    display: block;
    margin: 5px 0;
  }
  
  /* 汇总样式 */
  .summary-card {
    border: none;
    position: sticky;
    bottom: 0;
    z-index: 100;
  }
  
  .summary-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .summary-info {
    flex: 1;
  }
  
  .selected-info {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 10px;
  }
  
  .selected-info span:first-child {
    color: #333;
    font-size: 14px;
  }
  
  .total-price {
    font-size: 14px;
    color: #333;
  }
  
  .total-price .price {
    font-size: 24px;
    color: #f56c6c;
    font-weight: bold;
  }
  
  .discount-info {
    color: #67C23A;
    font-size: 12px;
  }
  
  .summary-actions {
    display: flex;
    gap: 15px;
  }
  
  /* 推荐商品样式 */
  .recommended-products {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 1px solid #f0f0f0;
  }
  
  .section-header {
    margin-bottom: 20px;
  }
  
  .section-header h3 {
    font-size: 18px;
    color: #333;
    margin: 0;
    padding-bottom: 10px;
    border-bottom: 2px solid #f56c6c;
  }
  
  .product-card {
    margin-bottom: 20px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .product-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .product-image {
    height: 150px;
    overflow: hidden;
    border-radius: 4px;
  }
  
  .product-image .el-image {
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease;
  }
  
  .product-card:hover .product-image .el-image {
    transform: scale(1.05);
  }
  
  .product-info {
    padding: 15px 0 0;
  }
  
  .product-info h4 {
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
  
  .product-info .price {
    font-size: 18px;
    color: #f56c6c;
    font-weight: bold;
    margin: 0;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .cart-item {
      flex-wrap: wrap;
      position: relative;
    }
    
    .item-check {
      position: absolute;
      left: 10px;
      top: 10px;
      width: auto;
    }
    
    .item-info {
      width: 100%;
      margin-left: 30px;
    }
    
    .item-price, .item-quantity, .item-actions {
      width: auto;
      flex: 1;
      text-align: center;
      margin-top: 15px;
    }
    
    .summary-content {
      flex-direction: column;
      gap: 15px;
    }
    
    .recommended-products .el-col {
      width: 100%;
    }
  }
  </style>