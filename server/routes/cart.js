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

// 获取用户的购物车
router.get('/', authenticateUser, async (req, res) => {
    try {
        const cartItems = await db.query(`
            SELECT 
                ci.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                p.stock as product_stock,
                p.status as product_status
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_time DESC
        `, [req.userId]);
        
        // 计算总价
        let totalPrice = 0;
        const validItems = cartItems.filter(item => {
            if (item.product_status === 'active' && item.product_stock > 0) {
                totalPrice += item.product_price * item.quantity;
                return true;
            }
            return false;
        });
        
        res.json({
            code: 200,
            data: {
                items: validItems,
                total: cartItems.length,
                totalPrice: totalPrice.toFixed(2)
            }
        });
        
    } catch (error) {
        console.error('获取购物车错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 添加商品到购物车
router.post('/add', authenticateUser, async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;
        
        if (!product_id) {
            return res.status(400).json({
                code: 400,
                message: '商品ID不能为空'
            });
        }
        
        // 验证商品是否存在且可用
        const products = await db.query(`
            SELECT id, price, stock, status 
            FROM products 
            WHERE id = ? AND status = 'active'
        `, [product_id]);
        
        if (products.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在或已下架'
            });
        }
        
        const product = products[0];
        
        // 检查库存
        if (product.stock < quantity) {
            return res.status(400).json({
                code: 400,
                message: `库存不足，仅剩 ${product.stock} 件`
            });
        }
        
        // 检查是否已经在购物车中
        const existingItems = await db.query(`
            SELECT id, quantity FROM cart_items 
            WHERE user_id = ? AND product_id = ?
        `, [req.userId, product_id]);
        
        if (existingItems.length > 0) {
            // 更新数量
            const newQuantity = existingItems[0].quantity + parseInt(quantity);
            
            // 再次检查库存
            if (product.stock < newQuantity) {
                return res.status(400).json({
                    code: 400,
                    message: `库存不足，最多可添加 ${product.stock - existingItems[0].quantity} 件`
                });
            }
            
            await db.query(`
                UPDATE cart_items 
                SET quantity = ?, added_time = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [newQuantity, existingItems[0].id]);
            
            res.json({
                code: 200,
                message: '购物车商品数量已更新',
                data: {
                    cart_item_id: existingItems[0].id,
                    quantity: newQuantity
                }
            });
            
        } else {
            // 添加到购物车
            const result = await db.query(`
                INSERT INTO cart_items (user_id, product_id, quantity) 
                VALUES (?, ?, ?)
            `, [req.userId, product_id, quantity]);
            
            res.status(201).json({
                code: 201,
                message: '商品已添加到购物车',
                data: {
                    cart_item_id: result.insertId
                }
            });
        }
        
    } catch (error) {
        console.error('添加购物车错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 更新购物车商品数量
router.put('/update/:cart_item_id', authenticateUser, async (req, res) => {
    try {
        const { cart_item_id } = req.params;
        const { quantity } = req.body;
        
        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({
                code: 400,
                message: '数量必须大于等于0'
            });
        }
        
        // 获取购物车项信息
        const cartItems = await db.query(`
            SELECT ci.*, p.stock as product_stock
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = ? AND ci.user_id = ?
        `, [cart_item_id, req.userId]);
        
        if (cartItems.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '购物车项不存在'
            });
        }
        
        const cartItem = cartItems[0];
        
        // 检查库存
        if (quantity > cartItem.product_stock) {
            return res.status(400).json({
                code: 400,
                message: `库存不足，最多可购买 ${cartItem.product_stock} 件`
            });
        }
        
        if (quantity === 0) {
            // 数量为0时删除
            await db.query('DELETE FROM cart_items WHERE id = ?', [cart_item_id]);
            
            res.json({
                code: 200,
                message: '商品已从购物车移除'
            });
        } else {
            // 更新数量
            await db.query(`
                UPDATE cart_items 
                SET quantity = ?, added_time = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [quantity, cart_item_id]);
            
            res.json({
                code: 200,
                message: '购物车商品数量已更新'
            });
        }
        
    } catch (error) {
        console.error('更新购物车错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 从购物车移除商品
router.delete('/remove/:cart_item_id', authenticateUser, async (req, res) => {
    try {
        const { cart_item_id } = req.params;
        
        const result = await db.query(`
            DELETE FROM cart_items 
            WHERE id = ? AND user_id = ?
        `, [cart_item_id, req.userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                message: '购物车项不存在'
            });
        }
        
        res.json({
            code: 200,
            message: '商品已从购物车移除'
        });
        
    } catch (error) {
        console.error('移除购物车商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 清空购物车
router.delete('/clear', authenticateUser, async (req, res) => {
    try {
        await db.query('DELETE FROM cart_items WHERE user_id = ?', [req.userId]);
        
        res.json({
            code: 200,
            message: '购物车已清空'
        });
        
    } catch (error) {
        console.error('清空购物车错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取购物车商品数量
router.get('/count', authenticateUser, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT SUM(quantity) as total_count
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ? AND p.status = 'active'
        `, [req.userId]);
        
        const count = result[0].total_count || 0;
        
        res.json({
            code: 200,
            data: {
                count: parseInt(count)
            }
        });
        
    } catch (error) {
        console.error('获取购物车数量错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 批量操作购物车
router.post('/batch', authenticateUser, async (req, res) => {
    try {
        const { action, items } = req.body;
        
        if (!action || !items || !Array.isArray(items)) {
            return res.status(400).json({
                code: 400,
                message: '参数错误'
            });
        }
        
        let affectedRows = 0;
        
        if (action === 'update') {
            // 批量更新
            for (const item of items) {
                if (item.cart_item_id && item.quantity !== undefined) {
                    const result = await db.query(`
                        UPDATE cart_items 
                        SET quantity = ? 
                        WHERE id = ? AND user_id = ?
                    `, [item.quantity, item.cart_item_id, req.userId]);
                    
                    affectedRows += result.affectedRows;
                }
            }
            
            res.json({
                code: 200,
                message: `成功更新 ${affectedRows} 个商品`,
                data: { affectedRows }
            });
            
        } else if (action === 'remove') {
            // 批量删除
            const placeholders = items.map(() => '?').join(',');
            const values = [...items, req.userId];
            
            const result = await db.query(`
                DELETE FROM cart_items 
                WHERE id IN (${placeholders}) AND user_id = ?
            `, values);
            
            affectedRows = result.affectedRows;
            
            res.json({
                code: 200,
                message: `成功移除 ${affectedRows} 个商品`,
                data: { affectedRows }
            });
            
        } else {
            return res.status(400).json({
                code: 400,
                message: '不支持的操作类型'
            });
        }
        
    } catch (error) {
        console.error('批量操作购物车错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;