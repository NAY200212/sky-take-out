/**
 * 苍穹外卖 H5 用户端 — 主应用逻辑
 */

(function () {
  'use strict';

  // ===== 全局状态 =====
  const state = {
    user: null,
    categories: [],
    currentCategoryId: null,
    dishes: [],
    setmeals: [],
    cart: [],
    addresses: [],
    currentOrders: [],
    currentOrderStatus: '',
  };

  // ===== DOM 缓存 =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const pages = {
    login: $('#page-login'),
    home: $('#page-home'),
    cart: $('#page-cart'),
    checkout: $('#page-checkout'),
    orders: $('#page-orders'),
    address: $('#page-address'),
    'address-form': $('#page-address-form'),
  };

  // ===== 工具函数 =====
  function showPage(name) {
    Object.keys(pages).forEach((k) => pages[k].classList.remove('active'));
    pages[name].classList.add('active');

    const bottomNav = $('#bottom-nav');
    if (name === 'login') {
      bottomNav.style.display = 'none';
    } else {
      bottomNav.style.display = 'flex';
      // 高亮底部导航
      $$('.nav-item').forEach((item) => {
        item.classList.toggle('active', item.dataset.page === name);
      });
    }
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function formatPrice(price) {
    if (price == null) return '0.00';
    return Number(price).toFixed(2);
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getImageHTML(src, cls, placeholderText) {
    if (src) {
      return `<img class="${cls}" src="${src}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` +
             `<div class="${cls}-placeholder" style="display:none;">${placeholderText || '暂无图片'}</div>`;
    }
    return `<div class="${cls}-placeholder">${placeholderText || '暂无图片'}</div>`;
  }

  function getImageOnly(src, cls, placeholderText) {
    if (src) {
      return `<img class="${cls}" src="${src}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` +
             `<div class="${cls}-placeholder" style="display:none;">${placeholderText || '暂无图片'}</div>`;
    }
    return `<div class="${cls}-placeholder">${placeholderText || '暂无图片'}</div>`;
  }

  function getStatusLabel(status) {
    const map = { 1: '待付款', 2: '待接单', 3: '已接单', 4: '派送中', 5: '已完成', 6: '已取消' };
    return map[status] || '未知';
  }

  // ===== 登录 =====
  async function handleLogin() {
    const nickname = $('#login-nickname').value.trim();
    if (!nickname) {
      toast('请输入昵称或编号');
      return;
    }
    try {
      const res = await apiLogin(nickname);
      if (res.code === 1 && res.data) {
        state.user = res.data;
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userName', res.data.openid || nickname);
        $('#header-user').textContent = res.data.openid || nickname;
        showPage('home');
        loadCategories();
      } else {
        toast(res.msg || '登录失败');
      }
    } catch (e) {
      toast('网络错误：' + e.message);
    }
  }

  // ===== 分类 =====
  async function loadCategories() {
    try {
      const res = await apiGetCategories();
      if (res.code === 1 && res.data) {
        state.categories = res.data;
        renderCategories();
        if (state.categories.length > 0) {
          selectCategory(state.categories[0].id);
        }
      }
    } catch (e) {
      toast('加载分类失败');
    }
  }

  function renderCategories() {
    const sidebar = $('#category-sidebar');
    sidebar.innerHTML = state.categories
      .map(
        (cat) =>
          `<div class="category-item" data-cid="${cat.id}">${cat.name}</div>`
      )
      .join('');
  }

  function selectCategory(cid) {
    state.currentCategoryId = cid;
    // 更新左侧高亮
    $$('.category-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.cid) === cid);
    });
    loadDishArea(cid);
  }

  async function loadDishArea(cid) {
    try {
      const [dishRes, setmealRes] = await Promise.all([
        apiGetDishes(cid),
        apiGetSetmeals(cid),
      ]);

      state.dishes = dishRes.code === 1 && dishRes.data ? dishRes.data : [];
      state.setmeals = setmealRes.code === 1 && setmealRes.data ? setmealRes.data : [];

      renderDishArea();
    } catch (e) {
      toast('加载菜品失败');
    }
  }

  function renderDishArea() {
    const area = $('#dish-area');
    if (state.dishes.length === 0 && state.setmeals.length === 0) {
      area.innerHTML = '<div class="dish-empty">该分类暂无菜品</div>';
      return;
    }

    let html = '';

    // 菜品列表
    state.dishes.forEach((dish) => {
      html += `
        <div class="dish-card" data-type="dish" data-id="${dish.id}">
          ${getImageHTML(dish.image, 'dish-card-img', '暂无图片')}
          <div class="dish-card-body">
            <div class="dish-card-name">${dish.name}</div>
            <div class="dish-card-desc">${dish.description || ''}</div>
            <div class="dish-card-price">${formatPrice(dish.price)}</div>
          </div>
        </div>`;
    });

    // 套餐列表
    state.setmeals.forEach((sm) => {
      html += `
        <div class="dish-card" data-type="setmeal" data-id="${sm.id}">
          ${getImageHTML(sm.image, 'dish-card-img', '暂无图片')}
          <div class="dish-card-body">
            <div class="dish-card-name">
              ${sm.name}
              <span class="badge-setmeal">套餐</span>
            </div>
            <div class="dish-card-desc">${sm.description || ''}</div>
            <div class="dish-card-price">${formatPrice(sm.price)}</div>
          </div>
        </div>`;
    });

    area.innerHTML = html;
  }

  // ===== 弹窗 =====
  function openModal(html) {
    $('#modal-content').innerHTML = html;
    $('#modal-overlay').classList.add('active');
  }

  function closeModal() {
    $('#modal-overlay').classList.remove('active');
  }

  async function showDishDetail(dishId) {
    const dish = state.dishes.find((d) => d.id === dishId);
    if (!dish) return;

    const flavors = dish.flavors || [];
    let flavorHTML = '';
    if (flavors.length > 0) {
      flavorHTML = `
        <div class="modal-section-title">选择口味</div>
        <div class="flavor-list">
          ${flavors.map((f, i) => `<div class="flavor-item${i === 0 ? ' selected' : ''}" data-flavor="${f.value}">${f.value || f.name}</div>`).join('')}
        </div>`;
    }

    const html = `
      <div class="modal-img-wrapper">
        ${getImageHTML(dish.image, 'modal-img', '暂无图片')}
        <div class="modal-btn-close" onclick="document.querySelector('#modal-overlay').classList.remove('active')">×</div>
      </div>
      <div class="modal-body">
        <div class="modal-name">${dish.name}</div>
        <div class="modal-desc">${dish.description || ''}</div>
        <div class="modal-price">${formatPrice(dish.price)}</div>
        ${flavorHTML}
        <button class="btn-primary" onclick="window._addDishToCart(${dish.id})">加入购物车</button>
      </div>`;
    openModal(html);

    // 口味选择事件
    if (flavors.length > 0) {
      $$('.flavor-item').forEach((el) => {
        el.addEventListener('click', () => {
          $$('.flavor-item').forEach((e) => e.classList.remove('selected'));
          el.classList.add('selected');
        });
      });
    }
  }

  async function showSetmealDetail(setmealId) {
    const sm = state.setmeals.find((s) => s.id === setmealId);
    if (!sm) return;

    // 加载套餐内菜品
    let innerDishesHTML = '<div class="modal-section-title">套餐内容</div><div class="setmeal-dish-list">';
    try {
      const res = await apiGetSetmealDishes(setmealId);
      if (res.code === 1 && res.data && res.data.length > 0) {
        res.data.forEach((sd) => {
          innerDishesHTML += `
            <div class="setmeal-dish-item">
              ${getImageOnly(sd.image, 'setmeal-dish-img', '')}
              <div class="setmeal-dish-info">
                <div class="setmeal-dish-name">${sd.name}</div>
                <div class="setmeal-dish-desc">${sd.description || ''}</div>
              </div>
              <div class="setmeal-dish-count">×${sd.copies || 1}</div>
            </div>`;
        });
      } else {
        innerDishesHTML += '<div style="font-size:13px;color:#999;">暂无套餐菜品信息</div>';
      }
    } catch (e) {
      innerDishesHTML += '<div style="font-size:13px;color:#999;">加载失败</div>';
    }
    innerDishesHTML += '</div>';

    const html = `
      <div class="modal-img-wrapper">
        ${getImageHTML(sm.image, 'modal-img', '暂无图片')}
        <div class="modal-btn-close" onclick="document.querySelector('#modal-overlay').classList.remove('active')">×</div>
      </div>
      <div class="modal-body">
        <div class="modal-name">${sm.name}</div>
        <div class="modal-desc">${sm.description || ''}</div>
        <div class="modal-price">${formatPrice(sm.price)}</div>
        ${innerDishesHTML}
        <button class="btn-primary" onclick="window._addSetmealToCart(${sm.id})">加入购物车</button>
      </div>`;
    openModal(html);
  }

  // 暴露到全局，供弹窗按钮调用
  window._addDishToCart = async function (dishId) {
    const selected = document.querySelector('.flavor-item.selected');
    const flavor = selected ? selected.dataset.flavor : '';
    try {
      const res = await apiAddToCart({ dishId, setmealId: null, dishFlavor: flavor });
      if (res.code === 1) {
        toast('已加入购物车');
        closeModal();
        updateCartBadge();
      } else {
        toast(res.msg || '操作失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  };

  window._addSetmealToCart = async function (setmealId) {
    try {
      const res = await apiAddToCart({ dishId: null, setmealId });
      if (res.code === 1) {
        toast('已加入购物车');
        closeModal();
        updateCartBadge();
      } else {
        toast(res.msg || '操作失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  };

  // ===== 购物车 =====
  async function updateCartBadge() {
    try {
      const res = await apiGetCart();
      if (res.code === 1 && res.data) {
        state.cart = res.data;
        const total = state.cart.reduce((sum, item) => sum + (item.number || 0), 0);
        const badge = $('#cart-badge');
        if (total > 0) {
          badge.style.display = 'flex';
          badge.textContent = total > 99 ? '99+' : total;
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (e) {
      // 静默失败
    }
  }

  async function loadCartPage() {
    try {
      const res = await apiGetCart();
      if (res.code === 1 && res.data) {
        state.cart = res.data;
        renderCart();
      }
    } catch (e) {
      toast('加载购物车失败');
    }
  }

  function renderCart() {
    const list = $('#cart-list');
    const footer = $('#cart-footer');

    if (state.cart.length === 0) {
      list.innerHTML = '<div class="empty-state">购物车空空如也</div>';
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'flex';
    let totalAmount = 0;

    list.innerHTML = state.cart
      .map((item) => {
        const subtotal = (item.number || 0) * (item.amount || 0);
        totalAmount += subtotal;
        const imgHTML = item.image
          ? `<img class="cart-item-img" src="${item.image}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` +
            `<div class="cart-item-img-placeholder" style="display:none;">暂无图片</div>`
          : `<div class="cart-item-img-placeholder">暂无图片</div>`;

        const isDish = item.dishId != null;
        const body = isDish
          ? { dishId: item.dishId, setmealId: null, dishFlavor: item.dishFlavor || '' }
          : { dishId: null, setmealId: item.setmealId };

        return `
          <div class="cart-item">
            <div class="cart-item-row">
              ${imgHTML}
              <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                ${item.dishFlavor ? `<div class="cart-item-flavor">口味：${item.dishFlavor}</div>` : ''}
              </div>
              <div class="cart-item-amount">${formatPrice(subtotal)}</div>
              <div class="cart-item-actions">
                <button class="btn-stepper" data-action="sub" data-body='${JSON.stringify(body)}'>−</button>
                <span class="stepper-count">${item.number}</span>
                <button class="btn-stepper plus" data-action="add" data-body='${JSON.stringify(body)}'>+</button>
              </div>
            </div>
          </div>`;
      })
      .join('');

    $('#cart-total-price').textContent = formatPrice(totalAmount);

    // 绑定事件
    $$('.btn-stepper').forEach((btn) => {
      btn.addEventListener('click', async function () {
        const action = this.dataset.action;
        const body = JSON.parse(this.dataset.body);
        try {
          let res;
          if (action === 'add') {
            res = await apiAddToCart(body);
          } else {
            res = await apiSubFromCart(body);
          }
          if (res.code === 1) {
            loadCartPage();
            updateCartBadge();
          } else {
            toast(res.msg || '操作失败');
          }
        } catch (e) {
          toast('网络错误');
        }
      });
    });
  }

  async function handleClearCart() {
    if (state.cart.length === 0) {
      toast('购物车已为空');
      return;
    }
    try {
      const res = await apiClearCart();
      if (res.code === 1) {
        state.cart = [];
        renderCart();
        updateCartBadge();
        toast('购物车已清空');
      } else {
        toast(res.msg || '操作失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  }

  // ===== 退出登录 =====
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    state.user = null;
    state.categories = [];
    state.dishes = [];
    state.setmeals = [];
    state.cart = [];
    state.currentOrders = [];
    showPage('login');
    document.getElementById('login-nickname').value = '';
  }

  function goCheckout() {
    if (state.cart.length === 0) {
      toast('购物车为空');
      return;
    }
    const totalAmount = state.cart.reduce(
      (sum, item) => sum + (item.number || 0) * (item.amount || 0),
      0
    );
    $('#checkout-amount').textContent = formatPrice(totalAmount);
    $('#checkout-remark').value = '';
    showPage('checkout');
    loadCheckoutAddresses();
  }

  async function handleSubmitOrder() {
    const totalAmount = state.cart.reduce(
      (sum, item) => sum + (item.number || 0) * (item.amount || 0),
      0
    );
    const remark = $('#checkout-remark').value.trim();

    const selectedAddr = state.addresses.find(a => a._selected);
    const addressBookId = selectedAddr ? selectedAddr.id : (state.addresses.length > 0 ? state.addresses[0].id : null);
    if (!addressBookId) {
      toast('请先添加收货地址');
      return;
    }
    const orderData = {
      addressBookId: addressBookId,
      payMethod: 1,
      remark: remark,
      amount: totalAmount,
      estimatedDeliveryTime: null,
      deliveryStatus: 1,
      tablewareNumber: 1,
      tablewareStatus: 1,
      packAmount: 0,
    };

    try {
      const res = await apiSubmitOrder(orderData);
      if (res.code === 1) {
        toast('下单成功！');
        // 清空购物车
        await apiClearCart();
        state.cart = [];
        updateCartBadge();
        showPage('orders');
        loadOrders();
      } else {
        toast(res.msg || '下单失败');
      }
    } catch (e) {
      toast('网络错误：' + e.message);
    }
  }

  // ===== 地址管理 =====
  async function loadCheckoutAddresses() {
    try {
      const res = await apiGetAddresses();
      if (res.code === 1 && res.data) {
        state.addresses = res.data.map(a => ({ ...a, _selected: a.isDefault === 1 }));
        renderCheckoutAddresses();
      } else {
        state.addresses = [];
        renderCheckoutAddresses();
      }
    } catch (e) {
      state.addresses = [];
      renderCheckoutAddresses();
    }
  }

  function renderCheckoutAddresses() {
    const container = $('#checkout-address');
    if (state.addresses.length === 0) {
      container.innerHTML = '<div class="address-loading" style="color:#ff6b35;cursor:pointer;" id="checkout-no-address">暂无地址，点击添加</div>';
      return;
    }
    container.innerHTML = state.addresses.map(a => `
      <div class="address-card checkout-addr ${a._selected ? 'selected' : ''}" data-addr-id="${a.id}">
        <div class="address-card-info">
          <div class="address-card-name">${a.consignee || ''} ${a.phone || ''}</div>
          <div class="address-card-detail">${a.detail || ''}</div>
        </div>
        ${a.isDefault === 1 ? '<span class="address-card-tag">默认</span>' : ''}
      </div>
    `).join('');
    $$('.checkout-addr').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.addrId);
        state.addresses.forEach(a => { a._selected = (a.id === id); });
        renderCheckoutAddresses();
      });
    });
  }

  async function loadAddresses() {
    try {
      const res = await apiGetAddresses();
      if (res.code === 1 && res.data) {
        state.addresses = res.data;
      } else {
        state.addresses = [];
      }
      renderAddresses();
    } catch (e) {
      toast('加载地址失败');
    }
  }

  function renderAddresses() {
    const list = $('#address-list');
    if (state.addresses.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无收货地址</div>';
      return;
    }
    list.innerHTML = state.addresses.map(a => `
      <div class="address-card">
        <div class="address-card-info" data-edit-id="${a.id}">
          <div class="address-card-name">${a.consignee || ''} <span class="address-card-sex">${a.sex === '1' ? '先生' : '女士'}</span></div>
          <div class="address-card-phone">${a.phone || ''}</div>
          <div class="address-card-detail">${a.detail || ''}</div>
        </div>
        <div class="address-card-tags">
          ${a.label ? `<span class="address-card-label">${a.label}</span>` : ''}
          ${a.isDefault === 1 ? '<span class="address-card-tag">默认</span>' : ''}
        </div>
        <div class="address-card-actions">
          ${a.isDefault !== 1 ? `<button class="btn-addr-setdefault" data-addr-id="${a.id}">设为默认</button>` : ''}
          <button class="btn-addr-edit" data-edit-id="${a.id}">编辑</button>
          <button class="btn-addr-delete" data-addr-id="${a.id}">删除</button>
        </div>
      </div>
    `).join('');
  }

  function showAddressForm(address) {
    if (address) {
      $('#address-form-title').textContent = '编辑地址';
      $('#addr-edit-id').value = address.id;
      $('#addr-consignee').value = address.consignee || '';
      $('#addr-phone').value = address.phone || '';
      $$('input[name="addr-sex"]').forEach(r => { r.checked = r.value === address.sex; });
      $('#addr-detail').value = address.detail || '';
      $('#addr-label').value = address.label || '';
    } else {
      $('#address-form-title').textContent = '新增地址';
      $('#addr-edit-id').value = '';
      $('#addr-consignee').value = '';
      $('#addr-phone').value = '';
      $$('input[name="addr-sex"]').forEach(r => { r.checked = r.value === '1'; });
      $('#addr-detail').value = '';
      $('#addr-label').value = '';
    }
    showPage('address-form');
  }

  async function handleSaveAddress() {
    const id = $('#addr-edit-id').value;
    const consignee = $('#addr-consignee').value.trim();
    const phone = $('#addr-phone').value.trim();
    const sex = document.querySelector('input[name="addr-sex"]:checked').value;
    const detail = $('#addr-detail').value.trim();
    const label = $('#addr-label').value.trim();

    if (!consignee) { toast('请输入收货人'); return; }
    if (!phone) { toast('请输入手机号'); return; }
    if (!detail) { toast('请输入详细地址'); return; }

    const body = { consignee, phone, sex, detail };
    if (label) body.label = label;

    try {
      let res;
      if (id) {
        body.id = Number(id);
        res = await apiUpdateAddress(body);
      } else {
        res = await apiAddAddress(body);
      }
      if (res.code === 1) {
        toast(id ? '地址已更新' : '地址已添加');
        showPage('address');
        loadAddresses();
      } else {
        toast(res.msg || '操作失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  }

  async function handleDeleteAddress(id) {
    try {
      const res = await apiDeleteAddress(id);
      if (res.code === 1) {
        toast('地址已删除');
        loadAddresses();
      } else {
        toast(res.msg || '删除失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  }

  async function handleSetDefault(id) {
    try {
      const res = await apiSetDefaultAddress({ id });
      if (res.code === 1) {
        toast('已设为默认地址');
        loadAddresses();
      } else {
        toast(res.msg || '操作失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  }

  // ===== 订单 =====
  async function loadOrders(status = '') {
    state.currentOrderStatus = status;
    try {
      const res = await apiGetOrders(1, 20, status);
      if (res.code === 1 && res.data) {
        state.currentOrders = res.data.records || res.data || [];
      } else {
        state.currentOrders = [];
      }
      renderOrders();
    } catch (e) {
      toast('加载订单失败');
    }
  }

  function renderOrders() {
    const list = $('#orders-list');
    if (state.currentOrders.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无订单</div>';
      return;
    }

    list.innerHTML = state.currentOrders
      .map((order) => {
        const status = order.status;
        const orderNo = order.number || order.id || '';
        const orderTime = order.orderTime || order.createTime || '';
        return `
          <div class="order-item">
            <div class="order-header">
              <div class="order-no">订单号：${orderNo}</div>
              <div class="order-status status-${status}">${getStatusLabel(status)}</div>
            </div>
            <div class="order-info">
              <div class="order-amount">${formatPrice(order.amount)}</div>
              <div class="order-time">${orderTime}</div>
            </div>
          </div>`;
      })
      .join('');
  }

  // ===== 事件委托 =====
  document.addEventListener('click', async (e) => {
    // 登录按钮
    if (e.target.id === 'btn-login') {
      handleLogin();
      return;
    }

    // 分类点击
    if (e.target.classList.contains('category-item')) {
      selectCategory(Number(e.target.dataset.cid));
      return;
    }

    // 菜品/套餐卡片
    const card = e.target.closest('.dish-card');
    if (card) {
      const type = card.dataset.type;
      const id = Number(card.dataset.id);
      if (type === 'dish') {
        showDishDetail(id);
      } else if (type === 'setmeal') {
        showSetmealDetail(id);
      }
      return;
    }

    // 弹窗遮罩关闭
    if (e.target.id === 'modal-overlay') {
      closeModal();
      return;
    }

    // 返回按钮
    if (e.target.classList.contains('back-btn')) {
      showPage(e.target.dataset.page);
      if (e.target.dataset.page === 'cart') {
        loadCartPage();
      } else if (e.target.dataset.page === 'orders') {
        loadOrders();
      } else if (e.target.dataset.page === 'home') {
        updateCartBadge();
      }
      return;
    }

    // 清空购物车
    if (e.target.id === 'btn-clear-cart') {
      handleClearCart();
      return;
    }

    // 去结算
    if (e.target.id === 'btn-checkout') {
      goCheckout();
      return;
    }

    // 确认下单
    if (e.target.id === 'btn-submit-order') {
      handleSubmitOrder();
      return;
    }

    // 订单筛选
    if (e.target.classList.contains('filter-btn')) {
      $$('.filter-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      loadOrders(e.target.dataset.status);
      return;
    }

    // 底部导航
    if (e.target.closest('.nav-item')) {
      const nav = e.target.closest('.nav-item');
      const page = nav.dataset.page;
      if (page === 'logout') {
        handleLogout();
        return;
      }
      showPage(page);
      if (page === 'home') {
        updateCartBadge();
      } else if (page === 'cart') {
        loadCartPage();
      } else if (page === 'orders') {
        loadOrders();
      } else if (page === 'address') {
        loadAddresses();
      }
      return;
    }

    // 新增地址按钮
    if (e.target.id === 'btn-add-address') {
      showAddressForm(null);
      return;
    }

    // 编辑地址（点击地址卡片信息区域）
    if (e.target.closest('.address-card-info')) {
      const editId = Number(e.target.closest('.address-card-info').dataset.editId);
      const addr = state.addresses.find(a => a.id === editId);
      if (addr) showAddressForm(addr);
      return;
    }

    // 编辑按钮
    if (e.target.classList.contains('btn-addr-edit')) {
      const editId = Number(e.target.dataset.editId);
      const addr = state.addresses.find(a => a.id === editId);
      if (addr) showAddressForm(addr);
      return;
    }

    // 删除按钮
    if (e.target.classList.contains('btn-addr-delete')) {
      const addrId = Number(e.target.dataset.addrId);
      handleDeleteAddress(addrId);
      return;
    }

    // 设为默认
    if (e.target.classList.contains('btn-addr-setdefault')) {
      const addrId = Number(e.target.dataset.addrId);
      handleSetDefault(addrId);
      return;
    }

    // 保存地址
    if (e.target.id === 'btn-save-address') {
      handleSaveAddress();
      return;
    }

    // 结算页：点击添加地址
    if (e.target.id === 'checkout-no-address') {
      showAddressForm(null);
      return;
    }
  });

  // 键盘回车登录
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && pages.login.classList.contains('active')) {
      handleLogin();
    }
  });

  // ===== 初始化 =====
  function init() {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
      const userName = localStorage.getItem('userName') || '用户';
      state.user = { token };
      $('#header-user').textContent = userName;
      showPage('home');
      loadCategories();
      updateCartBadge();
    } else {
      showPage('login');
    }
  }

  init();
})();
