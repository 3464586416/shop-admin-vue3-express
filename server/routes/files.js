const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 验证用户中间件
const authenticateUser = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: '未提供认证令牌'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
        
    } catch (error) {
        return res.status(401).json({
            code: 401,
            message: '无效的认证令牌'
        });
    }
};

// 验证管理员中间件
const authenticateAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: '未提供认证令牌'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== '超级管理员') {
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        req.adminId = decoded.id;
        req.adminRole = decoded.role;
        next();
        
    } catch (error) {
        return res.status(401).json({
            code: 401,
            message: '无效的认证令牌'
        });
    }
};

// 创建必要的上传目录
const uploadDirs = {
    products: 'uploads/products',
    avatars: 'uploads/avatars',
    banners: 'uploads/banners',
    categories: 'uploads/categories'
};

Object.values(uploadDirs).forEach(dir => {
    const dirPath = path.join(__dirname, '..', '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadType = req.body.upload_type || 'products';
        const uploadDir = uploadDirs[uploadType] || uploadDirs.products;
        const dirPath = path.join(__dirname, '..', '..', uploadDir);
        cb(null, dirPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件（jpeg, jpg, png, gif, webp）'));
    }
};

// 配置multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10 // 最多10个文件
    },
    fileFilter: fileFilter
});

// 单个文件上传（用户认证）
router.post('/upload', authenticateUser, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                code: 400,
                message: '请选择要上传的文件'
            });
        }
        
        const uploadType = req.body.upload_type || 'products';
        const fileUrl = `/${uploadDirs[uploadType] || uploadDirs.products}/${req.file.filename}`;
        
        res.json({
            code: 200,
            message: '文件上传成功',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: fileUrl,
                upload_type: uploadType
            }
        });
        
    } catch (error) {
        console.error('文件上传错误:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '文件上传失败'
        });
    }
});

// 多个文件上传（用户认证）
router.post('/upload-multiple', authenticateUser, upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '请选择要上传的文件'
            });
        }
        
        const uploadType = req.body.upload_type || 'products';
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `/${uploadDirs[uploadType] || uploadDirs.products}/${file.filename}`
        }));
        
        res.json({
            code: 200,
            message: `成功上传 ${files.length} 个文件`,
            data: {
                files,
                upload_type: uploadType
            }
        });
        
    } catch (error) {
        console.error('多文件上传错误:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '文件上传失败'
        });
    }
});

// 删除文件（用户认证）
router.delete('/delete', authenticateUser, (req, res) => {
    try {
        const { file_url } = req.body;
        
        if (!file_url) {
            return res.status(400).json({
                code: 400,
                message: '请提供文件路径'
            });
        }
        
        // 从URL中提取文件路径
        let filePath = '';
        if (file_url.startsWith('/uploads/')) {
            filePath = path.join(__dirname, '..', '..', file_url);
        } else if (file_url.startsWith('uploads/')) {
            filePath = path.join(__dirname, '..', '..', file_url);
        } else {
            return res.status(400).json({
                code: 400,
                message: '无效的文件路径'
            });
        }
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                code: 404,
                message: '文件不存在'
            });
        }
        
        // 删除文件
        fs.unlinkSync(filePath);
        
        res.json({
            code: 200,
            message: '文件删除成功'
        });
        
    } catch (error) {
        console.error('删除文件错误:', error);
        res.status(500).json({
            code: 500,
            message: error.message || '文件删除失败'
        });
    }
});

module.exports = router;