<template>
  <div class="user-management">
    <div class="page-head">
      <h2>用户管理</h2>
      <el-button @click="$router.push('/admin/dashboard')">返回仪表盘</el-button>
    </div>
    <el-card shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="filters.search"
          placeholder="搜索用户名 / 邮箱"
          clearable
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
        <el-select v-model="filters.role" placeholder="全部角色" clearable style="width: 150px" @change="reload">
          <el-option label="超级管理员" value="超级管理员" />
          <el-option label="普通用户" value="普通用户" />
        </el-select>
        <el-button type="primary" @click="reload">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <span class="total-tip">共 {{ pagination.total }} 个用户</span>
      </div>

      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.role === '超级管理员' ? 'danger' : 'info'">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" min-width="160">
          <template #default="{ row }">{{ fmt(row.register_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :disabled="row.id === currentUserId"
              @click="removeUser(row)"
            >删除</el-button>
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
        @current-change="loadUsers"
        @size-change="reload"
      />
    </el-card>

    <el-dialog v-model="editVisible" title="编辑用户" width="420px">
      <el-form :model="editForm" label-width="70px">
        <el-form-item label="用户名">
          <el-input :model-value="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="用户邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="超级管理员" value="超级管理员" />
            <el-option label="普通用户" value="普通用户" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api/index'

const route = useRoute()

const fmt = (v) => (v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-')

const users = ref([])
const loading = ref(false)
const filters = reactive({ search: '', role: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const currentUserId = ref(null)
try {
  currentUserId.value = JSON.parse(localStorage.getItem('user_info') || '{}').id
} catch (e) { /* ignore */ }

const editVisible = ref(false)
const saving = ref(false)
const editForm = reactive({ id: null, username: '', email: '', role: '' })

const applyPreset = () => {
  filters.role = route.meta.presetRole || ''
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = { page: pagination.current, limit: pagination.size }
    if (filters.search) params.search = filters.search
    if (filters.role) params.role = filters.role
    const response = await api.users.getAllUsers(params)
    users.value = response.data.users || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('加载用户失败:', error)
    ElMessage.error('加载用户失败')
  } finally {
    loading.value = false
  }
}

const reload = () => {
  pagination.current = 1
  loadUsers()
}

const resetFilters = () => {
  filters.search = ''
  filters.role = ''
  reload()
}

const openEdit = (row) => {
  editForm.id = row.id
  editForm.username = row.username
  editForm.email = row.email || ''
  editForm.role = row.role
  editVisible.value = true
}

const saveUser = async () => {
  saving.value = true
  try {
    await api.users.updateUser(editForm.id, { email: editForm.email, role: editForm.role })
    ElMessage.success('用户已更新')
    editVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('更新用户失败:', error)
    ElMessage.error('更新用户失败')
  } finally {
    saving.value = false
  }
}

const removeUser = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」及其全部数据？`, '删除确认', { type: 'warning' })
  } catch (e) {
    return
  }
  try {
    await api.users.deleteUser(row.id)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除用户失败')
  }
}

watch(() => route.path, () => {
  applyPreset()
  reload()
})

onMounted(() => {
  applyPreset()
  loadUsers()
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
