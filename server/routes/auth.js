const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET; // 无默认值，启动时由 server.js 校验
const JWT_EXPIRES_IN = '24h';

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                code: 400,
                message: '用户名和密码不能为空'
            });
        }
        
        // 查询用户
        const users = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                code: 401,
                message: '用户名或密码错误'
            });
        }
        
        const user = users[0];
        
        // bcrypt 校验密码；历史明文数据校验通过后自动升级为哈希存储
        const stored = user.password;
        const isHash = /^\$2[aby]\$/.test(stored);
        let passwordOk = false;
        if (isHash) {
            passwordOk = bcrypt.compareSync(password, stored);
        } else if (stored === password) {
            passwordOk = true;
            await db.query('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(password, 10), user.id]);
        }
        if (!passwordOk) {
            return res.status(401).json({
                code: 401,
                message: '用户名或密码错误'
            });
        }
        
        // 生成JWT令牌
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // 移除密码字段
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            code: 200,
            message: '登录成功',
            data: {
                token,
                user: userWithoutPassword
            }
        });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // 验证输入
        if (!username || !password || !email) {
            return res.status(400).json({
                code: 400,
                message: '用户名、密码和邮箱不能为空'
            });
        }
        
        // 检查用户名是否已存在
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '用户名已存在'
            });
        }
        
        // 检查邮箱是否已存在
        const existingEmail = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '邮箱已存在'
            });
        }
        
        // 创建用户
        const result = await db.query(
            'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, bcrypt.hashSync(password, 10), email, '普通用户']
        );
        
        res.json({
            code: 200,
            message: '注册成功',
            data: {
                id: result.insertId,
                username,
                email,
                role: '普通用户'
            }
        });
        
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: '未提供认证令牌'
            });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            const users = await db.query(
                'SELECT id, username, email, role, avatar, register_time FROM users WHERE id = ?',
                [decoded.id]
            );
            
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
            
        } catch (jwtError) {
            return res.status(401).json({
                code: 401,
                message: '无效的认证令牌'
            });
        }
        
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 修改密码
router.put('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const { oldPassword, newPassword } = req.body;
        
        if (!token) {
            return res.status(401).json({
                code: 401,
                message: '未提供认证令牌'
            });
        }
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                code: 400,
                message: '旧密码和新密码不能为空'
            });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // 验证旧密码
            const users = await db.query(
                'SELECT password FROM users WHERE id = ?',
                [decoded.id]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '用户不存在'
                });
            }
            
            const storedOld = users[0].password;
            const oldOk = /^\$2[aby]\$/.test(storedOld)
                ? bcrypt.compareSync(oldPassword, storedOld)
                : storedOld === oldPassword;
            if (!oldOk) {
                return res.status(400).json({
                    code: 400,
                    message: '旧密码错误'
                });
            }
            
            // 更新密码
            await db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [bcrypt.hashSync(newPassword, 10), decoded.id]
            );
            
            res.json({
                code: 200,
                message: '密码修改成功'
            });
            
        } catch (jwtError) {
            return res.status(401).json({
                code: 401,
                message: '无效的认证令牌'
            });
        }
        
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;