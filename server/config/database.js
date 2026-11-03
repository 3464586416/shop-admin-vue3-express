const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'shop_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 10000,
            charset: 'utf8mb4',
            // TiDB Cloud / 云 MySQL 需 TLS 时设 DB_SSL=true
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
            decimalNumbers: true, // 确保正确处理小数
            typeCast: function (field, next) {
                if (field.type === 'TINY' && field.length === 1) {
                    return field.string() === '1'; // 将TINYINT(1)转换为布尔值
                }
                return next();
            }
        };
    }

    async init() {
        try {
            this.pool = mysql.createPool(this.config);
            console.log('数据库连接池已创建');
            return true;
        } catch (error) {
            console.error('创建数据库连接池失败:', error);
            return false;
        }
    }

    async getConnection() {
        try {
            return await this.pool.getConnection();
        } catch (error) {
            console.error('获取数据库连接失败:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        let connection;
        try {
            connection = await this.getConnection();
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('数据库查询失败:', error);
            console.error('SQL:', sql);
            console.error('参数:', params);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    async transaction(callback) {
        let connection;
        try {
            connection = await this.getConnection();
            await connection.beginTransaction();
            
            const result = await callback(connection);
            
            await connection.commit();
            return result;
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    async testConnection() {
        try {
            await this.query('SELECT 1');
            console.log('数据库连接测试成功');
            return true;
        } catch (error) {
            console.error('数据库连接测试失败:', error);
            return false;
        }
    }

    async initDatabase() {
        try {
            // 检查表是否存在，如果不存在则创建
            // 用户表
            await this.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(100),
                    role ENUM('超级管理员', '普通用户') DEFAULT '普通用户',
                    avatar VARCHAR(255),
                    register_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_username (username)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 分类表
            await this.query(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    base_count INT DEFAULT 1,
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    sort_order INT DEFAULT 0,
                    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_status (status),
                    INDEX idx_sort_order (sort_order)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 商品表
            await this.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    stock INT NOT NULL DEFAULT 0,
                    category_id INT,
                    description TEXT,
                    image_url VARCHAR(500),
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_category_id (category_id),
                    INDEX idx_status (status),
                    INDEX idx_price (price)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 购物车项表
            await this.query(`
                CREATE TABLE IF NOT EXISTS cart_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    product_id INT NOT NULL,
                    quantity INT NOT NULL DEFAULT 1,
                    added_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_product_id (product_id),
                    UNIQUE KEY unique_user_product (user_id, product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 订单表
            await this.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_number VARCHAR(50) UNIQUE NOT NULL,
                    user_id INT NOT NULL,
                    total_price DECIMAL(10, 2) NOT NULL,
                    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
                    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_status (status),
                    INDEX idx_create_time (create_time)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 订单项表
            await this.query(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL,
                    product_id INT NOT NULL,
                    quantity INT NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    INDEX idx_order_id (order_id),
                    INDEX idx_product_id (product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 消息表
            await this.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    is_read TINYINT(1) DEFAULT 0,
                    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_is_read (is_read),
                    INDEX idx_create_time (create_time)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // 种子账号：与登录页展示的测试账号一致（bcrypt 哈希，仅演示用）
            const seeded = await this.query(
                "SELECT username FROM users WHERE username IN ('admin', 'user')"
            );
            const existing = seeded.map(r => r.username);
            if (!existing.includes('admin')) {
                await this.query(
                    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                    ['admin', bcrypt.hashSync('admin', 10), 'admin@example.com', '超级管理员']
                );
                console.log('已创建演示管理员账号 admin');
            }
            if (!existing.includes('user')) {
                await this.query(
                    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                    ['user', bcrypt.hashSync('user', 10), 'user@example.com', '普通用户']
                );
                console.log('已创建演示普通账号 user');
            }

            // 演示数据：分类/商品/订单/留言（仅当对应表为空时写入，方便在线演示）
            const catRows = await this.query('SELECT COUNT(*) AS c FROM categories');
            let catIds;
            if (Number(catRows[0].c) === 0) {
                const cats = [
                    ['数码电子', '手机、电脑与周边配件', 1],
                    ['服装鞋包', '男女服饰与箱包', 2],
                    ['食品饮品', '零食、生鲜与冲调', 3],
                    ['家居日用', '家纺、收纳与生活小电', 4],
                    ['运动户外', '健身、骑行与露营', 5]
                ];
                catIds = [];
                for (const c of cats) {
                    const r = await this.query(
                        'INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)', c
                    );
                    catIds.push(r.insertId);
                }
                console.log('已创建演示分类 5 个');
            } else {
                catIds = (await this.query('SELECT id FROM categories ORDER BY sort_order')).map(r => r.id);
            }

            const prodRows = await this.query('SELECT COUNT(*) AS c FROM products');
            let products;
            if (Number(prodRows[0].c) === 0 && catIds.length >= 5) {
                const prods = [
                    ['无线蓝牙耳机 Pro', 299.00, 120, 0, '主动降噪，续航 30 小时', '/images/products/p1.jpg'],
                    ['智能手表 S8', 899.00, 60, 0, '血氧心率监测，两周续航', '/images/products/p2.jpg'],
                    ['USB-C 扩展坞', 159.00, 200, 0, '八合一接口，4K 同屏输出', '/images/products/p3.jpg'],
                    ['纯棉圆领T恤', 89.00, 300, 1, '220g 重磅纯棉，三色可选', '/images/products/p4.jpg'],
                    ['轻量运动跑步鞋', 329.00, 80, 4, '缓震回弹，单只仅 210g', '/images/products/p5.jpg'],
                    ['双肩通勤背包', 219.00, 150, 1, '15.6 英寸电脑仓，防泼水', '/images/products/p6.jpg'],
                    ['云南小粒咖啡豆', 78.00, 260, 2, '中浅烘焙，坚果焦糖风味', '/images/products/p7.jpg'],
                    ['每日坚果礼盒', 128.00, 90, 2, '30 袋混合装，每日一补', '/images/products/p8.jpg'],
                    ['香薰加湿器', 149.00, 110, 3, '静音大雾量，助眠氛围灯', '/images/products/p9.jpg'],
                    ['折叠沙发床', 1299.00, 25, 3, '小户型神器，一秒变床', '/images/products/p10.jpg']
                ];
                products = [];
                for (const p of prods) {
                    const r = await this.query(
                        'INSERT INTO products (name, price, stock, category_id, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                        [p[0], p[1], p[2], catIds[p[3]], p[4], p[5]]
                    );
                    products.push({ id: r.insertId, price: p[1] });
                }
                console.log('已创建演示商品 10 个');
            } else {
                products = (await this.query('SELECT id, price FROM products LIMIT 30'))
                    .map(r => ({ id: r.id, price: Number(r.price) }));
            }

            const ordRows = await this.query('SELECT COUNT(*) AS c FROM orders');
            if (Number(ordRows[0].c) === 0 && products.length >= 10) {
                const buyer = await this.query("SELECT id FROM users WHERE username = 'user'");
                const buyerId = buyer.length ? buyer[0].id : 1;
                const statuses = ['completed', 'paid', 'shipped', 'pending', 'cancelled'];
                for (let i = 0; i < 12; i++) {
                    const items = [{ p: products[i % 10], qty: (i % 3) + 1 }];
                    if (i % 4 === 0) items.push({ p: products[(i + 3) % 10], qty: 1 });
                    const total = items.reduce((s, it) => s + it.p.price * it.qty, 0);
                    const ord = await this.query(
                        'INSERT INTO orders (order_number, user_id, total_price, status, create_time) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
                        ['ORD2026' + String(1000 + i), buyerId, total.toFixed(2), statuses[i % 5], 30 - i * 2]
                    );
                    for (const it of items) {
                        await this.query(
                            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                            [ord.insertId, it.p.id, it.qty, it.p.price]
                        );
                    }
                }
                console.log('已创建演示订单 12 笔');
            }

            const msgRows = await this.query('SELECT COUNT(*) AS c FROM messages');
            if (Number(msgRows[0].c) === 0) {
                const buyer2 = await this.query("SELECT id FROM users WHERE username = 'user'");
                const uid = buyer2.length ? buyer2[0].id : 1;
                const msgs = [
                    [uid, '建议增加货到付款', '希望下单时可以选择货到付款，给长辈买东西更方便。', 0],
                    [uid, '耳机发货很快', '昨天下的单今天就到了，物流速度点赞！', 1],
                    [uid, '希望多上一些户外装备', '露营热潮下想买的帐篷和睡袋分类里都没有，希望能补充。', 0]
                ];
                for (const m of msgs) {
                    await this.query(
                        'INSERT INTO messages (user_id, title, content, is_read) VALUES (?, ?, ?, ?)', m
                    );
                }
                console.log('已创建演示留言 3 条');
            }

            console.log('数据库表结构检查/创建完成');
            return true;
            
        } catch (error) {
            console.error('数据库初始化失败:', error);
            return false;
        }
    }
}

// 创建单例实例
const database = new Database();

// 初始化数据库连接
database.init().then(() => {
    console.log('数据库模块初始化完成');
}).catch(err => {
    console.error('数据库模块初始化失败:', err);
});

module.exports = database;