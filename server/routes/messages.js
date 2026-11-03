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
        next();
        
    } catch (error) {
        return res.status(401).json({
            code: 401,
            message: '无效的认证令牌'
        });
    }
};

// 获取用户的消息列表
router.get('/', authenticateUser, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            is_read,
            start_date,
            end_date
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        let whereClause = 'WHERE user_id = ?';
        const params = [req.userId];
        
        if (is_read !== undefined) {
            whereClause += ' AND is_read = ?';
            params.push(is_read === 'true' ? 1 : 0);
        }
        
        if (start_date) {
            whereClause += ' AND create_time >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            whereClause += ' AND create_time <= ?';
            params.push(end_date);
        }
        
        // 查询消息列表
        const messages = await db.query(`
            SELECT *
            FROM messages
            ${whereClause}
            ORDER BY create_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, params);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM messages
            ${whereClause}
        `, params);
        
        const total = totalResult[0].total;
        
        // 查询未读数量
        const unreadResult = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE user_id = ? AND is_read = 0
        `, [req.userId]);
        
        const unreadCount = unreadResult[0].unread_count;
        
        res.json({
            code: 200,
            data: {
                messages,
                unread_count: unreadCount,
                pagination: {
                    page: parseInt(page),
                    limit: pageLimit,
                    total,
                    pages: Math.ceil(total / pageLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('获取消息列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取单个消息详情
router.get('/:message_id', authenticateUser, async (req, res) => {
    try {
        const { message_id } = req.params;
        
        // 查询消息
        const messages = await db.query(`
            SELECT *
            FROM messages
            WHERE id = ? AND user_id = ?
        `, [message_id, req.userId]);
        
        if (messages.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '消息不存在'
            });
        }
        
        const message = messages[0];
        
        // 如果消息未读，标记为已读
        if (message.is_read === 0) {
            await db.query(`
                UPDATE messages 
                SET is_read = 1 
                WHERE id = ?
            `, [message_id]);
        }
        
        res.json({
            code: 200,
            data: message
        });
        
    } catch (error) {
        console.error('获取消息详情错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 标记消息为已读
router.put('/:message_id/read', authenticateUser, async (req, res) => {
    try {
        const { message_id } = req.params;
        
        const result = await db.query(`
            UPDATE messages 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?
        `, [message_id, req.userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                message: '消息不存在'
            });
        }
        
        res.json({
            code: 200,
            message: '消息已标记为已读'
        });
        
    } catch (error) {
        console.error('标记消息为已读错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 批量标记消息为已读
router.put('/batch/read', authenticateUser, async (req, res) => {
    try {
        const { message_ids } = req.body;
        
        if (!message_ids || !Array.isArray(message_ids)) {
            return res.status(400).json({
                code: 400,
                message: '参数错误'
            });
        }
        
        if (message_ids.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '请选择要标记的消息'
            });
        }
        
        const placeholders = message_ids.map(() => '?').join(',');
        const values = [...message_ids, req.userId];
        
        const result = await db.query(`
            UPDATE messages 
            SET is_read = 1 
            WHERE id IN (${placeholders}) AND user_id = ?
        `, values);
        
        res.json({
            code: 200,
            message: `成功标记 ${result.affectedRows} 条消息为已读`,
            data: { affectedRows: result.affectedRows }
        });
        
    } catch (error) {
        console.error('批量标记消息为已读错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 删除消息
router.delete('/:message_id', authenticateUser, async (req, res) => {
    try {
        const { message_id } = req.params;
        
        const result = await db.query(`
            DELETE FROM messages 
            WHERE id = ? AND user_id = ?
        `, [message_id, req.userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                message: '消息不存在'
            });
        }
        
        res.json({
            code: 200,
            message: '消息删除成功'
        });
        
    } catch (error) {
        console.error('删除消息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 批量删除消息
router.delete('/batch/delete', authenticateUser, async (req, res) => {
    try {
        const { message_ids } = req.body;
        
        if (!message_ids || !Array.isArray(message_ids)) {
            return res.status(400).json({
                code: 400,
                message: '参数错误'
            });
        }
        
        if (message_ids.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '请选择要删除的消息'
            });
        }
        
        const placeholders = message_ids.map(() => '?').join(',');
        const values = [...message_ids, req.userId];
        
        const result = await db.query(`
            DELETE FROM messages 
            WHERE id IN (${placeholders}) AND user_id = ?
        `, values);
        
        res.json({
            code: 200,
            message: `成功删除 ${result.affectedRows} 条消息`,
            data: { affectedRows: result.affectedRows }
        });
        
    } catch (error) {
        console.error('批量删除消息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 发送消息（管理员功能）
router.post('/send', authenticateUser, async (req, res) => {
    try {
        const { user_id, title, content } = req.body;
        
        if (!user_id || !title || !content) {
            return res.status(400).json({
                code: 400,
                message: '用户ID、标题和内容不能为空'
            });
        }
        
        // 检查用户是否存在
        const users = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [user_id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        // 发送消息
        const result = await db.query(`
            INSERT INTO messages (user_id, title, content)
            VALUES (?, ?, ?)
        `, [user_id, title, content]);
        
        res.status(201).json({
            code: 201,
            message: '消息发送成功',
            data: {
                message_id: result.insertId
            }
        });
        
    } catch (error) {
        console.error('发送消息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取未读消息数量
router.get('/unread/count', authenticateUser, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE user_id = ? AND is_read = 0
        `, [req.userId]);
        
        res.json({
            code: 200,
            data: {
                unread_count: result[0].unread_count
            }
        });
        
    } catch (error) {
        console.error('获取未读消息数量错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 清空所有已读消息
router.delete('/clear/read', authenticateUser, async (req, res) => {
    try {
        const result = await db.query(`
            DELETE FROM messages 
            WHERE user_id = ? AND is_read = 1
        `, [req.userId]);
        
        res.json({
            code: 200,
            message: `成功清空 ${result.affectedRows} 条已读消息`,
            data: { affectedRows: result.affectedRows }
        });
        
    } catch (error) {
        console.error('清空已读消息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;