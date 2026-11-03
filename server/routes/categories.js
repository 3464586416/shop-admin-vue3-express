const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 获取所有分类
router.get('/', async (req, res) => {
    try {
        const categories = await db.query(`
            SELECT * FROM categories 
            WHERE status = 'active'
            ORDER BY sort_order ASC, create_time DESC
        `);
        
        res.json({
            code: 200,
            data: categories
        });
        
    } catch (error) {
        console.error('获取分类列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取单个分类
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const categories = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        if (categories.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '分类不存在'
            });
        }
        
        res.json({
            code: 200,
            data: categories[0]
        });
        
    } catch (error) {
        console.error('获取分类错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 创建分类（需要管理员权限）
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            base_count = 1,
            status = 'active',
            sort_order = 0
        } = req.body;
        
        if (!name) {
            return res.status(400).json({
                code: 400,
                message: '分类名称不能为空'
            });
        }
        
        // 检查分类名是否已存在
        const existingCategory = await db.query(
            'SELECT id FROM categories WHERE name = ?',
            [name]
        );
        
        if (existingCategory.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '分类名称已存在'
            });
        }
        
        // 创建分类
        const result = await db.query(`
            INSERT INTO categories (
                name, description, base_count, status, sort_order
            ) VALUES (?, ?, ?, ?, ?)
        `, [name, description, base_count, status, sort_order]);
        
        // 获取创建的分类
        const newCategory = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            code: 201,
            message: '分类创建成功',
            data: newCategory[0]
        });
        
    } catch (error) {
        console.error('创建分类错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 更新分类（需要管理员权限）
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            base_count,
            status,
            sort_order
        } = req.body;
        
        // 检查分类是否存在
        const existingCategory = await db.query(
            'SELECT id, name FROM categories WHERE id = ?',
            [id]
        );
        
        if (existingCategory.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '分类不存在'
            });
        }
        
        // 如果修改了名称，检查新名称是否已存在
        if (name && name !== existingCategory[0].name) {
            const duplicateCategory = await db.query(
                'SELECT id FROM categories WHERE name = ? AND id != ?',
                [name, id]
            );
            
            if (duplicateCategory.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '分类名称已存在'
                });
            }
        }
        
        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        
        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        
        if (base_count !== undefined) {
            updateFields.push('base_count = ?');
            updateValues.push(base_count);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        if (sort_order !== undefined) {
            updateFields.push('sort_order = ?');
            updateValues.push(sort_order);
        }
        
        // 总是更新update_time
        updateFields.push('update_time = CURRENT_TIMESTAMP');
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '没有提供更新字段'
            });
        }
        
        // 执行更新
        await db.query(
            `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, id]
        );
        
        // 获取更新后的分类
        const updatedCategory = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        res.json({
            code: 200,
            message: '分类更新成功',
            data: updatedCategory[0]
        });
        
    } catch (error) {
        console.error('更新分类错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 删除分类（需要管理员权限）
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查分类是否存在
        const existingCategory = await db.query(
            'SELECT id FROM categories WHERE id = ?',
            [id]
        );
        
        if (existingCategory.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '分类不存在'
            });
        }
        
        // 检查分类下是否有商品
        const products = await db.query(
            'SELECT id FROM products WHERE category_id = ? LIMIT 1',
            [id]
        );
        
        if (products.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '分类下存在商品，不能删除'
            });
        }
        
        // 删除分类
        await db.query('DELETE FROM categories WHERE id = ?', [id]);
        
        res.json({
            code: 200,
            message: '分类删除成功'
        });
        
    } catch (error) {
        console.error('删除分类错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取分类下的商品
// 修改获取分类下的商品路由，添加更详细的错误处理
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 10,
            status = 'active'
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        console.log(`获取分类商品: id=${id}, page=${page}, limit=${pageLimit}, status=${status}`);
        
        // 检查分类是否存在
        const category = await db.query(
            'SELECT id, name FROM categories WHERE id = ?',
            [id]
        );
        
        if (category.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '分类不存在'
            });
        }
        
        // 查询分类下的商品
        const queryParams = [id, status, pageLimit, offset];
        console.log('查询参数:', queryParams);
        
        const products = await db.query(`
            SELECT * FROM products 
            WHERE category_id = ? AND status = ?
            ORDER BY create_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, [id, status]);
        
        console.log(`查询结果: ${products.length} 个商品`);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM products
            WHERE category_id = ? AND status = ?
        `, [id, status]);
        
        const total = totalResult[0].total;
        
        res.json({
            code: 200,
            data: {
                category: category[0],
                products,
                pagination: {
                    page: parseInt(page),
                    limit: pageLimit,
                    total,
                    pages: Math.ceil(total / pageLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('获取分类商品错误详情:', error);
        console.error('SQL错误代码:', error.code);
        console.error('SQL错误信息:', error.sqlMessage);
        console.error('SQL语句:', error.sql);
        
        res.status(500).json({
            code: 500,
            message: '获取分类商品失败',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            } : undefined
        });
    }
});

// 获取分类统计信息
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                c.id,
                c.name,
                COUNT(p.id) as product_count,
                COALESCE(SUM(p.stock), 0) as total_stock,
                COALESCE(AVG(p.price), 0) as avg_price
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
            WHERE c.status = 'active'
            GROUP BY c.id, c.name, c.sort_order
            ORDER BY c.sort_order ASC
        `);
        
        res.json({
            code: 200,
            data: stats
        });
        
    } catch (error) {
        console.error('获取分类统计错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;