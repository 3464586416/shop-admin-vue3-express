<template>
    <div class="message-page">
      <!-- 面包屑导航 -->
      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>消息中心</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
  
      <div class="message-container">
        <el-row :gutter="20">
          <!-- 左侧消息类型 -->
          <el-col :span="6">
            <el-card class="message-sidebar">
              <template #header>
                <div class="sidebar-header">
                  <h3>消息类型</h3>
                  <el-button type="text" size="small" @click="markAllAsRead" :loading="markingAll">
                    全部已读
                  </el-button>
                </div>
              </template>
              
              <el-menu
                :default-active="activeType"
                class="type-menu"
                @select="handleTypeSelect"
              >
                <el-menu-item index="all">
                  <span>全部消息</span>
                  <el-badge :value="totalCount" :max="99" />
                </el-menu-item>
                <el-menu-item index="unread">
                  <span>未读消息</span>
                  <el-badge :value="unreadCount" :max="99" type="danger" />
                </el-menu-item>
                <el-menu-item index="system">
                  <span>系统通知</span>
                  <el-badge :value="typeCount.system" :max="99" />
                </el-menu-item>
                <el-menu-item index="order">
                  <span>订单消息</span>
                  <el-badge :value="typeCount.order" :max="99" />
                </el-menu-item>
                <el-menu-item index="promotion">
                  <span>活动优惠</span>
                  <el-badge :value="typeCount.promotion" :max="99" />
                </el-menu-item>
                <el-menu-item index="other">
                  <span>其他消息</span>
                  <el-badge :value="typeCount.other" :max="99" />
                </el-menu-item>
              </el-menu>
              
              <div class="sidebar-actions">
                <el-button type="text" @click="showFilter = !showFilter">
                  <el-icon><Filter /></el-icon>
                  筛选
                </el-button>
                <el-button type="text" @click="clearRead" :loading="clearing">
                  清空已读
                </el-button>
              </div>
              
              <!-- 筛选面板 -->
              <el-collapse-transition>
                <div v-show="showFilter" class="filter-panel">
                  <div class="filter-group">
                    <h4>时间范围</h4>
                    <el-date-picker
                      v-model="filter.dateRange"
                      type="daterange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      size="small"
                      style="width: 100%"
                    />
                  </div>
                  <div class="filter-group">
                    <h4>关键词</h4>
                    <el-input
                      v-model="filter.keyword"
                      placeholder="搜索消息内容"
                      size="small"
                      clearable
                    />
                  </div>
                  <div class="filter-actions">
                    <el-button type="primary" size="small" @click="applyFilter">
                      应用筛选
                    </el-button>
                    <el-button size="small" @click="resetFilter">
                      重置
                    </el-button>
                  </div>
                </div>
              </el-collapse-transition>
            </el-card>
          </el-col>
  
          <!-- 右侧消息列表 -->
          <el-col :span="18">
            <el-card class="message-content">
              <template #header>
                <div class="content-header">
                  <div class="header-left">
                    <h3>{{ getTypeTitle(activeType) }}</h3>
                    <span class="message-count">共 {{ filteredMessages.length }} 条消息</span>
                  </div>
                  <div class="header-right">
                    <el-button-group>
                      <el-button
                        :type="viewMode === 'list' ? 'primary' : 'default'"
                        size="small"
                        @click="viewMode = 'list'"
                      >
                        <el-icon><Menu /></el-icon>
                      </el-button>
                      <el-button
                        :type="viewMode === 'card' ? 'primary' : 'default'"
                        size="small"
                        @click="viewMode = 'card'"
                      >
                        <el-icon><Grid /></el-icon>
                      </el-button>
                    </el-button-group>
                    <el-button
                      type="danger"
                      size="small"
                      :disabled="selectedMessages.length === 0"
                      @click="deleteSelected"
                      :loading="deleting"
                    >
                      删除选中
                    </el-button>
                  </div>
                </div>
              </template>
  
              <!-- 加载状态 -->
              <div v-if="loading" class="loading-container">
                <el-skeleton :rows="5" animated />
              </div>
  
              <!-- 空状态 -->
              <div v-else-if="filteredMessages.length === 0" class="empty-container">
                <el-empty :description="getEmptyDescription()">
                  <el-button type="primary" @click="resetFilter">查看全部消息</el-button>
                </el-empty>
              </div>
  
              <!-- 列表视图 -->
              <div v-else-if="viewMode === 'list'" class="message-list">
                <el-table
                  :data="filteredMessages"
                  style="width: 100%"
                  @selection-change="handleSelectionChange"
                >
                  <el-table-column type="selection" width="55" />
                  <el-table-column width="80">
                    <template #default="{ row }">
                      <el-avatar
                        :size="40"
                        :style="{ backgroundColor: getTypeColor(row.type) }"
                      >
                        <el-icon v-if="!row.icon">
                          <component :is="getTypeIcon(row.type)" />
                        </el-icon>
                      </el-avatar>
                    </template>
                  </el-table-column>
                  <el-table-column label="消息内容" min-width="300">
                    <template #default="{ row }">
                      <div class="message-item" @click="viewMessage(row)">
                        <div class="message-title">
                          <span :class="{ 'unread-title': !row.is_read }">{{ row.title }}</span>
                          <el-tag
                            v-if="!row.is_read"
                            size="small"
                            type="danger"
                            effect="plain"
                          >
                            新
                          </el-tag>
                          <el-tag
                            v-if="row.type"
                            size="small"
                            :type="getTagType(row.type)"
                          >
                            {{ getTypeName(row.type) }}
                          </el-tag>
                        </div>
                        <div class="message-preview">
                          {{ truncateContent(row.content) }}
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="create_time" label="时间" width="180">
                    <template #default="{ row }">
                      <div class="message-time">
                        {{ formatTime(row.create_time) }}
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button-group size="small">
                        <el-button
                          type="text"
                          @click="viewMessage(row)"
                        >
                          查看
                        </el-button>
                        <el-button
                          type="text"
                          @click="deleteMessage(row.id)"
                          :loading="row.deleting"
                        >
                          删除
                        </el-button>
                      </el-button-group>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
  
              <!-- 卡片视图 -->
              <div v-else class="message-grid">
                <el-row :gutter="20">
                  <el-col :span="12" v-for="message in filteredMessages" :key="message.id">
                    <el-card
                      :class="['message-card', { 'unread-card': !message.is_read }]"
                      shadow="hover"
                      @click="viewMessage(message)"
                    >
                      <div class="card-header">
                        <div class="card-type">
                          <el-tag
                            size="small"
                            :type="getTagType(message.type)"
                            effect="plain"
                          >
                            {{ getTypeName(message.type) }}
                          </el-tag>
                          <el-tag
                            v-if="!message.is_read"
                            size="small"
                            type="danger"
                            effect="plain"
                          >
                            未读
                          </el-tag>
                        </div>
                        <div class="card-time">
                          {{ formatTime(message.create_time, 'MM-DD HH:mm') }}
                        </div>
                      </div>
                      <div class="card-content">
                        <h4 :class="{ 'unread-title': !message.is_read }">
                          {{ message.title }}
                        </h4>
                        <p class="content-preview">
                          {{ truncateContent(message.content, 100) }}
                        </p>
                      </div>
                      <div class="card-actions">
                        <el-button
                          type="text"
                          size="small"
                          @click.stop="toggleRead(message)"
                        >
                          {{ message.is_read ? '标记未读' : '标记已读' }}
                        </el-button>
                        <el-button
                          type="text"
                          size="small"
                          @click.stop="deleteMessage(message.id)"
                          :loading="message.deleting"
                        >
                          删除
                        </el-button>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
              </div>
  
              <!-- 分页 -->
              <div v-if="filteredMessages.length > 0" class="pagination-container">
                <el-pagination
                  v-model:current-page="pagination.current"
                  v-model:page-size="pagination.size"
                  :total="pagination.total"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
  
      <!-- 消息详情对话框 -->
      <el-dialog
        v-model="detailVisible"
        :title="currentMessage?.title"
        width="600px"
        destroy-on-close
      >
        <div v-if="currentMessage" class="message-detail">
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">消息类型：</span>
              <el-tag :type="getTagType(currentMessage.type)" size="small">
                {{ getTypeName(currentMessage.type) }}
              </el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">发送时间：</span>
              <span class="meta-value">{{ formatTime(currentMessage.create_time) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">消息状态：</span>
              <el-tag
                :type="currentMessage.is_read ? 'success' : 'warning'"
                size="small"
              >
                {{ currentMessage.is_read ? '已读' : '未读' }}
              </el-tag>
            </div>
          </div>
          
          <div class="detail-content">
            <div class="content-text">
              {{ currentMessage.content }}
            </div>
          </div>
        </div>
        
        <template #footer>
          <span class="dialog-footer">
            <el-button
              @click="detailVisible = false"
            >
              关闭
            </el-button>
            <el-button
              type="primary"
              @click="detailVisible = false"
            >
              确定
            </el-button>
            <el-button
              v-if="currentMessage && !currentMessage.is_read"
              type="success"
              @click="markMessageAsRead(currentMessage.id)"
            >
              标记为已读
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    Filter,
    Menu,
    Grid,
    Bell,
    ShoppingCart,
    Promotion,
    ChatDotRound,
    InfoFilled
  } from '@element-plus/icons-vue'
  import { format } from 'date-fns'
  
  import api from '@/api/index'
  
  const router = useRouter()
  
  // 消息数据
  const messages = ref([])
  const loading = ref(false)
  const markingAll = ref(false)
  const clearing = ref(false)
  const deleting = ref(false)
  const detailVisible = ref(false)
  const currentMessage = ref(null)
  
  // 视图相关
  const activeType = ref('all')
  const viewMode = ref('list')
  const showFilter = ref(false)
  
  // 筛选条件
  const filter = reactive({
    dateRange: [],
    keyword: ''
  })
  
  // 分页
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })
  
  // 选中的消息
  const selectedMessages = ref([])
  
  // 消息类型映射
  const messageTypes = {
    system: { name: '系统通知', icon: Bell, color: '#409EFF', tag: 'primary' },
    order: { name: '订单消息', icon: ShoppingCart, color: '#67C23A', tag: 'success' },
    promotion: { name: '活动优惠', icon: Promotion, color: '#E6A23C', tag: 'warning' },
    other: { name: '其他消息', icon: ChatDotRound, color: '#909399', tag: 'info' }
  }
  
  // 计算属性
  const typeCount = computed(() => {
    const counts = {
      system: 0,
      order: 0,
      promotion: 0,
      other: 0
    }
    
    messages.value.forEach(msg => {
      if (msg.type && counts[msg.type] !== undefined) {
        counts[msg.type]++
      }
    })
    
    return counts
  })
  
  const totalCount = computed(() => messages.value.length)
  const unreadCount = computed(() => messages.value.filter(msg => !msg.is_read).length)
  
  const filteredMessages = computed(() => {
    let filtered = [...messages.value]
    
    // 按类型筛选
    if (activeType.value === 'unread') {
      filtered = filtered.filter(msg => !msg.is_read)
    } else if (activeType.value !== 'all') {
      filtered = filtered.filter(msg => msg.type === activeType.value)
    }
    
    // 按关键词筛选
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      filtered = filtered.filter(msg => 
        msg.title.toLowerCase().includes(keyword) || 
        msg.content.toLowerCase().includes(keyword)
      )
    }
    
    // 按时间筛选
    if (filter.dateRange && filter.dateRange.length === 2) {
      const [start, end] = filter.dateRange
      filtered = filtered.filter(msg => {
        const msgTime = new Date(msg.create_time)
        return msgTime >= start && msgTime <= end
      })
    }
    
    // 更新分页总数
    pagination.total = filtered.length
    
    // 分页处理
    const start = (pagination.current - 1) * pagination.size
    const end = start + pagination.size
    return filtered.slice(start, end)
  })
  
  // 辅助函数
  const getTypeTitle = (type) => {
    const titles = {
      all: '全部消息',
      unread: '未读消息',
      system: '系统通知',
      order: '订单消息',
      promotion: '活动优惠',
      other: '其他消息'
    }
    return titles[type] || '全部消息'
  }
  
  const getTypeName = (type) => {
    return messageTypes[type]?.name || '未知类型'
  }
  
  const getTypeIcon = (type) => {
    return messageTypes[type]?.icon || InfoFilled
  }
  
  const getTypeColor = (type) => {
    return messageTypes[type]?.color || '#909399'
  }
  
  const getTagType = (type) => {
    return messageTypes[type]?.tag || 'info'
  }
  
  const truncateContent = (content, length = 60) => {
    if (!content) return ''
    return content.length > length ? content.substring(0, length) + '...' : content
  }
  
  const formatTime = (time, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
    if (!time) return ''
    return format(new Date(time), formatStr)
  }
  
  const getEmptyDescription = () => {
    if (activeType.value === 'unread') return '暂无未读消息'
    if (activeType.value !== 'all') return `暂无${getTypeName(activeType.value)}`
    return '暂无消息'
  }
  
  // 方法
  const loadMessages = async () => {
    loading.value = true
    try {
      const response = await api.messages.getMessages({
        page: pagination.current,
        limit: pagination.size
      })
      messages.value = response.data.messages.map(msg => ({
        ...msg,
        deleting: false
      }))
      pagination.total = response.data.pagination?.total || 0
    } catch (error) {
      console.error('加载消息失败:', error)
      if (error.response?.status === 401) {
        ElMessage.warning('请先登录')
        router.push('/admin/login')
      } else {
        ElMessage.error('加载消息失败')
      }
    } finally {
      loading.value = false
    }
  }
  
  const handleTypeSelect = (type) => {
    activeType.value = type
    pagination.current = 1
  }
  
  const handleSelectionChange = (selection) => {
    selectedMessages.value = selection
  }
  
  const applyFilter = () => {
    pagination.current = 1
  }
  
  const resetFilter = () => {
    filter.dateRange = []
    filter.keyword = ''
    activeType.value = 'all'
    pagination.current = 1
  }
  
  const markAllAsRead = async () => {
    try {
      markingAll.value = true
      await api.messages.markAllAsRead()
      await loadMessages()
      ElMessage.success('全部消息已标记为已读')
    } catch (error) {
      console.error('标记全部为已读失败:', error)
      ElMessage.error('操作失败')
    } finally {
      markingAll.value = false
    }
  }
  
  const clearRead = async () => {
    try {
      await ElMessageBox.confirm('确定要清空所有已读消息吗？', '提示', {
        type: 'warning'
      })
      
      clearing.value = true
      await api.messages.clearRead()
      await loadMessages()
      ElMessage.success('已读消息已清空')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('清空已读消息失败:', error)
        ElMessage.error('清空失败')
      }
    } finally {
      clearing.value = false
    }
  }
  
  const viewMessage = async (message) => {
    currentMessage.value = message
    
    // 如果消息未读，标记为已读
    if (!message.is_read) {
      await markMessageAsRead(message.id)
    }
    
    detailVisible.value = true
  }
  
  const markMessageAsRead = async (messageId) => {
    try {
      await api.messages.markAsRead(messageId)
      
      // 更新本地数据
      const message = messages.value.find(msg => msg.id === messageId)
      if (message) {
        message.is_read = true
      }
      
      if (currentMessage.value && currentMessage.value.id === messageId) {
        currentMessage.value.is_read = true
      }
      
    } catch (error) {
      console.error('标记消息为已读失败:', error)
      ElMessage.error('操作失败')
    }
  }
  
  const toggleRead = async (message) => {
    try {
      if (message.is_read) {
        // 如果要标记为未读，这里需要后端支持
        ElMessage.warning('标记为未读功能需要后端支持')
      } else {
        await markMessageAsRead(message.id)
        ElMessage.success('已标记为已读')
      }
    } catch (error) {
      console.error('切换阅读状态失败:', error)
      ElMessage.error('操作失败')
    }
  }
  
  const deleteMessage = async (messageId) => {
    try {
      await ElMessageBox.confirm('确定要删除这条消息吗？', '提示', {
        type: 'warning'
      })
      
      const message = messages.value.find(msg => msg.id === messageId)
      if (message) {
        message.deleting = true
      }
      
      await api.messages.deleteMessage(messageId)
      await loadMessages()
      
      ElMessage.success('删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除消息失败:', error)
        ElMessage.error('删除失败')
      }
    }
  }
  
  const deleteSelected = async () => {
    if (selectedMessages.value.length === 0) {
      ElMessage.warning('请先选择消息')
      return
    }
    
    try {
      await ElMessageBox.confirm(`确定要删除选中的 ${selectedMessages.value.length} 条消息吗？`, '提示', {
        type: 'warning'
      })
      
      deleting.value = true
      const messageIds = selectedMessages.value.map(msg => msg.id)
      await api.messages.deleteBatch(messageIds)
      await loadMessages()
      
      ElMessage.success(`成功删除 ${messageIds.length} 条消息`)
      selectedMessages.value = []
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量删除消息失败:', error)
        ElMessage.error('删除失败')
      }
    } finally {
      deleting.value = false
    }
  }
  
  const handleSizeChange = (size) => {
    pagination.size = size
    pagination.current = 1
  }
  
  const handleCurrentChange = (page) => {
    pagination.current = page
  }
  
  // 生命周期
  onMounted(() => {
    loadMessages()
  })
  </script>
  
  <style scoped>
  .message-page {
    min-height: 100vh;
    background-color: #f8f9fa;
    padding-bottom: 40px;
  }
  
  .breadcrumb {
    max-width: 1200px;
    margin: 20px auto;
    padding: 0 20px;
  }
  
  .message-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  /* 侧边栏样式 */
  .message-sidebar {
    border: none;
  }
  
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .type-menu {
    border-right: none;
    margin-bottom: 20px;
  }
  
  .type-menu .el-menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 50px;
    line-height: 50px;
  }
  
  .sidebar-actions {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-top: 1px solid #f0f0f0;
  }
  
  .filter-panel {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  
  .filter-group {
    margin-bottom: 15px;
  }
  
  .filter-group h4 {
    margin: 0 0 8px;
    color: #666;
    font-size: 13px;
  }
  
  .filter-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }
  
  /* 内容区域样式 */
  .message-content {
    border: none;
    min-height: 600px;
  }
  
  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .header-left h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .message-count {
    color: #999;
    font-size: 14px;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  /* 列表视图样式 */
  .message-list {
    margin-top: 20px;
  }
  
  .message-item {
    cursor: pointer;
    padding: 10px 0;
  }
  
  .message-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
  }
  
  .unread-title {
    font-weight: bold;
    color: #333;
  }
  
  .message-preview {
    color: #999;
    font-size: 13px;
    line-height: 1.4;
  }
  
  .message-time {
    color: #999;
    font-size: 13px;
  }
  
  /* 卡片视图样式 */
  .message-grid {
    margin-top: 20px;
  }
  
  .message-card {
    margin-bottom: 20px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .message-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .unread-card {
    border-left: 4px solid #409EFF;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .card-type {
    display: flex;
    gap: 5px;
  }
  
  .card-time {
    color: #999;
    font-size: 12px;
  }
  
  .card-content h4 {
    margin: 0 0 10px;
    font-size: 16px;
    line-height: 1.4;
  }
  
  .content-preview {
    color: #666;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #f0f0f0;
  }
  
  /* 消息详情样式 */
  .message-detail {
    padding: 20px 0;
  }
  
  .detail-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .meta-label {
    color: #666;
    font-size: 14px;
  }
  
  .meta-value {
    color: #333;
    font-size: 14px;
  }
  
  .detail-content {
    line-height: 1.8;
    color: #333;
  }
  
  .content-text {
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  /* 加载和空状态 */
  .loading-container {
    padding: 60px 0;
  }
  
  .empty-container {
    padding: 100px 0;
  }
  
  /* 分页 */
  .pagination-container {
    margin-top: 30px;
    text-align: center;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .message-container .el-col-6,
    .message-container .el-col-18 {
      width: 100%;
    }
    
    .message-grid .el-col-12 {
      width: 100%;
    }
    
    .content-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    
    .header-right {
      width: 100%;
      justify-content: space-between;
    }
  }
  </style>