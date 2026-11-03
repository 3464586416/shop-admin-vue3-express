const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let adminToken = '';
let userToken = '';

// 配置axios
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 测试函数
async function testAll() {
    console.log('🎯 开始API测试...\n');
    
    try {
        // 1. 测试无需认证的端点
        console.log('1️⃣ 测试无需认证的端点：');
        await testPublicEndpoints();
        
        // 2. 测试用户认证
        console.log('\n2️⃣ 测试用户认证：');
        await testAuth();
        
        // 3. 测试商品相关
        console.log('\n3️⃣ 测试商品相关：');
        await testProducts();
        
        // 4. 测试分类相关
        console.log('\n4️⃣ 测试分类相关：');
        await testCategories();
        
        // 5. 测试购物车（需要用户登录）
        if (userToken) {
            console.log('\n5️⃣ 测试购物车：');
            await testCart();
        }
        
        // 6. 测试订单（需要用户登录）
        if (userToken) {
            console.log('\n6️⃣ 测试订单：');
            await testOrders();
        }
        
        // 7. 测试用户相关
        if (userToken) {
            console.log('\n7️⃣ 测试用户相关：');
            await testUsers();
        }
        
        // 8. 测试管理后台（需要管理员登录）
        if (adminToken) {
            console.log('\n8️⃣ 测试管理后台：');
            await testAdmin();
        }
        
        console.log('\n✅ 所有测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 测试无需认证的端点
async function testPublicEndpoints() {
    try {
        // 测试健康检查
        console.log('- 测试健康检查...');
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log(`  ✅ 健康检查: ${healthResponse.data.status}`);
        
        // 测试数据库连接
        console.log('- 测试数据库连接...');
        const dbResponse = await api.get('/test-db');
        console.log(`  ✅ 数据库测试: ${dbResponse.data.message}`);
        console.log(`    用户: ${dbResponse.data.data.users}, 商品: ${dbResponse.data.data.products}, 分类: ${dbResponse.data.data.categories}`);
        
        // 测试商品列表
        console.log('- 测试商品列表...');
        const productsResponse = await api.get('/products?limit=5');
        console.log(`  ✅ 获取商品列表: ${productsResponse.data.data.products.length} 个商品`);
        
        // 测试分类列表
        console.log('- 测试分类列表...');
        const categoriesResponse = await api.get('/categories');
        console.log(`  ✅ 获取分类列表: ${categoriesResponse.data.data.length} 个分类`);
        
        // 测试单个商品
        console.log('- 测试单个商品...');
        const singleProduct = await api.get('/products/1');
        console.log(`  ✅ 获取单个商品: ${singleProduct.data.data.name}`);
        
    } catch (error) {
        console.error(`  ❌ 测试失败: ${error.message}`);
    }
}

// 测试认证
async function testAuth() {
    try {
        // 管理员登录
        console.log('- 管理员登录...');
        const adminLogin = await api.post('/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        adminToken = adminLogin.data.data.token;
        console.log(`  ✅ 管理员登录成功: ${adminLogin.data.data.user.username}`);
        
        // 用户登录
        console.log('- 普通用户登录...');
        const userLogin = await api.post('/auth/login', {
            username: 'user',
            password: 'user'
        });
        userToken = userLogin.data.data.token;
        console.log(`  ✅ 用户登录成功: ${userLogin.data.data.user.username}`);
        
        // 获取当前用户信息
        console.log('- 获取当前用户信息...');
        const apiWithToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        const meResponse = await apiWithToken.get('/auth/me');
        console.log(`  ✅ 获取用户信息: ${meResponse.data.data.username}`);
        
    } catch (error) {
        console.error(`  ❌ 认证测试失败: ${error.message}`);
    }
}

// 测试商品相关
async function testProducts() {
    try {
        const apiWithAdminToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // 搜索商品
        console.log('- 搜索商品...');
        const searchResponse = await api.get('/products/search/手机');
        console.log(`  ✅ 搜索商品: ${searchResponse.data.data.length} 个结果`);
        
        // 获取热门商品
        console.log('- 获取热门商品...');
        const hotResponse = await api.get('/products/hot?limit=3');
        console.log(`  ✅ 热门商品: ${hotResponse.data.data.length} 个`);
        
        // 按分类获取商品
        console.log('- 按分类获取商品...');
        const byCategory = await api.get('/products/by-category/1');
        console.log(`  ✅ 电子产品分类商品: ${byCategory.data.data.products.length} 个`);
        
        // 创建新商品（管理员）
        console.log('- 创建新商品...');
        const newProduct = {
            name: '测试商品' + Date.now(),
            price: 99.99,
            stock: 100,
            category_id: 1,
            description: '这是一个测试商品',
            image_url: '/uploads/products/test.jpg',
            status: 'active'
        };
        
        const createResponse = await apiWithAdminToken.post('/products', newProduct);
        const productId = createResponse.data.data.id;
        console.log(`  ✅ 创建商品成功: ID=${productId}`);
        
        // 更新商品
        console.log('- 更新商品...');
        await apiWithAdminToken.put(`/products/${productId}`, {
            price: 129.99,
            stock: 150
        });
        console.log(`  ✅ 更新商品成功`);
        
    } catch (error) {
        console.error(`  ❌ 商品测试失败: ${error.message}`);
    }
}

// 测试分类相关
async function testCategories() {
    try {
        const apiWithAdminToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // 获取分类详情
        console.log('- 获取分类详情...');
        const categoryDetail = await api.get('/categories/1');
        console.log(`  ✅ 分类详情: ${categoryDetail.data.data.name}`);
        
        // 获取分类下的商品
        console.log('- 获取分类下的商品...');
        const categoryProducts = await api.get('/categories/1/products?limit=3');
        console.log(`  ✅ 分类下商品: ${categoryProducts.data.data.products.length} 个`);
        
        // 获取分类统计
        console.log('- 获取分类统计...');
        const categoryStats = await api.get('/categories/stats/summary');
        console.log(`  ✅ 分类统计: ${categoryStats.data.data.length} 个分类的统计`);
        
        // 创建新分类（管理员）
        console.log('- 创建新分类...');
        const newCategory = {
            name: '测试分类' + Date.now(),
            description: '这是一个测试分类',
            status: 'active'
        };
        
        const createResponse = await apiWithAdminToken.post('/categories', newCategory);
        const categoryId = createResponse.data.data.id;
        console.log(`  ✅ 创建分类成功: ID=${categoryId}`);
        
    } catch (error) {
        console.error(`  ❌ 分类测试失败: ${error.message}`);
    }
}

// 测试购物车
async function testCart() {
    try {
        const apiWithUserToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        // 清空购物车
        console.log('- 清空购物车...');
        await apiWithUserToken.delete('/cart/clear');
        
        // 添加商品到购物车
        console.log('- 添加商品到购物车...');
        await apiWithUserToken.post('/cart/add', {
            product_id: 1,
            quantity: 2
        });
        await apiWithUserToken.post('/cart/add', {
            product_id: 2,
            quantity: 1
        });
        console.log(`  ✅ 添加商品到购物车成功`);
        
        // 获取购物车
        console.log('- 获取购物车...');
        const cartResponse = await apiWithUserToken.get('/cart');
        console.log(`  ✅ 购物车中有 ${cartResponse.data.data.items.length} 个商品`);
        console.log(`     总价: ${cartResponse.data.data.totalPrice}`);
        
        // 获取购物车数量
        console.log('- 获取购物车数量...');
        const countResponse = await apiWithUserToken.get('/cart/count');
        console.log(`  ✅ 购物车商品总数: ${countResponse.data.data.count}`);
        
    } catch (error) {
        console.error(`  ❌ 购物车测试失败: ${error.message}`);
    }
}

// 测试订单
async function testOrders() {
    try {
        const apiWithUserToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        // 获取订单统计
        console.log('- 获取订单统计...');
        const statsResponse = await apiWithUserToken.get('/orders/stats/summary');
        console.log(`  ✅ 订单统计: ${statsResponse.data.data.total_orders} 个订单`);
        
        // 获取订单列表
        console.log('- 获取订单列表...');
        const ordersResponse = await apiWithUserToken.get('/orders/my-orders');
        console.log(`  ✅ 订单列表: ${ordersResponse.data.data.orders.length} 个订单`);
        
    } catch (error) {
        console.error(`  ❌ 订单测试失败: ${error.message}`);
    }
}

// 测试用户相关
async function testUsers() {
    try {
        const apiWithUserToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });
        
        const apiWithAdminToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // 获取用户信息
        console.log('- 获取用户信息...');
        const profileResponse = await apiWithUserToken.get('/users/profile');
        console.log(`  ✅ 用户信息: ${profileResponse.data.data.username}`);
        
        // 获取用户统计
        console.log('- 获取用户统计...');
        const statsResponse = await apiWithUserToken.get('/users/stats');
        console.log(`  ✅ 用户统计: ${statsResponse.data.data.order_count} 个订单`);
        
        // 管理员获取所有用户
        console.log('- 管理员获取所有用户...');
        const allUsers = await apiWithAdminToken.get('/users/admin/all?limit=5');
        console.log(`  ✅ 所有用户: ${allUsers.data.data.users.length} 个用户`);
        
    } catch (error) {
        console.error(`  ❌ 用户测试失败: ${error.message}`);
    }
}

// 测试管理后台
async function testAdmin() {
    try {
        const apiWithAdminToken = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        // 获取后台统计
        console.log('- 获取后台统计...');
        const statsResponse = await apiWithAdminToken.get('/admin/dashboard/stats');
        console.log(`  ✅ 后台统计获取成功`);
        console.log(`     今日订单: ${statsResponse.data.data.today_stats.today_orders}`);
        console.log(`     总销售额: ${statsResponse.data.data.today_stats.total_sales}`);
        
        // 获取销售图表数据
        console.log('- 获取销售图表数据...');
        const chartsResponse = await apiWithAdminToken.get('/admin/dashboard/charts/sales?period=month');
        console.log(`  ✅ 销售图表数据: ${chartsResponse.data.data.length} 条记录`);
        
        // 获取商品销售排行榜
        console.log('- 获取商品销售排行榜...');
        const topProducts = await apiWithAdminToken.get('/admin/dashboard/top-products?limit=3');
        console.log(`  ✅ 商品销售排行榜: ${topProducts.data.data.length} 个商品`);
        
        // 获取库存预警
        console.log('- 获取库存预警...');
        const lowStock = await apiWithAdminToken.get('/admin/dashboard/low-stock?threshold=100');
        console.log(`  ✅ 库存预警: ${lowStock.data.data.length} 个商品库存较低`);
        
    } catch (error) {
        console.error(`  ❌ 管理后台测试失败: ${error.message}`);
    }
}

// 运行测试
testAll();