<template>
    <div class="profile-page">
      <div class="header">
        <h2>个人中心</h2>
      </div>
  
      <el-row :gutter="20">
        <!-- 左侧个人信息 -->
        <el-col :span="8">
          <el-card class="info-card">
            <div class="avatar-section">
              <el-avatar :size="100" :src="userInfo.avatar || '/images/default-avatar.jpg'" />
              <h3>{{ userInfo.username }}</h3>
              <p>{{ userInfo.role }}</p>
            </div>
  
            <div class="user-stats">
              <div class="stat-item">
                <div class="stat-label">注册时间</div>
                <div class="stat-value">{{ formatTime(userInfo.register_time) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">最后登录</div>
                <div class="stat-value">{{ formatTime(lastLogin) }}</div>
              </div>
            </div>
          </el-card>
  
          <el-card class="quick-actions">
            <template #header>
              <span>快捷操作</span>
            </template>
            <div class="actions">
              <el-button type="primary" @click="activeTab = 'edit'">
                编辑资料
              </el-button>
              <el-button @click="activeTab = 'password'">
                修改密码
              </el-button>
              <el-button @click="handleLogout">
                退出登录
              </el-button>
            </div>
          </el-card>
        </el-col>
  
        <!-- 右侧内容 -->
        <el-col :span="16">
          <el-card class="content-card">
            <el-tabs v-model="activeTab" class="profile-tabs">
              <!-- 基本信息 -->
              <el-tab-pane label="基本信息" name="info">
                <div class="info-section">
                  <div class="info-item">
                    <span class="info-label">用户名：</span>
                    <span class="info-value">{{ userInfo.username }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">邮箱：</span>
                    <span class="info-value">{{ userInfo.email || '未设置' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">角色：</span>
                    <span class="info-value">{{ userInfo.role }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">注册时间：</span>
                    <span class="info-value">{{ formatTime(userInfo.register_time) }}</span>
                  </div>
                </div>
              </el-tab-pane>
  
              <!-- 编辑资料 -->
              <el-tab-pane label="编辑资料" name="edit">
                <el-form
                  ref="editFormRef"
                  :model="editForm"
                  :rules="editRules"
                  label-width="100px"
                  class="edit-form"
                >
                  <el-form-item label="用户名" prop="username">
                    <el-input v-model="editForm.username" disabled />
                    <div class="form-tips">用户名不可修改</div>
                  </el-form-item>
  
                  <el-form-item label="邮箱" prop="email">
                    <el-input v-model="editForm.email" placeholder="请输入邮箱" />
                  </el-form-item>
  
                  <el-form-item label="头像" prop="avatar">
                    <el-upload
                      class="avatar-uploader"
                      action="/api/upload"
                      :show-file-list="false"
                      :on-success="handleAvatarSuccess"
                      :before-upload="beforeAvatarUpload"
                    >
                      <img v-if="editForm.avatar" :src="editForm.avatar" class="avatar" />
                      <el-icon v-else class="avatar-uploader-icon">
                        <Plus />
                      </el-icon>
                    </el-upload>
                  </el-form-item>
  
                  <el-form-item>
                    <el-button type="primary" @click="submitEdit" :loading="editing">
                      保存修改
                    </el-button>
                    <el-button @click="resetEdit">重置</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>
  
              <!-- 修改密码 -->
              <el-tab-pane label="修改密码" name="password">
                <el-form
                  ref="passwordFormRef"
                  :model="passwordForm"
                  :rules="passwordRules"
                  label-width="100px"
                  class="password-form"
                >
                  <el-form-item label="原密码" prop="oldPassword">
                    <el-input
                      v-model="passwordForm.oldPassword"
                      type="password"
                      placeholder="请输入原密码"
                      show-password
                    />
                  </el-form-item>
  
                  <el-form-item label="新密码" prop="newPassword">
                    <el-input
                      v-model="passwordForm.newPassword"
                      type="password"
                      placeholder="请输入新密码"
                      show-password
                    />
                    <div class="form-tips">密码长度6-20位，必须包含字母和数字</div>
                  </el-form-item>
  
                  <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      placeholder="请再次输入新密码"
                      show-password
                    />
                  </el-form-item>
  
                  <el-form-item>
                    <el-button type="primary" @click="submitPassword" :loading="changingPassword">
                      修改密码
                    </el-button>
                    <el-button @click="resetPassword">重置</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { format } from 'date-fns'
  
  import api from '@/api/index'
  
  const router = useRouter()
  
  // 用户信息
  const userInfo = ref({})
  const lastLogin = ref(new Date())
  
  // 标签页
  const activeTab = ref('info')
  
  // 表单引用
  const editFormRef = ref()
  const passwordFormRef = ref()
  
  // 编辑表单
  const editForm = reactive({
    username: '',
    email: '',
    avatar: ''
  })
  
  const editRules = {
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
    ]
  }
  
  // 密码表单
  const passwordForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const passwordRules = {
    oldPassword: [
      { required: true, message: '请输入原密码', trigger: 'blur' }
    ],
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' },
      { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '必须包含字母和数字', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: '请再次输入新密码', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          if (value !== passwordForm.newPassword) {
            callback(new Error('两次输入密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }
  
  const editing = ref(false)
  const changingPassword = ref(false)
  
  // 辅助函数
  const formatTime = (time) => {
    if (!time) return '-'
    return format(new Date(time), 'yyyy-MM-dd HH:mm:ss')
  }
  
  // 加载用户信息
  const loadUserInfo = () => {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        userInfo.value = JSON.parse(userStr)
        Object.assign(editForm, {
          username: userInfo.value.username,
          email: userInfo.value.email || '',
          avatar: userInfo.value.avatar || ''
        })
      } catch (error) {
        console.error('解析用户信息失败:', error)
        router.push('/admin/login')
      }
    } else {
      router.push('/admin/login')
    }
  }
  
  // 头像上传成功
  const handleAvatarSuccess = (response) => {
    if (response.code === 200) {
      editForm.avatar = response.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }
  
  // 上传前检查
  const beforeAvatarUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt2M = file.size / 1024 / 1024 < 2
  
    if (!isImage) {
      ElMessage.error('只能上传图片文件')
      return false
    }
    if (!isLt2M) {
      ElMessage.error('图片大小不能超过2MB')
      return false
    }
    return true
  }
  
  // 提交编辑
  const submitEdit = async () => {
    try {
      await editFormRef.value.validate()
      editing.value = true
  
      await api.users.updateProfile(editForm)
      
      // 更新本地用户信息
      const updatedUser = { ...userInfo.value, ...editForm }
      userInfo.value = updatedUser
      localStorage.setItem('user_info', JSON.stringify(updatedUser))
      
      ElMessage.success('修改成功')
    } catch (error) {
      console.error('修改失败:', error)
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('修改失败')
      }
    } finally {
      editing.value = false
    }
  }
  
  // 重置编辑表单
  const resetEdit = () => {
    Object.assign(editForm, {
      email: userInfo.value.email || '',
      avatar: userInfo.value.avatar || ''
    })
    if (editFormRef.value) {
      editFormRef.value.clearValidate()
    }
  }
  
  // 提交密码修改
  const submitPassword = async () => {
    try {
      await passwordFormRef.value.validate()
      changingPassword.value = true
  
      await api.users.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      
      ElMessage.success('密码修改成功')
      resetPassword()
    } catch (error) {
      console.error('修改密码失败:', error)
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('修改密码失败')
      }
    } finally {
      changingPassword.value = false
    }
  }
  
  // 重置密码表单
  const resetPassword = () => {
    Object.assign(passwordForm, {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    if (passwordFormRef.value) {
      passwordFormRef.value.clearValidate()
    }
  }
  
  // 退出登录
  const handleLogout = async () => {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        type: 'warning'
      })
      
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      ElMessage.success('已退出登录')
      router.push('/admin/login')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('退出登录失败:', error)
        ElMessage.error('退出登录失败')
      }
    }
  }
  
  // 初始化
  onMounted(() => {
    loadUserInfo()
  })
  </script>
  
  <style scoped>
  .profile-page {
    padding: 20px;
  }
  
  .header {
    margin-bottom: 20px;
  }
  
  /* 左侧卡片样式 */
  .info-card {
    margin-bottom: 20px;
  }
  
  .avatar-section {
    text-align: center;
    padding: 20px 0;
  }
  
  .avatar-section h3 {
    margin: 15px 0 5px;
    font-size: 20px;
  }
  
  .avatar-section p {
    color: #999;
    margin: 0;
  }
  
  .user-stats {
    margin-top: 20px;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .stat-item:last-child {
    border-bottom: none;
  }
  
  .stat-label {
    color: #666;
  }
  
  .stat-value {
    color: #333;
    font-weight: 500;
  }
  
  .quick-actions {
    margin-bottom: 20px;
  }
  
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  /* 右侧内容样式 */
  .content-card {
    min-height: 500px;
  }
  
  .profile-tabs {
    margin-top: -20px;
  }
  
  /* 基本信息样式 */
  .info-section {
    padding: 20px;
  }
  
  .info-item {
    display: flex;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .info-item:last-child {
    border-bottom: none;
  }
  
  .info-label {
    width: 100px;
    color: #666;
    font-weight: 500;
  }
  
  .info-value {
    flex: 1;
    color: #333;
  }
  
  /* 编辑表单样式 */
  .edit-form,
  .password-form {
    padding: 20px;
    max-width: 500px;
  }
  
  .form-tips {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
  }
  
  .avatar-uploader {
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    width: 100px;
    height: 100px;
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
    width: 100px;
    height: 100px;
    text-align: center;
    line-height: 100px;
  }
  
  /* 响应式设计 */
  @media (max-width: 768px) {
    .profile-page .el-col-8,
    .profile-page .el-col-16 {
      width: 100%;
    }
    
    .edit-form,
    .password-form {
      max-width: 100%;
    }
  }
  </style>