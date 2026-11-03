<template>
  <div class="message-management">
    <div class="page-head">
      <h2>消息管理</h2>
      <el-button @click="$router.push('/admin/dashboard')">返回仪表盘</el-button>
    </div>
    <el-card shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="filters.search"
          placeholder="搜索标题 / 内容 / 用户"
          clearable
          style="width: 240px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select v-model="filters.is_read" placeholder="全部状态" clearable style="width: 130px" @change="reload">
          <el-option label="未读" value="false" />
          <el-option label="已读" value="true" />
        </el-select>
        <el-button type="primary" @click="reload">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="success" @click="openSend">发送留言</el-button>
        <span class="total-tip">共 {{ pagination.total }} 条留言</span>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="user_name" label="用户" width="130" />
        <el-table-column prop="title" label="标题" width="180" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_read ? 'success' : 'warning'">{{ row.is_read ? '已读' : '未读' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">{{ fmt(row.create_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.is_read" size="small" @click="markRead(row)">标记已读</el-button>
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
        @current-change="loadMessages"
        @size-change="reload"
      />
    </el-card>

    <el-dialog v-model="sendVisible" title="发送留言" width="480px">
      <el-form :model="sendForm" label-width="70px">
        <el-form-item label="接收用户">
          <el-select v-model="sendForm.user_id" filterable placeholder="选择用户" style="width: 100%">
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="`${u.username}（${u.email || '无邮箱'}）`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="sendForm.title" placeholder="留言标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="sendForm.content" type="textarea" :rows="4" placeholder="留言内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sendVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="doSend">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const route = useRoute()

const fmt = (v) => (v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-')

const list = ref([])
const loading = ref(false)
const filters = reactive({ search: '', is_read: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })

const sendVisible = ref(false)
const sending = ref(false)
const userOptions = ref([])
const sendForm = reactive({ user_id: null, title: '', content: '' })

const loadMessages = async () => {
  loading.value = true
  try {
    const params = { page: pagination.current, limit: pagination.size }
    if (filters.search) params.search = filters.search
    if (filters.is_read !== '') params.is_read = filters.is_read
    const response = await api.messages.getAdminMessages(params)
    list.value = response.data.messages || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('加载留言失败:', error)
    ElMessage.error('加载留言失败')
  } finally {
    loading.value = false
  }
}

const reload = () => {
  pagination.current = 1
  loadMessages()
}

const resetFilters = () => {
  filters.search = ''
  filters.is_read = ''
  reload()
}

const markRead = async (row) => {
  try {
    await api.messages.markAdminMessageRead(row.id)
    row.is_read = 1
    ElMessage.success('已标记为已读')
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('标记已读失败')
  }
}

const openSend = async () => {
  sendVisible.value = true
  if (userOptions.value.length === 0) {
    try {
      const response = await api.users.getAllUsers({ page: 1, limit: 100 })
      userOptions.value = response.data.users || []
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }
}

const doSend = async () => {
  if (!sendForm.user_id || !sendForm.title || !sendForm.content) {
    ElMessage.warning('请填写接收用户、标题和内容')
    return
  }
  sending.value = true
  try {
    await api.messages.sendMessage({ ...sendForm })
    ElMessage.success('留言已发送')
    sendVisible.value = false
    sendForm.user_id = null
    sendForm.title = ''
    sendForm.content = ''
    reload()
  } catch (error) {
    console.error('发送失败:', error)
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadMessages()
  if (route.meta.autoSend) {
    openSend()
  }
})
</script>

<style scoped>
.page-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.page-head h2{margin:0;font-size:22px;color:#303133}
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
