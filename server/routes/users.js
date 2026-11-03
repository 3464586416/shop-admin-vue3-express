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

// 获取用户信息
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const users = await db.query(`
            SELECT 
                id, username, email, role, avatar, register_time
            FROM users 
            WHERE id = ?
        `, [req.userId]);
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        res.json({
            code: 200,
            data: users[0]
        });
        
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 更新用户信息
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const { email, avatar } = req.body;
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        if (email !== undefined) {
            // 检查邮箱是否已存在
            const existingEmail = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.userId]
            );
            
            if (existingEmail.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '邮箱已存在'
                });
            }
            
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        
        if (avatar !== undefined) {
            updateFields.push('avatar = ?');
            updateValues.push(avatar);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '没有提供更新字段'
            });
        }
        
        // 执行更新
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, req.userId]
        );
        
        // 获取更新后的用户信息
        const updatedUser = await db.query(`
            SELECT 
                id, username, email, role, avatar, register_time
            FROM users 
            WHERE id = ?
        `, [req.userId]);
        
        res.json({
            code: 200,
            message: '用户信息更新成功',
            data: updatedUser[0]
        });
        
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 修改密码
router.put('/change-password', authenticateUser, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                code: 400,
                message: '旧密码和新密码不能为空'
            });
        }
        
        if (oldPassword === newPassword) {
            return res.status(400).json({
                code: 400,
                message: '新密码不能与旧密码相同'
            });
        }
        
        // 验证旧密码
        const users = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [req.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        if (users[0].password !== oldPassword) {
            return res.status(400).json({
                code: 400,
                message: '旧密码错误'
            });
        }
        
        // 更新密码
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [newPassword, req.userId]
        );
        
        res.json({
            code: 200,
            message: '密码修改成功'
        });
        
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取用户统计信息
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE user_id = ?) as order_count,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE user_id = ?) as total_spent,
                (SELECT COUNT(*) FROM cart_items WHERE user_id = ?) as cart_count,
                (SELECT COUNT(*) FROM messages WHERE user_id = ? AND is_read = 0) as unread_message_count
        `, [req.userId, req.userId, req.userId, req.userId]);
        
        res.json({
            code: 200,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('获取用户统计错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员获取所有用户
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
            role,
            start_date,
            end_date,
            search
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }
        
        if (search) {
            whereClause += ' AND (username LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (start_date) {
            whereClause += ' AND register_time >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            whereClause += ' AND register_time <= ?';
            params.push(end_date);
        }
        
        // 查询用户列表
        const users = await db.query(`
            SELECT 
                id, username, email, role, avatar, register_time
            FROM users
            ${whereClause}
            ORDER BY register_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, params);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM users
            ${whereClause}
        `, params);
        
        const total = totalResult[0].total;
        
        res.json({
            code: 200,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: pageLimit,
                    total,
                    pages: Math.ceil(total / pageLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('管理员获取用户列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员获取用户详情
router.get('/admin/:user_id', authenticateUser, async (req, res) => {
    try {
        // 检查是否是管理员
        if (req.userRole !== '超级管理员') {
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        const { user_id } = req.params;
        
        const users = await db.query(`
            SELECT 
                id, username, email, role, avatar, register_time
            FROM users 
            WHERE id = ?
        `, [user_id]);
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        // 获取用户的订单统计
        const orderStats = await db.query(`
            SELECT 
                COUNT(*) as order_count,
                COALESCE(SUM(total_price), 0) as total_spent
            FROM orders
            WHERE user_id = ?
        `, [user_id]);
        
        // 获取用户的最新订单
        const recentOrders = await db.query(`
            SELECT *
            FROM orders
            WHERE user_id = ?
            ORDER BY create_time DESC
            LIMIT 5
        `, [user_id]);
        
        const user = users[0];
        user.order_stats = orderStats[0];
        user.recent_orders = recentOrders;
        
        res.json({
            code: 200,
            data: user
        });
        
    } catch (error) {
        console.error('管理员获取用户详情错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员更新用户信息
router.put('/admin/:user_id', authenticateUser, async (req, res) => {
    try {
        // 检查是否是管理员
        if (req.userRole !== '超级管理员') {
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        const { user_id } = req.params;
        const { email, role, avatar } = req.body;
        
        // 检查用户是否存在
        const existingUser = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        if (email !== undefined) {
            // 检查邮箱是否已存在
            const existingEmail = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, user_id]
            );
            
            if (existingEmail.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '邮箱已存在'
                });
            }
            
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        
        if (role !== undefined) {
            if (!['超级管理员', '普通用户'].includes(role)) {
                return res.status(400).json({
                    code: 400,
                    message: '无效的角色'
                });
            }
            
            updateFields.push('role = ?');
            updateValues.push(role);
        }
        
        if (avatar !== undefined) {
            updateFields.push('avatar = ?');
            updateValues.push(avatar);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '没有提供更新字段'
            });
        }
        
        // 执行更新
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, user_id]
        );
        
        res.json({
            code: 200,
            message: '用户信息更新成功'
        });
        
    } catch (error) {
        console.error('管理员更新用户信息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 管理员删除用户
router.delete('/admin/:user_id', authenticateUser, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        // 检查是否是管理员
        if (req.userRole !== '超级管理员') {
            connection.release();
            return res.status(403).json({
                code: 403,
                message: '权限不足'
            });
        }
        
        const { user_id } = req.params;
        
        // 不能删除自己
        if (parseInt(user_id) === req.userId) {
            connection.release();
            return res.status(400).json({
                code: 400,
                message: '不能删除自己'
            });
        }
        
        // 检查用户是否存在
        const existingUser = await connection.query(
            'SELECT id, username FROM users WHERE id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            connection.release();
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        await connection.beginTransaction();
        
        try {
            // 删除用户的订单项
            const userOrders = await connection.query(
                'SELECT id FROM orders WHERE user_id = ?',
                [user_id]
            );
            
            if (userOrders.length > 0) {
                const orderIds = userOrders.map(order => order.id);
                const placeholders = orderIds.map(() => '?').join(',');
                
                await connection.query(`
                    DELETE FROM order_items 
                    WHERE order_id IN (${placeholders})
                `, orderIds);
                
                // 删除用户的订单
                await connection.query(
                    'DELETE FROM orders WHERE user_id = ?',
                    [user_id]
                );
            }
            
            // 删除用户的购物车项
            await connection.query(
                'DELETE FROM cart_items WHERE user_id = ?',
                [user_id]
            );
            
            // 删除用户的消息
            await connection.query(
                'DELETE FROM messages WHERE user_id = ?',
                [user_id]
            );
            
            // 删除用户
            await connection.query(
                'DELETE FROM users WHERE id = ?',
                [user_id]
            );
            
            await connection.commit();
            
            res.json({
                code: 200,
                message: '用户删除成功'
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('管理员删除用户错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;