const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// 配置文件路径
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'settings.json');

// 确保数据目录存在
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 默认设置
const DEFAULT_SETTINGS = {
    // 基本设置
    site: {
        name: '商城系统',
        logo: '/images/logo.png',
        favicon: '/images/favicon.ico',
        copyright: '© 2025 商城系统 版权所有',
        icp: '',
        seo_keywords: '商城,购物,电商',
        seo_description: '专业的电商购物平台'
    },
    
    // 业务设置
    business: {
        currency: 'CNY',
        currency_symbol: '¥',
        decimal_places: 2,
        tax_rate: 0,
        shipping_fee: 0,
        free_shipping_threshold: 0,
        return_deadline: 7,
        min_order_amount: 0
    },
    
    // 邮件设置
    email: {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        from_email: '',
        from_name: '商城系统'
    },
    
    // 支付设置
    payment: {
        wechat_pay_enabled: false,
        wechat_app_id: '',
        wechat_mch_id: '',
        wechat_key: '',
        alipay_enabled: false,
        alipay_app_id: '',
        alipay_private_key: '',
        alipay_public_key: ''
    },
    
    // 系统设置
    system: {
        maintenance_mode: false,
        maintenance_message: '系统维护中，请稍后再试',
        allow_registration: true,
        allow_guest_checkout: true,
        show_out_of_stock: true,
        low_stock_threshold: 10,
        auto_cancel_unpaid_hours: 24,
        auto_complete_shipped_days: 7
    }
};

// 读取设置文件
function readSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error('读取设置文件错误:', error);
        return DEFAULT_SETTINGS;
    }
}

// 保存设置文件
function saveSettings(settings) {
    try {
        // 更新元数据
        settings.meta = {
            version: '1.0.0',
            last_modified: new Date().toISOString(),
            modified_by: 'admin'
        };
        
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存设置文件错误:', error);
        return false;
    }
}

// 获取所有设置
router.get('/', authenticateAdmin, (req, res) => {
    try {
        const settings = readSettings();
        res.json({
            code: 200,
            data: settings
        });
    } catch (error) {
        console.error('获取设置错误:', error);
        res.status(500).json({
            code: 500,
            message: '获取设置失败'
        });
    }
});

// 获取单个设置分组
router.get('/:group', authenticateAdmin, (req, res) => {
    try {
        const { group } = req.params;
        const settings = readSettings();
        
        if (!settings[group]) {
            return res.status(404).json({
                code: 404,
                message: '设置分组不存在'
            });
        }
        
        res.json({
            code: 200,
            data: settings[group]
        });
    } catch (error) {
        console.error('获取设置分组错误:', error);
        res.status(500).json({
            code: 500,
            message: '获取设置分组失败'
        });
    }
});

// 更新设置
router.put('/:group', authenticateAdmin, (req, res) => {
    try {
        const { group } = req.params;
        const updateData = req.body;
        
        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({
                code: 400,
                message: '无效的更新数据'
            });
        }
        
        const settings = readSettings();
        
        if (!settings[group]) {
            return res.status(404).json({
                code: 404,
                message: '设置分组不存在'
            });
        }
        
        // 深度合并设置
        settings[group] = {
            ...settings[group],
            ...updateData
        };
        
        // 保存设置
        if (saveSettings(settings)) {
            res.json({
                code: 200,
                message: '设置更新成功',
                data: settings[group]
            });
        } else {
            res.status(500).json({
                code: 500,
                message: '保存设置失败'
            });
        }
    } catch (error) {
        console.error('更新设置错误:', error);
        res.status(500).json({
            code: 500,
            message: '更新设置失败'
        });
    }
});

// 重置设置到默认值
router.post('/reset', authenticateAdmin, (req, res) => {
    try {
        const { group } = req.body;
        
        const settings = readSettings();
        
        if (group) {
            // 重置指定分组
            if (!DEFAULT_SETTINGS[group]) {
                return res.status(404).json({
                    code: 404,
                    message: '设置分组不存在'
                });
            }
            
            settings[group] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[group]));
        } else {
            // 重置所有设置
            Object.assign(settings, JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
        }
        
        // 保存设置
        if (saveSettings(settings)) {
            res.json({
                code: 200,
                message: group ? `设置分组 "${group}" 已重置为默认值` : '所有设置已重置为默认值'
            });
        } else {
            res.status(500).json({
                code: 500,
                message: '保存设置失败'
            });
        }
    } catch (error) {
        console.error('重置设置错误:', error);
        res.status(500).json({
            code: 500,
            message: '重置设置失败'
        });
    }
});

module.exports = router;