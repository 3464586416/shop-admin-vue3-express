const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET; // 无默认值，启动时由 server.js 校验

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

// 获取管理后台统计数据
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
    try {
        // 获取今日统计数据
        const todayStats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE DATE(create_time) = CURDATE()) as today_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE DATE(create_time) = CURDATE()) as today_sales,
                (SELECT COUNT(*) FROM users WHERE DATE(register_time) = CURDATE()) as today_users,
                (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders) as total_sales,
                (SELECT COUNT(*) FROM categories WHERE status = 'active') as total_categories
        `);
        
        // 获取近30天销售数据
        const salesData = await db.query(`
            SELECT 
                DATE(create_time) as date,
                COUNT(*) as order_count,
                COALESCE(SUM(total_price), 0) as sales_amount
            FROM orders
            WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(create_time)
            ORDER BY date
        `);
        
        // 获取商品分类统计
        const categoryStats = await db.query(`
            SELECT 
                c.name as category_name,
                COUNT(p.id) as product_count,
                COALESCE(SUM(p.stock), 0) as total_stock
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
            WHERE c.status = 'active'
            GROUP BY c.id, c.name
            ORDER BY product_count DESC
            LIMIT 10
        `);
        
        // 获取最新订单
        const recentOrders = await db.query(`
            SELECT 
                o.*,
                u.username as customer_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.create_time DESC
            LIMIT 10
        `);
        
        res.json({
            code: 200,
            data: {
                today_stats: todayStats[0],
                sales_data: salesData,
                category_stats: categoryStats,
                recent_orders: recentOrders
            }
        });
        
    } catch (error) {
        console.error('获取管理后台统计错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 修改获取销售图表数据路由
router.get('/dashboard/charts/sales', authenticateAdmin, async (req, res) => {
    try {
        const { period = 'month', start_date, end_date } = req.query;
        
        console.log(`获取销售图表数据: period=${period}`);
        
        let dateFormat, interval;
        
        switch (period) {
            case 'day':
                dateFormat = '%Y-%m-%d %H:00';
                interval = 'DAY';
                break;
            case 'week':
                dateFormat = '%Y-%m-%d';
                interval = 'WEEK';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                interval = 'MONTH';
                break;
            case 'year':
                dateFormat = '%Y';
                interval = 'YEAR';
                break;
            default:
                dateFormat = '%Y-%m';
                interval = 'MONTH';
        }
        
        // 构建查询 - 使用更安全的方式
        let query = '';
        let params = [];
        
        if (start_date && end_date) {
            query = `
                SELECT 
                    DATE_FORMAT(create_time, ?) as period,
                    COUNT(*) as order_count,
                    COALESCE(SUM(total_price), 0) as sales_amount,
                    AVG(total_price) as avg_order_value
                FROM orders
                WHERE create_time BETWEEN ? AND ?
                GROUP BY DATE_FORMAT(create_time, ?)
                ORDER BY period
            `;
            params = [dateFormat, start_date, end_date, dateFormat];
        } else {
            // 使用ANY_VALUE函数处理GROUP BY问题
            query = `
                SELECT 
                    DATE_FORMAT(create_time, ?) as period,
                    COUNT(*) as order_count,
                    COALESCE(SUM(total_price), 0) as sales_amount,
                    AVG(total_price) as avg_order_value
                FROM orders
                WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 12 ${interval})
                GROUP BY period
                ORDER BY period
            `;
            params = [dateFormat];
        }
        
        console.log('执行查询:', query);
        console.log('参数:', params);
        
        const salesData = await db.query(query, params);
        
        console.log(`获取到 ${salesData.length} 条销售数据`);
        
        // 如果没有数据，返回默认数据格式
        if (salesData.length === 0) {
            return res.json({
                code: 200,
                data: []
            });
        }
        
        res.json({
            code: 200,
            data: salesData
        });
        
    } catch (error) {
        console.error('获取销售图表数据错误详情:', error);
        
        // 如果是GROUP BY错误，尝试使用替代查询
        if (error.code === 'ER_WRONG_FIELD_WITH_GROUP') {
            console.log('尝试使用替代查询...');
            try {
                // 使用简单的替代查询
                const alternativeQuery = `
                    SELECT 
                        DATE_FORMAT(create_time, '%Y-%m') as period,
                        COUNT(*) as order_count,
                        COALESCE(SUM(total_price), 0) as sales_amount
                    FROM orders
                    WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                    GROUP BY period
                    ORDER BY period
                `;
                
                const alternativeData = await db.query(alternativeQuery);
                
                res.json({
                    code: 200,
                    data: alternativeData,
                    note: '使用简化查询（由于MySQL ONLY_FULL_GROUP_BY限制）'
                });
                
            } catch (altError) {
                console.error('替代查询也失败:', altError);
                res.status(500).json({
                    code: 500,
                    message: '获取销售图表数据失败',
                    error: process.env.NODE_ENV === 'development' ? altError.message : undefined
                });
            }
        } else {
            res.status(500).json({
                code: 500,
                message: '获取销售图表数据失败',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// 获取商品销售排行榜
router.get('/dashboard/top-products', authenticateAdmin, async (req, res) => {
    try {
        const { limit = 10, start_date, end_date } = req.query;
        const pageLimit = parseInt(limit);
        
        let whereClause = '';
        const params = [];
        
        if (start_date && end_date) {
            whereClause = 'AND o.create_time BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        const topProducts = await db.query(`
            SELECT 
                p.id,
                p.name,
                p.image_url,
                c.name as category_name,
                COUNT(oi.id) as sale_count,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.price * oi.quantity) as total_sales
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'pending'
            ${whereClause}
            GROUP BY p.id, p.name, p.image_url, c.name
            ORDER BY total_sales DESC
            LIMIT ${pageLimit}
        `, params);
        
        res.json({
            code: 200,
            data: topProducts
        });
        
    } catch (error) {
        console.error('获取商品销售排行榜错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取用户活跃度统计
router.get('/dashboard/user-activity', authenticateAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const userActivity = await db.query(`
            SELECT 
                DATE(register_time) as date,
                COUNT(*) as new_users,
                (SELECT COUNT(*) FROM orders WHERE DATE(create_time) = date) as daily_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE DATE(create_time) = date) as daily_sales
            FROM users
            WHERE register_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(register_time)
            ORDER BY date DESC
        `, [days]);
        
        res.json({
            code: 200,
            data: userActivity
        });
        
    } catch (error) {
        console.error('获取用户活跃度统计错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取库存预警商品
router.get('/dashboard/low-stock', authenticateAdmin, async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 10;
        const limit = parseInt(req.query.limit) || 20;
        
        const lowStockProducts = await db.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'active' 
            AND p.stock <= ?
            ORDER BY p.stock ASC
            LIMIT ${limit}
        `, [threshold]);
        
        res.json({
            code: 200,
            data: lowStockProducts
        });
        
    } catch (error) {
        console.error('获取库存预警商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 清理过时数据
router.post('/cleanup', authenticateAdmin, async (req, res) => {
    try {
        const { days = 30, data_type } = req.body;
        
        let result;
        let message = '';
        
        switch (data_type) {
            case 'old_messages':
                result = await db.query(`
                    DELETE FROM messages 
                    WHERE create_time < DATE_SUB(NOW(), INTERVAL ? DAY)
                    AND is_read = 1
                `, [days]);
                message = `清理了 ${result.affectedRows} 条已读消息`;
                break;
                
            case 'old_cart_items':
                result = await db.query(`
                    DELETE FROM cart_items 
                    WHERE added_time < DATE_SUB(NOW(), INTERVAL ? DAY)
                `, [days]);
                message = `清理了 ${result.affectedRows} 条购物车项`;
                break;
                
            case 'completed_orders':
                result = await db.query(`
                    DELETE FROM orders 
                    WHERE status = 'completed' 
                    AND create_time < DATE_SUB(NOW(), INTERVAL ? DAY)
                `, [days]);
                message = `清理了 ${result.affectedRows} 条已完成订单`;
                break;
                
            default:
                return res.status(400).json({
                    code: 400,
                    message: '无效的数据类型'
                });
        }
        
        res.json({
            code: 200,
            message,
            data: {
                affected_rows: result.affectedRows
            }
        });
        
    } catch (error) {
        console.error('清理数据错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;