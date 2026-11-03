import request from './request.js'

// 认证相关API
export const auth = {
  // 用户登录
  login: (data) => {
    return request.post('/api/auth/login', data)
  },
  
  // 用户注册
  register: (data) => {
    return request.post('/api/auth/register', data)
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return request.get('/api/auth/me')
  },
  
  // 修改密码
  changePassword: (data) => {
    return request.put('/api/auth/change-password', data)
  }
}

// 商品相关API
export const products = {
  // 获取商品列表
  getProducts: (params = {}) => {
    return request.get('/api/products', { params })
  },
  
  // 获取单个商品
  getProduct: (id) => {
    return request.get(`/api/products/${id}`)
  },
  
  // 创建商品
  createProduct: (data) => {
    return request.post('/api/products', data)
  },
  
  // 更新商品
  updateProduct: (id, data) => {
    return request.put(`/api/products/${id}`, data)
  },
  
  // 删除商品
  deleteProduct: (id) => {
    return request.delete(`/api/products/${id}`)
  },
  
  // 搜索商品
  searchProducts: (keyword, params = {}) => {
    return request.get(`/api/products/search/${keyword}`, { params })
  },
  
  // 获取热门商品
  getHotProducts: (limit = 10) => {
    return request.get(`/api/products/hot/${limit}`)
  }
}

// 分类相关API
export const categories = {
  // 获取分类列表
  getCategories: () => {
    return request.get('/api/categories')
  },
  
  // 获取单个分类
  getCategory: (id) => {
    return request.get(`/api/categories/${id}`)
  },
  
  // 获取分类下的商品
  getCategoryProducts: (id, params = {}) => {
    return request.get(`/api/categories/${id}/products`, { params })
  },
  
  // 创建分类
  createCategory: (data) => {
    return request.post('/api/categories', data)
  },
  
  // 更新分类
  updateCategory: (id, data) => {
    return request.put(`/api/categories/${id}`, data)
  },
  
  // 删除分类
  deleteCategory: (id) => {
    return request.delete(`/api/categories/${id}`)
  },
  
  // 获取分类统计
  getCategoryStats: () => {
    return request.get('/api/categories/stats/summary')
  }
}

// 购物车相关API
export const cart = {
  // 获取购物车
  getCart: () => {
    return request.get('/api/cart')
  },
  
  // 添加到购物车
  addToCart: (productId, quantity = 1) => {
    return request.post('/api/cart/add', {
      product_id: productId,
      quantity
    })
  },
  
  // 更新购物车商品数量
  updateQuantity: (cartItemId, quantity) => {
    return request.put(`/api/cart/update/${cartItemId}`, { quantity })
  },
  
  // 从购物车移除商品
  removeItem: (cartItemId) => {
    return request.delete(`/api/cart/remove/${cartItemId}`)
  },
  
  // 清空购物车
  clearCart: () => {
    return request.delete('/api/cart/clear')
  },
  
  // 获取购物车商品数量
  getCartCount: () => {
    return request.get('/api/cart/count')
  },
  
  // 批量操作
  batchOperation: (action, items) => {
    return request.post('/api/cart/batch', { action, items })
  }
}

// 订单相关API
export const orders = {
  // 创建订单
  createOrder: () => {
    return request.post('/api/orders/create')
  },
  
  // 获取用户订单列表
  getUserOrders: (params = {}) => {
    return request.get('/api/orders/my-orders', { params })
  },
  
  // 获取订单详情
  getOrder: (orderId) => {
    return request.get(`/api/orders/${orderId}`)
  },
  
  // 取消订单
  cancelOrder: (orderId) => {
    return request.put(`/api/orders/${orderId}/cancel`)
  },
  
  // 获取订单统计
  getOrderStats: () => {
    return request.get('/api/orders/stats/summary')
  },
  
  // 管理员获取所有订单
  getAllOrders: (params = {}) => {
    return request.get('/api/orders/admin/all', { params })
  },
  
  // 管理员更新订单状态
  updateOrderStatus: (orderId, status) => {
    return request.put(`/api/orders/admin/${orderId}/status`, { status })
  },
  
  // 获取最新订单（管理员）
  getRecentOrders: (params = {}) => {
    return request.get('/api/orders/admin/all', {
      params: {
        page: 1,
        limit: 5,
        ...params
      }
    })
  }
}

// 消息相关API
export const messages = {
  // 获取消息列表
  getMessages: (params = {}) => {
    return request.get('/api/messages', { params })
  },
  
  // 获取消息详情
  getMessage: (messageId) => {
    return request.get(`/api/messages/${messageId}`)
  },
  
  // 标记消息为已读
  markAsRead: (messageId) => {
    return request.put(`/api/messages/${messageId}/read`)
  },
  
  // 批量标记为已读
  markAllAsRead: () => {
    return request.put('/api/messages/batch/read', {
      message_ids: [] // 空数组表示全部
    })
  },
  
  // 删除消息
  deleteMessage: (messageId) => {
    return request.delete(`/api/messages/${messageId}`)
  },
  
  // 批量删除
  deleteBatch: (messageIds) => {
    return request.delete('/api/messages/batch/delete', {
      data: { message_ids: messageIds }
    })
  },
  
  // 发送消息（管理员）
  sendMessage: (data) => {
    return request.post('/api/messages/send', data)
  },
  
  // 获取未读消息数量
  getUnreadCount: () => {
    return request.get('/api/messages/unread/count')
  },
  
  // 清空已读消息
  clearRead: () => {
    return request.delete('/api/messages/clear/read')
  }
}

// 用户相关API
export const users = {
  // 获取当前用户信息
  getProfile: () => {
    return request.get('/api/users/profile')
  },
  
  // 更新用户信息
  updateProfile: (data) => {
    return request.put('/api/users/profile', data)
  },
  
  // 修改密码
  changePassword: (data) => {
    return request.put('/api/users/change-password', data)
  },
  
  // 获取用户统计
  getUserStats: () => {
    return request.get('/api/users/stats')
  },
  
  // 管理员获取所有用户
  getAllUsers: (params = {}) => {
    return request.get('/api/users/admin/all', { params })
  },
  
  // 管理员获取用户详情
  getUserDetail: (userId) => {
    return request.get(`/api/users/admin/${userId}`)
  },
  
  // 管理员更新用户信息
  updateUser: (userId, data) => {
    return request.put(`/api/users/admin/${userId}`, data)
  },
  
  // 管理员删除用户
  deleteUser: (userId) => {
    return request.delete(`/api/users/admin/${userId}`)
  }
}

// 管理后台API
export const admin = {
  // 获取仪表盘统计数据
  getDashboardStats: () => {
    return request.get('/api/admin/dashboard/stats')
  },
  
  // 获取销售图表数据
  getSalesChart: (params = {}) => {
    return request.get('/api/admin/dashboard/charts/sales', { params })
  },
  
  // 获取热门商品
  getTopProducts: (params = {}) => {
    return request.get('/api/admin/dashboard/top-products', { params })
  },
  
  // 获取用户活跃度统计
  getUserActivity: (params = {}) => {
    return request.get('/api/admin/dashboard/user-activity', { params })
  },
  
  // 获取库存预警商品
  getLowStockProducts: (params = {}) => {
    return request.get('/api/admin/dashboard/low-stock', { params })
  },
  
  // 获取系统概览
  getSystemOverview: () => {
    return request.get('/api/admin/system/overview')
  },
  
  // 数据清理
  cleanupData: (data) => {
    return request.post('/api/admin/cleanup', data)
  },
  
  // 导出数据
  exportData: (dataType, params = {}) => {
    return request.get(`/api/admin/export/${dataType}`, { params })
  }
}

// 文件上传API
export const files = {
  // 上传文件
  uploadFile: (file, uploadType = 'products') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_type', uploadType)
    
    return request.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // 上传多个文件
  uploadMultiple: (files, uploadType = 'products') => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('upload_type', uploadType)
    
    return request.post('/api/files/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // 删除文件
  deleteFile: (fileUrl) => {
    return request.delete('/api/files/delete', {
      data: { file_url: fileUrl }
    })
  },
  
  // 获取文件列表
  getFileList: (params = {}) => {
    return request.get('/api/files/list', { params })
  }
}

// 导出所有API
export default {
  auth,
  products,
  categories,
  cart,
  orders,
  messages,
  users,
  admin,
  files
}