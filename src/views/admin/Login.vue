<template>
    <div class="login-page">
      <div class="login-container">
        <div class="login-wrapper">
          <!-- 左侧背景 -->
          <div class="login-left">
            <div class="background-overlay"></div>
            <div class="welcome-text">
              <h2>欢迎使用</h2>
              <h1>商城后台管理系统</h1>
              <p>专业、高效、安全的电商管理平台</p>
            </div>
            <div class="features">
              <div class="feature-item">
                <el-icon :size="24" color="#409EFF"><Monitor /></el-icon>
                <span>数据可视化</span>
              </div>
              <div class="feature-item">
                <el-icon :size="24" color="#67C23A"><Setting /></el-icon>
                <span>智能管理</span>
              </div>
              <div class="feature-item">
                <el-icon :size="24" color="#E6A23C"><Lock /></el-icon>
                <span>安全可靠</span>
              </div>
            </div>
          </div>
  
          <!-- 右侧登录表单 -->
          <div class="login-right">
            <div class="login-form">
              <div class="form-header">
                <h2>用户登录</h2>
                <p>请输入您的账号和密码</p>
              </div>
  
              <el-form
                ref="loginFormRef"
                :model="form"
                :rules="rules"
                @submit.prevent="handleLogin"
                class="form-body"
              >
                <el-form-item prop="username">
                  <el-input
                    v-model="form.username"
                    placeholder="请输入用户名"
                    size="large"
                    :prefix-icon="User"
                  />
                </el-form-item>
  
                <el-form-item prop="password">
                  <el-input
                    v-model="form.password"
                    type="password"
                    placeholder="请输入密码"
                    size="large"
                    :prefix-icon="Lock"
                    show-password
                  />
                </el-form-item>
  
                <el-form-item>
                  <div class="form-options">
                    <el-checkbox v-model="form.remember">记住密码</el-checkbox>
                    <el-button type="text" @click="showForgetDialog">忘记密码？</el-button>
                  </div>
                </el-form-item>
  
                <el-form-item>
                  <el-button
                    type="primary"
                    size="large"
                    :loading="loading"
                    @click="handleLogin"
                    class="login-button"
                  >
                    {{ loading ? '登录中...' : '登录' }}
                  </el-button>
                </el-form-item>
  
                <div class="login-tips">
                  <p>测试账号：admin / admin (管理员)</p>
                  <p>测试账号：user / user (普通用户)</p>
                </div>
              </el-form>
            </div>
  
            <div class="footer">
              <p>© 2025 商城系统 版权所有</p>
              <p>建议使用 Chrome 浏览器访问本系统</p>
            </div>
          </div>
        </div>
      </div>
  
      <!-- 忘记密码对话框 -->
      <el-dialog
        v-model="forgetDialogVisible"
        title="忘记密码"
        width="400px"
        center
        destroy-on-close
      >
        <div class="forget-content">
          <p>请联系系统管理员重置密码</p>
          <p>管理员邮箱：admin@admin.com</p>
        </div>
        <template #footer>
          <el-button @click="forgetDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="contactAdmin">联系管理员</el-button>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import {
    User,
    Lock,
    Monitor,
    Setting,
    Message
  } from '@element-plus/icons-vue'
  
  import api from '@/api/index'
  
  const router = useRouter()
  
  // 表单数据
  const form = reactive({
    username: '',
    password: '',
    remember: false
  })
  
  const rules = {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 3, max: 20, message: '密码长度在 3 到 20 个字符', trigger: 'blur' }
    ]
  }
  
  const loginFormRef = ref()
  const loading = ref(false)
  const forgetDialogVisible = ref(false)
  
  // 加载保存的用户名
  const loadRememberedUser = () => {
    const savedUser = localStorage.getItem('remembered_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      form.username = user.username
      form.password = user.password
      form.remember = true
    }
  }
  
  // 保存用户名
  const saveRememberedUser = () => {
    if (form.remember) {
      localStorage.setItem('remembered_user', JSON.stringify({
        username: form.username,
        password: form.password
      }))
    } else {
      localStorage.removeItem('remembered_user')
    }
  }
  
  // 登录处理
  const handleLogin = async () => {
    try {
      await loginFormRef.value.validate()
      
      loading.value = true
      
      const response = await api.auth.login({
        username: form.username,
        password: form.password
      })
      
      // 保存token和用户信息
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user_info', JSON.stringify(user))
      
      // 保存记住的用户名
      saveRememberedUser()
      
      ElMessage.success('登录成功')
      
      // 根据用户角色跳转到不同页面
      if (user.role === '超级管理员') {
        router.push('/admin/dashboard')
      } else {
        ElMessage.warning('普通用户无法访问后台管理系统')
        router.push('/')
      }
      
    } catch (error) {
      console.error('登录失败:', error)
      
      if (error.response?.status === 401) {
        ElMessage.error('用户名或密码错误')
      } else if (error.response?.status === 400) {
        ElMessage.error(error.response.data.message || '参数错误')
      } else {
        ElMessage.error('登录失败，请检查网络连接')
      }
    } finally {
      loading.value = false
    }
  }
  
  // 忘记密码
  const showForgetDialog = () => {
    forgetDialogVisible.value = true
  }
  
  const contactAdmin = () => {
    window.location.href = 'mailto:admin@admin.com'
    forgetDialogVisible.value = false
  }
  
  // 监听键盘事件
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleLogin()
    }
  }
  
  // 生命周期
  onMounted(() => {
    loadRememberedUser()
    
    // 添加键盘事件监听
    window.addEventListener('keypress', handleKeyPress)
  })
  
  // 清理事件监听
  onUnmounted(() => {
    window.removeEventListener('keypress', handleKeyPress)
  })
  </script>
  
  <style scoped>
  .login-page {
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .login-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .login-wrapper {
    display: flex;
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    min-height: 600px;
  }
  
  /* 左侧区域 */
  .login-left {
    flex: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 60px 40px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.1);
    z-index: 1;
  }
  
  .welcome-text {
    position: relative;
    z-index: 2;
    margin-bottom: 60px;
  }
  
  .welcome-text h2 {
    font-size: 28px;
    margin: 0 0 10px;
    font-weight: 300;
    opacity: 0.9;
  }
  
  .welcome-text h1 {
    font-size: 42px;
    margin: 0 0 20px;
    font-weight: 600;
    line-height: 1.2;
  }
  
  .welcome-text p {
    font-size: 16px;
    margin: 0;
    opacity: 0.8;
  }
  
  .features {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 18px;
  }
  
  .feature-item .el-icon {
    flex: 0 0 40px;
    background: rgba(255,255,255,0.1);
    padding: 8px;
    border-radius: 8px;
  }
  
  /* 右侧区域 */
  .login-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 40px;
  }
  
  .login-form {
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }
  
  .form-header {
    text-align: center;
    margin-bottom: 40px;
  }
  
  .form-header h2 {
    font-size: 32px;
    color: #333;
    margin: 0 0 10px;
    font-weight: 600;
  }
  
  .form-header p {
    color: #999;
    font-size: 16px;
    margin: 0;
  }
  
  .form-body {
    margin-top: 40px;
  }
  
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .login-button {
    width: 100%;
    height: 50px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
  }
  
  .login-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(102,126,234,0.4);
  }
  
  .login-tips {
    margin-top: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
  }
  
  .login-tips p {
    margin: 5px 0;
  }
  
  .login-tips p:first-child {
    color: #f56c6c;
    font-weight: 500;
  }
  
  /* 忘记密码内容 */
  .forget-content {
    text-align: center;
    padding: 20px 0;
  }
  
  .forget-content p {
    margin: 10px 0;
    color: #666;
  }
  
  .forget-content p:first-child {
    color: #333;
    font-weight: 500;
  }
  
  /* 页脚 */
  .footer {
    text-align: center;
    margin-top: 40px;
    color: #999;
    font-size: 14px;
  }
  
  .footer p {
    margin: 5px 0;
  }
  
  /* 响应式设计 */
  @media (max-width: 992px) {
    .login-wrapper {
      flex-direction: column;
    }
    
    .login-left {
      padding: 40px 20px;
      min-height: 300px;
    }
    
    .welcome-text h1 {
      font-size: 32px;
    }
    
    .features {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
    }
    
    .feature-item {
      flex: 0 0 auto;
    }
  }
  
  @media (max-width: 576px) {
    .login-page {
      padding: 10px;
    }
    
    .login-wrapper {
      border-radius: 10px;
    }
    
    .login-left,
    .login-right {
      padding: 30px 20px;
    }
    
    .welcome-text h1 {
      font-size: 24px;
    }
    
    .welcome-text h2 {
      font-size: 20px;
    }
    
    .feature-item span {
      display: none;
    }
    
    .form-header h2 {
      font-size: 24px;
    }
  }
  </style>