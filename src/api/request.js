import axios from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '', // 同源相对路径：开发走 vite proxy，生产由 Express 托管 dist
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 显示loading
    if (config.showLoading !== false) {
      config.loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(0, 0, 0, 0.7)'
      })
    }
    
    // 添加token到请求头
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 如果是文件上传，修改Content-Type
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      // 让浏览器自动设置Content-Type
      delete config.headers['Content-Type']
    }
    
    return config
  },
  (error) => {
    // 请求错误处理
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 关闭loading
    if (response.config.loadingInstance) {
      response.config.loadingInstance.close()
    }
    
    // 处理响应数据
    const res = response.data
    
    // 如果响应中有code字段，根据code处理
    if (res.code !== undefined) {
      if (res.code === 200) {
        return res
      } else {
        // 处理业务错误
        handleBusinessError(res)
        return Promise.reject(res)
      }
    }
    
    return res
  },
  (error) => {
    // 关闭loading
    if (error.config?.loadingInstance) {
      error.config.loadingInstance.close()
    }
    
    // 处理HTTP错误
    handleHttpError(error)
    return Promise.reject(error)
  }
)

// 处理业务错误
function handleBusinessError(res) {
  const { code, message } = res
  
  // 根据不同的错误码进行处理
  switch (code) {
    case 400:
      ElMessage.error(message || '请求参数错误')
      break
    case 401:
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('user_info')
      router.push('/admin/login')
      break
    case 403:
      ElMessage.error('权限不足，无法访问')
      break
    case 404:
      ElMessage.error('资源不存在')
      break
    case 500:
      ElMessage.error('服务器内部错误')
      break
    default:
      ElMessage.error(message || '操作失败')
  }
}

// 处理HTTP错误
function handleHttpError(error) {
  if (error.response) {
    // 服务器返回了错误状态码
    const { status, data } = error.response
    
    switch (status) {
      case 400:
        ElMessage.error(data?.message || '请求参数错误')
        break
      case 401:
        ElMessage.error('未授权，请先登录')
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
        router.push('/admin/login')
        break
      case 403:
        ElMessage.error('拒绝访问')
        break
      case 404:
        ElMessage.error('请求的资源不存在')
        break
      case 408:
        ElMessage.error('请求超时')
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      case 502:
        ElMessage.error('网关错误')
        break
      case 503:
        ElMessage.error('服务不可用')
        break
      case 504:
        ElMessage.error('网关超时')
        break
      default:
        ElMessage.error(`请求失败: ${status}`)
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
  } else {
    // 请求配置错误
    ElMessage.error('请求配置错误')
  }
}

// 请求方法封装
const request = {
  // GET请求
  get: (url, config = {}) => {
    return service.get(url, config)
  },
  
  // POST请求
  post: (url, data = {}, config = {}) => {
    return service.post(url, data, config)
  },
  
  // PUT请求
  put: (url, data = {}, config = {}) => {
    return service.put(url, data, config)
  },
  
  // DELETE请求
  delete: (url, config = {}) => {
    return service.delete(url, config)
  },
  
  // PATCH请求
  patch: (url, data = {}, config = {}) => {
    return service.patch(url, data, config)
  },
  
  // 上传文件
  upload: (url, file, config = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return service.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // 下载文件
  download: (url, config = {}) => {
    return service.get(url, {
      ...config,
      responseType: 'blob'
    })
  },
  
  // 取消请求
  cancel: () => {
    // 可以在这里实现取消请求的逻辑
    console.log('取消请求')
  }
}

// 导出请求实例
export default request