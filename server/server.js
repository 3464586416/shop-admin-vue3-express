// server.js - 完整的后端服务器
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const dotenv = require('dotenv');

// 显式加载 server/.env 与项目根 .env（不依赖启动目录），并校验必需变量
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.JWT_SECRET) {
    console.error('FATAL: 未设置 JWT_SECRET 环境变量，请参考 .env.example 配置');
    process.exit(1);
}

// 导入数据库配置
const db = require('./config/database');

// 导入路由
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const fileRoutes = require('./routes/files');
const settingsRoutes = require('./routes/settings');

const app = express();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 可以根据需要配置
  crossOriginEmbedderPolicy: false,
}));

// 跨域配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志（先确保 logs 目录存在，全新克隆时 createWriteStream 不会崩）
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs/access.log'), 
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP限制1000个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 生产模式：托管 Vite 构建产物 dist/，单服务同源部署（Render 免费档只需一个 Node 服务）
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));

// 创建必要的目录
const directories = [
  'logs',
  'uploads',
  'uploads/products',
  'uploads/avatars',
  'uploads/banners',
  'uploads/categories',
  'public',
  'public/images',
  'public/images/products',
  'public/images/banners',
  'public/images/categories',
  'public/images/avatars',
  'public/images/icons'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// 测试数据库连接
db.testConnection().then(success => {
  if (success) {
    console.log('✅ 数据库连接测试通过');
    return db.initDatabase();
  } else {
    console.error('❌ 数据库连接测试失败');
    process.exit(1);
  }
}).then(success => {
  if (success) {
    console.log('✅ 数据库初始化完成');
    startServer();
  } else {
    console.error('❌ 数据库初始化失败');
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);









app.get('/api/test-db', async (req, res) => {
  try {
      // 测试查询
      const users = await db.query('SELECT COUNT(*) as count FROM users');
      const products = await db.query('SELECT COUNT(*) as count FROM products');
      const categories = await db.query('SELECT COUNT(*) as count FROM categories');
      
      res.json({
          code: 200,
          message: '数据库测试成功',
          data: {
              users: users[0].count,
              products: products[0].count,
              categories: categories[0].count,
              connection: 'ok'
          }
      });
  } catch (error) {
      console.error('数据库测试错误:', error);
      res.status(500).json({
          code: 500,
          message: '数据库测试失败',
          error: error.message
      });
  }
});

// 简单的商品测试端点
app.get('/api/test-products', async (req, res) => {
  try {
      // 简单的查询，不使用复杂参数
      const products = await db.query(`
          SELECT p.id, p.name, p.price, p.stock, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'active'
          LIMIT 5
      `);
      
      res.json({
          code: 200,
          data: products
      });
  } catch (error) {
      console.error('测试商品查询错误:', error);
      res.status(500).json({
          code: 500,
          message: '查询失败',
          error: error.message,
          sql: error.sql
      });
  }
});















// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    memory: process.memoryUsage()
  });
});

// SPA history 路由回退：非 API/静态资源的 GET 一律返回前端入口页
app.use((req, res, next) => {
    const indexFile = path.join(distDir, 'index.html');
    if (req.method === 'GET'
        && !req.path.startsWith('/api')
        && !req.path.startsWith('/uploads')
        && !req.path.startsWith('/images')
        && req.path !== '/health'
        && fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
    }
    next();
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    path: req.path
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 文件上传错误
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      code: 400,
      message: `文件上传错误: ${err.message}`
    });
  }
  
  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors: err.errors
    });
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: '无效的令牌'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: '令牌已过期'
    });
  }
  
  // 默认错误
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
    code: statusCode,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

function startServer() {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`
    🚀 服务器启动成功！
    📡 地址: http://localhost:${PORT}
    📊 健康检查: http://localhost:${PORT}/health
    💾 数据库: mysql://${process.env.DB_USER}:******@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}
    ⏰ 启动时间: ${new Date().toLocaleString()}
    `);
  });
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
  
  // 未捕获异常处理
  process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    server.close(() => {
      process.exit(1);
    });
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
  });
}

module.exports = app;