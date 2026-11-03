const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');

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

// 生成订单号
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${timestamp.toString().slice(-6)}${random}`;
}

// 创建订单
router.post('/create', authenticateUser, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 获取购物车商品
        const cartItems = await connection.query(`
            SELECT 
                ci.*,
                p.name as product_name,
                p.price as product_price,
                p.stock as product_stock
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ? AND p.status = 'active'
        `, [req.userId]);
        
        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                code: 400,
                message: '购物车为空'
            });
        }
        
        // 验证库存和计算总价
        let totalPrice = 0;
        const orderItems = [];
        
        for (const item of cartItems) {
            if (item.product_stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    code: 400,
                    message: `商品 "${item.product_name}" 库存不足，仅剩 ${item.product_stock} 件`
                });
            }
            
            const itemTotal = item.product_price * item.quantity;
            totalPrice += itemTotal;
            
            orderItems.push({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.product_price,
                total: itemTotal
            });
        }
        
        // 生成订单号
        const orderNumber = generateOrderNumber();
        
        // 创建订单
        const orderResult = await connection.query(`
            INSERT INTO orders (order_number, user_id, total_price, status)
            VALUES (?, ?, ?, 'pending')
        `, [orderNumber, req.userId, totalPrice]);
        
        const orderId = orderResult.insertId;
        
        // 创建订单项并更新库存
        for (const item of orderItems) {
            // 插入订单项
            await connection.query(`
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            `, [orderId, item.product_id, item.quantity, item.price]);
            
            // 更新商品库存
            await connection.query(`
                UPDATE products 
                SET stock = stock - ?, update_time = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [item.quantity, item.product_id]);
        }
        
        // 清空购物车
        await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.userId]);
        
        await connection.commit();
        
        res.status(201).json({
            code: 201,
            message: '订单创建成功',
            data: {
                order_id: orderId,
                order_number: orderNumber,
                total_price: totalPrice,
                items: orderItems
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('创建订单错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    } finally {
        connection.release();
    }
});

// 获取用户的订单列表
router.get('/my-orders', authenticateUser, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        let whereClause = 'WHERE o.user_id = ?';
        const params = [req.userId];
        
        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }
        
        // 查询订单列表
        const orders = await db.query(`
            SELECT 
                o.*,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
            FROM orders o
            ${whereClause}
            ORDER BY o.create_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, params);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM orders o
            ${whereClause}
        `, params);
        
        const total = totalResult[0].total;
        
        res.json({
            code: 200,
            data: {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: pageLimit,
                    total,
                    pages: Math.ceil(total / pageLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('获取订单列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取单个订单详情
router.get('/:order_id', authenticateUser, async (req, res) => {
    try {
        const { order_id } = req.params;
        
        // 查询订单基本信息
        const orders = await db.query(`
            SELECT o.*
            FROM orders o
            WHERE o.id = ? AND o.user_id = ?
        `, [order_id, req.userId]);
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        
        // 查询订单项
        const orderItems = await db.query(`
            SELECT 
                oi.*,
                p.name as product_name,
                p.image_url as product_image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        `, [order_id]);
        
        res.json({
            code: 200,
            data: {
                order,
                items: orderItems
            }
        });
        
    } catch (error) {
        console.error('获取订单详情错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 取消订单
router.put('/:order_id/cancel', authenticateUser, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { order_id } = req.params;
        
        // 检查订单是否存在且属于当前用户
        const orders = await connection.query(`
            SELECT id, status 
            FROM orders 
            WHERE id = ? AND user_id = ?
        `, [order_id, req.userId]);
        
        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        
        // 检查订单状态是否可以取消
        if (order.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({
                code: 400,
                message: `订单状态为"${order.status}"，不能取消`
            });
        }
        
        // 更新订单状态
        await connection.query(`
            UPDATE orders 
            SET status = 'cancelled', update_time = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [order_id]);
        
        // 恢复商品库存
        const orderItems = await connection.query(`
            SELECT product_id, quantity 
            FROM order_items 
            WHERE order_id = ?
        `, [order_id]);
        
        for (const item of orderItems) {
            await connection.query(`
                UPDATE products 
                SET stock = stock + ?, update_time = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [item.quantity, item.product_id]);
        }
        
        await connection.commit();
        
        res.json({
            code: 200,
            message: '订单取消成功'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('取消订单错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    } finally {
        connection.release();
    }
});

// 获取订单统计
router.get('/stats/summary', authenticateUser, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                COALESCE(SUM(total_price), 0) as total_amount
            FROM orders
            WHERE user_id = ?
        `, [req.userId]);
        
        res.json({
            code: 200,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('获取订单统计错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员获取所有订单
router.get('/admin/all', authenticateUser, async (req, res) => {
    try {
        // 检查是否是管理员
        if (req.userRole !== '超级管理员') {
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        const {
            page = 1,
            limit = 10,
            status,
            start_date,
            end_date,
            user_id
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }
        
        if (user_id) {
            whereClause += ' AND o.user_id = ?';
            params.push(user_id);
        }
        
        if (start_date) {
            whereClause += ' AND o.create_time >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            whereClause += ' AND o.create_time <= ?';
            params.push(end_date);
        }
        
        // 查询订单列表
        const orders = await db.query(`
            SELECT 
                o.*,
                u.username as user_name,
                u.email as user_email,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ${whereClause}
            ORDER BY o.create_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, params);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM orders o
            ${whereClause}
        `, params);
        
        const total = totalResult[0].total;
        
        res.json({
            code: 200,
            data: {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: pageLimit,
                    total,
                    pages: Math.ceil(total / pageLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('管理员获取订单列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员更新订单状态
router.put('/admin/:order_id/status', authenticateUser, async (req, res) => {
    try {
        // 检查是否是管理员
        if (req.userRole !== '超级管理员') {
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        const { order_id } = req.params;
        const { status } = req.body;
        
        if (!status || !['pending', 'paid', 'shipped', 'completed'].includes(status)) {
            return res.status(400).json({
                code: 400,
                message: '无效的订单状态'
            });
        }
        
        // 检查订单是否存在
        const orders = await db.query(
            'SELECT id FROM orders WHERE id = ?',
            [order_id]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        // 更新订单状态
        await db.query(`
            UPDATE orders 
            SET status = ?, update_time = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, order_id]);
        
        res.json({
            code: 200,
            message: '订单状态更新成功'
        });
        
    } catch (error) {
        console.error('更新订单状态错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;