const mysql = require('mysql2/promise');
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