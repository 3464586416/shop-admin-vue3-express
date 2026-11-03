const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 搜索商品
router.get('/search/:keyword', async (req, res) => {
    try {
        const { keyword } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({
                code: 400,
                message: '搜索关键词不能为空'
            });
        }
        
        const products = await db.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'active'
            AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)
            LIMIT ${limit}
        `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
        
        res.json({
            code: 200,
            data: products
        });
        
    } catch (error) {
        console.error('搜索商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取热门商品
router.get('/hot', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // 这里可以基于销量等逻辑获取热门商品
        // 暂时按创建时间获取最新的商品
        const products = await db.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'active'
            ORDER BY p.create_time DESC
            LIMIT ${limit}
        `);
        
        res.json({
            code: 200,
            data: products
        });
        
    } catch (error) {
        console.error('获取热门商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取商品分类
router.get('/by-category/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        const products = await db.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.status = 'active'
            ORDER BY p.create_time DESC
            LIMIT ${pageLimit} OFFSET ${offset}
        `, [category_id]);
        
        // 查询总数
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM products p
            WHERE p.category_id = ? AND p.status = 'active'
        `, [category_id]);
        
        const total = totalResult[0]?.total || 0;
        
        res.json({
            code: 200,
            data: {
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
        console.error('获取分类商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取所有商品
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category_id,
            status = 'active',
            name,
            min_price,
            max_price,
            sort_by = 'create_time',
            sort_order = 'DESC'
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);
        
        const validSortFields = ['id', 'name', 'price', 'stock', 'create_time', 'update_time'];
        const validSortOrders = ['ASC', 'DESC'];
        
        // 构建查询条件
        let whereConditions = [];
        let queryParams = [];
        
        if (status) {
            whereConditions.push('p.status = ?');
            queryParams.push(status);
        }
        
        if (category_id) {
            whereConditions.push('p.category_id = ?');
            queryParams.push(category_id);
        }
        
        if (name) {
            whereConditions.push('p.name LIKE ?');
            queryParams.push(`%${name}%`);
        }
        
        if (min_price) {
            whereConditions.push('p.price >= ?');
            queryParams.push(parseFloat(min_price));
        }
        
        if (max_price) {
            whereConditions.push('p.price <= ?');
            queryParams.push(parseFloat(max_price));
        }
        
        // 验证排序参数
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'create_time';
        const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';
        
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        // 查询商品列表 - 注意：LIMIT 和 OFFSET 参数需要单独处理
        const productsQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.id as category_id
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            ORDER BY p.${sortField} ${sortOrder}
            LIMIT ${pageLimit} OFFSET ${offset}
        `;
        
        const products = await db.query(productsQuery, queryParams);
        
        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            ${whereClause}
        `;
        
        const totalResult = await db.query(countQuery, queryParams);
        const total = totalResult[0]?.total || 0;
        
        res.json({
            code: 200,
            data: {
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
        console.error('获取商品列表错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            details: error.message
        });
    }
});




// 创建商品（需要管理员权限）
router.post('/', async (req, res) => {
    try {
        const {
            name,
            price,
            stock,
            category_id,
            description,
            image_url,
            status = 'active'
        } = req.body;
        
        // 验证必填字段
        if (!name || !price || stock === undefined || !category_id) {
            return res.status(400).json({
                code: 400,
                message: '商品名称、价格、库存和分类ID不能为空'
            });
        }
        
        // 验证分类是否存在
        const categories = await db.query(
            'SELECT id FROM categories WHERE id = ?',
            [category_id]
        );
        
        if (categories.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '分类不存在'
            });
        }
        
        // 创建商品
        const result = await db.query(`
            INSERT INTO products (
                name, price, stock, category_id, 
                description, image_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [name, price, stock, category_id, description, image_url, status]);
        
        // 获取创建的商品
        const newProduct = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            code: 201,
            message: '商品创建成功',
            data: newProduct[0]
        });
        
    } catch (error) {
        console.error('创建商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 获取单个商品
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const products = await db.query(`
            SELECT 
                p.*,
                c.name as category_name,
                c.id as category_id
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);
        
        if (products.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在'
            });
        }
        
        res.json({
            code: 200,
            data: products[0]
        });
        
    } catch (error) {
        console.error('获取商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 更新商品（需要管理员权限）
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            price,
            stock,
            category_id,
            description,
            image_url,
            status
        } = req.body;
        
        // 检查商品是否存在
        const existingProduct = await db.query(
            'SELECT id FROM products WHERE id = ?',
            [id]
        );
        
        if (existingProduct.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在'
            });
        }
        
        // 如果提供了分类ID，验证分类是否存在
        if (category_id) {
            const categories = await db.query(
                'SELECT id FROM categories WHERE id = ?',
                [category_id]
            );
            
            if (categories.length === 0) {
                return res.status(400).json({
                    code: 400,
                    message: '分类不存在'
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
        
        if (price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(price);
        }
        
        if (stock !== undefined) {
            updateFields.push('stock = ?');
            updateValues.push(stock);
        }
        
        if (category_id !== undefined) {
            updateFields.push('category_id = ?');
            updateValues.push(category_id);
        }
        
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        
        if (image_url !== undefined) {
            updateFields.push('image_url = ?');
            updateValues.push(image_url);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
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
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, id]
        );
        
        // 获取更新后的商品
        const updatedProduct = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );
        
        res.json({
            code: 200,
            message: '商品更新成功',
            data: updatedProduct[0]
        });
        
    } catch (error) {
        console.error('更新商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});

// 删除商品（需要管理员权限）
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查商品是否存在
        const existingProduct = await db.query(
            'SELECT id FROM products WHERE id = ?',
            [id]
        );
        
        if (existingProduct.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在'
            });
        }
        
        // 检查商品是否有关联的订单
        const orderItems = await db.query(
            'SELECT id FROM order_items WHERE product_id = ? LIMIT 1',
            [id]
        );
        
        if (orderItems.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '商品已有关联订单，不能删除'
            });
        }
        
        // 删除商品
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        
        // 同时删除购物车中的该商品
        await db.query('DELETE FROM cart_items WHERE product_id = ?', [id]);
        
        res.json({
            code: 200,
            message: '商品删除成功'
        });
        
    } catch (error) {
        console.error('删除商品错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误'
        });
    }
});







module.exports = router;