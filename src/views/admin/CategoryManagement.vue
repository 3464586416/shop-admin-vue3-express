<template>
    <div class="category-management">
      <div class="header">
        <h2>分类管理</h2>
        <el-button type="primary" @click="handleCreate">
          新增分类
        </el-button>
      </div>
  
      <!-- 搜索和筛选 -->
      <el-card class="search-card">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="分类名称">
            <el-input
              v-model="searchForm.name"
              placeholder="请输入分类名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadCategories">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
  
      <!-- 分类表格 -->
      <el-card>
        <el-table
          v-loading="loading"
          :data="categories"
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="分类名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="product_count" label="商品数量" width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                {{ row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort_order" label="排序" width="80" />
          <el-table-column prop="create_time" label="创建时间" width="180" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handleDelete(row.id)"
                :loading="row.deleting"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
  
        <!-- 分页 -->
        <div class="pagination">
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
  
      <!-- 新增/编辑分类对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
        @closed="resetForm"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="80px"
        >
          <el-form-item label="分类名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入分类名称" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入分类描述"
            />
          </el-form-item>
          <el-form-item label="排序" prop="sort_order">
            <el-input-number v-model="form.sort_order" :min="0" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio label="active">启用</el-radio>
              <el-radio label="inactive">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm" :loading="submitting">
              确定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import api from '@/api/index'
  
  const loading = ref(false)
  const dialogVisible = ref(false)
  const submitting = ref(false)
  const formRef = ref()
  
  const categories = ref([])
  
  const searchForm = reactive({
    name: '',
    status: ''
  })
  
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })
  
  const form = reactive({
    id: null,
    name: '',
    description: '',
    sort_order: 0,
    status: 'active'
  })
  
  const rules = {
    name: [
      { required: true, message: '请输入分类名称', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
    ]
  }
  
  const isEdit = ref(false)
  const dialogTitle = computed(() => isEdit.value ? '编辑分类' : '新增分类')
  
  // 加载分类列表
  const loadCategories = async () => {
    loading.value = true
    try {
      const params = {
        page: pagination.current,
        limit: pagination.size,
        ...searchForm
      }
      const response = await api.categories.getCategories(params)
      const all = Array.isArray(response.data) ? response.data : (response.data.categories || [])
      pagination.total = all.length
      const start = (pagination.current - 1) * pagination.size
      categories.value = all.slice(start, start + pagination.size)
    } catch (error) {
      console.error('加载分类失败:', error)
      ElMessage.error('加载分类失败')
    } finally {
      loading.value = false
    }
  }
  
  // 重置搜索
  const resetSearch = () => {
    Object.keys(searchForm).forEach(key => {
      searchForm[key] = ''
    })
    pagination.current = 1
    loadCategories()
  }
  
  // 处理新增
  const handleCreate = () => {
    isEdit.value = false
    dialogVisible.value = true
  }
  
  // 处理编辑
  const handleEdit = (row) => {
    isEdit.value = true
    Object.assign(form, { ...row })
    dialogVisible.value = true
  }
  
  // 处理删除
  const handleDelete = async (id) => {
    try {
      await ElMessageBox.confirm('确定要删除这个分类吗？', '提示', {
        type: 'warning'
      })
  
      const category = categories.value.find(cat => cat.id === id)
      if (category) {
        category.deleting = true
      }
  
      await api.categories.deleteCategory(id)
      ElMessage.success('删除成功')
      loadCategories()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除分类失败:', error)
        ElMessage.error('删除失败')
      }
    } finally {
      const category = categories.value.find(cat => cat.id === id)
      if (category) {
        category.deleting = false
      }
    }
  }
  
  // 提交表单
  const submitForm = async () => {
    try {
      await formRef.value.validate()
      submitting.value = true
  
      if (isEdit.value) {
        await api.categories.updateCategory(form.id, form)
        ElMessage.success('更新成功')
      } else {
        await api.categories.createCategory(form)
        ElMessage.success('创建成功')
      }
  
      dialogVisible.value = false
      loadCategories()
    } catch (error) {
      console.error('提交失败:', error)
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else if (!error.toString().includes('cancel')) {
        ElMessage.error('操作失败')
      }
    } finally {
      submitting.value = false
    }
  }
  
  // 重置表单
  const resetForm = () => {
    if (formRef.value) {
      formRef.value.resetFields()
    }
    Object.assign(form, {
      id: null,
      name: '',
      description: '',
      sort_order: 0,
      status: 'active'
    })
  }
  
  // 分页处理
  const handleSizeChange = (size) => {
    pagination.size = size
    pagination.current = 1
    loadCategories()
  }
  
  const handleCurrentChange = (page) => {
    pagination.current = page
    loadCategories()
  }
  
  // 初始化
  onMounted(() => {
    loadCategories()
  })
  </script>
  
  <style scoped>
  .category-management {
    padding: 20px;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .search-card {
    margin-bottom: 20px;
  }
  
  .pagination {
    margin-top: 20px;
    text-align: center;
  }
  </style>