<template>
    <div class="product-management">
      <div class="header">
        <h2>商品管理</h2>
        <el-button type="primary" @click="handleCreate">
          新增商品
        </el-button>
      </div>
  
      <!-- 搜索和筛选 -->
      <el-card class="search-card">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="商品名称">
            <el-input
              v-model="searchForm.name"
              placeholder="请输入商品名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              v-model="searchForm.category_id"
              placeholder="请选择分类"
              clearable
            >
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadProducts">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
  
      <!-- 商品表格 -->
      <el-card>
        <el-table
          v-loading="loading"
          :data="products"
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="商品图片" width="120">
            <template #default="{ row }">
              <el-image
                :src="row.image_url || '/images/default-product.jpg'"
                style="width: 60px; height: 60px;"
                fit="cover"
                :preview-src-list="[row.image_url]"
              />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="price" label="价格" width="120">
            <template #default="{ row }">
              ¥{{ row.price.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" width="100" />
          <el-table-column prop="category_name" label="分类" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                {{ row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
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
  
      <!-- 新增/编辑商品对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="800px"
        @closed="resetForm"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="商品名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入商品名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="价格" prop="price">
                <el-input-number
                  v-model="form.price"
                  :min="0"
                  :precision="2"
                  placeholder="请输入价格"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
  
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="库存" prop="stock">
                <el-input-number
                  v-model="form.stock"
                  :min="0"
                  placeholder="请输入库存"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分类" prop="category_id">
                <el-select
                  v-model="form.category_id"
                  placeholder="请选择分类"
                  style="width: 100%"
                >
                  <el-option
                    v-for="category in categories"
                    :key="category.id"
                    :label="category.name"
                    :value="category.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
  
          <el-form-item label="商品图片" prop="image_url">
            <el-upload
              class="avatar-uploader"
              action="/api/upload"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
            >
              <img v-if="form.image_url" :src="form.image_url" class="avatar" />
              <el-icon v-else class="avatar-uploader-icon">
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>
  
          <el-form-item label="商品描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请输入商品描述"
            />
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
  import { Plus } from '@element-plus/icons-vue'
  import api from '@/api/index'
  
  const loading = ref(false)
  const dialogVisible = ref(false)
  const submitting = ref(false)
  const formRef = ref()
  
  const products = ref([])
  const categories = ref([])
  
  const searchForm = reactive({
    name: '',
    category_id: null,
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
    price: 0,
    stock: 0,
    category_id: null,
    description: '',
    image_url: '',
    status: 'active'
  })
  
  const rules = {
    name: [
      { required: true, message: '请输入商品名称', trigger: 'blur' },
      { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
    ],
    price: [
      { required: true, message: '请输入价格', trigger: 'blur' }
    ],
    stock: [
      { required: true, message: '请输入库存', trigger: 'blur' }
    ],
    category_id: [
      { required: true, message: '请选择分类', trigger: 'change' }
    ]
  }
  
  const isEdit = ref(false)
  const dialogTitle = computed(() => isEdit.value ? '编辑商品' : '新增商品')
  
  // 加载商品列表
  const loadProducts = async () => {
    loading.value = true
    try {
      const params = {
        page: pagination.current,
        limit: pagination.size,
        ...searchForm
      }
      const response = await api.products.getProducts(params)
      products.value = response.data.products || []
      pagination.total = response.data.pagination?.total || 0
    } catch (error) {
      console.error('加载商品失败:', error)
      ElMessage.error('加载商品失败')
    } finally {
      loading.value = false
    }
  }
  
  // 加载分类列表
  const loadCategories = async () => {
    try {
      const response = await api.categories.getCategories()
      categories.value = response.data || []
    } catch (error) {
      console.error('加载分类失败:', error)
      ElMessage.error('加载分类失败')
    }
  }
  
  // 重置搜索
  const resetSearch = () => {
    Object.assign(searchForm, {
      name: '',
      category_id: null,
      status: ''
    })
    pagination.current = 1
    loadProducts()
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
      await ElMessageBox.confirm('确定要删除这个商品吗？', '提示', {
        type: 'warning'
      })
  
      const product = products.value.find(p => p.id === id)
      if (product) {
        product.deleting = true
      }
  
      await api.products.deleteProduct(id)
      ElMessage.success('删除成功')
      loadProducts()
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除商品失败:', error)
        ElMessage.error('删除失败')
      }
    } finally {
      const product = products.value.find(p => p.id === id)
      if (product) {
        product.deleting = false
      }
    }
  }
  
  // 图片上传成功
  const handleUploadSuccess = (response) => {
    if (response.code === 200) {
      form.image_url = response.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }
  
  // 上传前检查
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5
  
    if (!isImage) {
      ElMessage.error('只能上传图片文件')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('图片大小不能超过5MB')
      return false
    }
    return true
  }
  
  // 提交表单
  const submitForm = async () => {
    try {
      await formRef.value.validate()
      submitting.value = true
  
      if (isEdit.value) {
        await api.products.updateProduct(form.id, form)
        ElMessage.success('更新成功')
      } else {
        await api.products.createProduct(form)
        ElMessage.success('创建成功')
      }
  
      dialogVisible.value = false
      loadProducts()
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
      price: 0,
      stock: 0,
      category_id: null,
      description: '',
      image_url: '',
      status: 'active'
    })
  }
  
  // 分页处理
  const handleSizeChange = (size) => {
    pagination.size = size
    pagination.current = 1
    loadProducts()
  }
  
  const handleCurrentChange = (page) => {
    pagination.current = page
    loadProducts()
  }
  
  // 初始化
  onMounted(() => {
    loadCategories()
    loadProducts()
  })
  </script>
  
  <style scoped>
  .product-management {
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
  
  .avatar-uploader {
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    width: 178px;
    height: 178px;
  }
  
  .avatar-uploader:hover {
    border-color: #409EFF;
  }
  
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    text-align: center;
    line-height: 178px;
  }
  </style>