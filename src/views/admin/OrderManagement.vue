<template>
  <div class="order-management">
    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px" @change="reload">
          <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 260px"
          @change="reload"
        />
        <el-button type="primary" @click="reload">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <span class="total-tip">共 {{ pagination.total }} 笔订单</span>
      </div>

      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_number" label="订单号" width="150" />
        <el-table-column prop="user_name" label="下单用户" width="120" />
        <el-table-column prop="item_count" label="商品数" width="80" align="center" />
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.total_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" min-width="160">
          <template #default="{ row }">{{ fmt(row.create_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDetail(row)">详情</el-button>
            <el-dropdown
              v-if="row.status !== 'cancelled' && row.status !== 'completed'"
              @command="(cmd) => changeStatus(row, cmd)"
              style="margin-left: 8px"
            >
              <el-button size="small" type="primary" plain>更新状态</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="paid">标记已支付</el-dropdown-item>
                  <el-dropdown-item command="shipped">标记已发货</el-dropdown-item>
                  <el-dropdown-item command="completed">标记已完成</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadOrders"
        @size-change="reload"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="订单详情" width="640px">
      <el-descriptions :column="2" border size="small" v-if="detail.order">
        <el-descriptions-item label="订单号">{{ detail.order.order_number }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(detail.order.status)">{{ statusLabel(detail.order.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ Number(detail.order.total_price).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ fmt(detail.order.create_time) }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" size="small" style="margin-top: 12px">
        <el-table-column prop="product_name" label="商品" min-width="160" />
        <el-table-column label="单价" width="90" align="right">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const route = useRoute()

const statusOptions = [
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const statusMap = Object.fromEntries(statusOptions.map(s => [s.value, s.label]))
const tagMap = { pending: 'warning', paid: 'primary', shipped: '', completed: 'success', cancelled: 'info' }
const statusLabel = (s) => statusMap[s] || s
const statusTag = (s) => tagMap[s] || 'info'
const fmt = (v) => (v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-')

const orders = ref([])
const loading = ref(false)
const dateRange = ref(null)
const filters = reactive({ status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })

const detailVisible = ref(false)
const detail = reactive({ order: null, items: [] })

const applyPreset = () => {
  filters.status = route.meta.presetStatus || ''
}

const loadOrders = async () => {
  loading.value = true
  try {
    const params = { page: pagination.current, limit: pagination.size }
    if (filters.status) params.status = filters.status
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const response = await api.orders.getAllOrders(params)
    orders.value = response.data.orders || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('加载订单失败:', error)
    ElMessage.error('加载订单失败')
  } finally {
    loading.value = false
  }
}

const reload = () => {
  pagination.current = 1
  loadOrders()
}

const resetFilters = () => {
  filters.status = ''
  dateRange.value = null
  reload()
}

const openDetail = async (row) => {
  detail.order = row
  detail.items = []
  detailVisible.value = true
  try {
    const response = await api.orders.getOrder(row.id)
    detail.order = response.data.order
    detail.items = response.data.items || []
  } catch (error) {
    console.error('加载订单详情失败:', error)
    ElMessage.error('加载订单详情失败')
  }
}

const changeStatus = async (row, status) => {
  try {
    await api.orders.updateOrderStatus(row.id, status)
    ElMessage.success('订单状态已更新')
    loadOrders()
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
  }
}

watch(() => route.path, () => {
  applyPreset()
  reload()
})

onMounted(() => {
  applyPreset()
  loadOrders()
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.total-tip {
  margin-left: auto;
  color: #909399;
  font-size: 13px;
}
</style>
