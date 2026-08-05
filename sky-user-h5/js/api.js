/**
 * API 封装模块
 * 基准地址：http://localhost:8080
 */

const BASE_URL = 'http://localhost:8080';

/**
 * 通用请求方法
 * @param {string} path - 接口路径（含前缀，如 /user/category/list）
 * @param {object} options - fetch 选项（method, body, headers 等）
 * @returns {Promise<object>} 解析后的 JSON 响应
 */
async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['authentication'] = token;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    throw new Error(`请求失败: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  if (json.code !== 0 && json.code !== 1) {
    // 业务错误
    console.warn('API 业务错误:', json);
  }
  return json;
}

// ===== 1. 登录 =====
function apiLogin(nickname) {
  return request('/user/user/simpleLogin', {
    method: 'POST',
    body: JSON.stringify({ code: nickname }),
  });
}

// ===== 2. 分类列表 =====
function apiGetCategories() {
  return request('/user/category/list');
}

// ===== 3. 菜品列表 =====
function apiGetDishes(categoryId) {
  return request(`/user/dish/list?categoryId=${categoryId}`);
}

// ===== 4. 套餐列表 =====
function apiGetSetmeals(categoryId) {
  return request(`/user/setmeal/list?categoryId=${categoryId}`);
}

// ===== 5. 套餐内菜品 =====
function apiGetSetmealDishes(setmealId) {
  return request(`/user/setmeal/dish/${setmealId}`);
}

// ===== 6. 加购 =====
function apiAddToCart(body) {
  return request('/user/shoppingCart/add', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ===== 7. 查看购物车 =====
function apiGetCart() {
  return request('/user/shoppingCart/list');
}

// ===== 8. 减购 =====
function apiSubFromCart(body) {
  return request('/user/shoppingCart/sub', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ===== 9. 清空购物车 =====
function apiClearCart() {
  return request('/user/shoppingCart/clean', {
    method: 'DELETE',
  });
}

// ===== 10. 下单 =====
function apiSubmitOrder(orderData) {
  return request('/user/order/submit', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

// ===== 11. 订单历史 =====
function apiGetOrders(page = 1, pageSize = 10, status = '') {
  return request(`/user/order/historyOrders?page=${page}&pageSize=${pageSize}&status=${status}`);
}

// ===== 12. 地址管理 =====
function apiGetAddresses() {
  return request('/user/addressBook/list');
}

function apiGetDefaultAddress() {
  return request('/user/addressBook/default');
}

function apiAddAddress(body) {
  return request('/user/addressBook', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function apiUpdateAddress(body) {
  return request('/user/addressBook', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function apiDeleteAddress(id) {
  return request(`/user/addressBook?id=${id}`, {
    method: 'DELETE',
  });
}

function apiSetDefaultAddress(body) {
  return request('/user/addressBook/default', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

// ===== 13. KBZPay 模拟支付 =====
function apiSimulatePay(orderId) {
  return request('/user/order/payment', {
    method: 'PUT',
    body: JSON.stringify({ orderNumber: String(orderId), payMethod: 1 }),
  });
}

// ===== 14. 催单 =====
function apiReminder(orderId) {
  return request(`/user/order/reminder/${orderId}`);
}

// ===== 15. 再来一单 =====
function apiRepurchase(orderId) {
  return request(`/user/order/repetition/${orderId}`, {
    method: 'POST',
  });
}
