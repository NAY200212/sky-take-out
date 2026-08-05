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
    kbzpay: $('#page-kbzpay'),
    orders: $('#page-orders'),
    'order-detail': $('#page-order-detail'),
    address: $('#page-address'),
    'address-form': $('#page-address-form'),
  };

  // ===== 工具函数 =====
  function showPage(name) {
    Object.keys(pages).forEach((k) => pages[k].classList.remove('active'));
    pages[name].classList.add('active');

    const bottomNav = $('#bottom-nav');
    if (name === 'login' || name === 'kbzpay' || name === 'order-detail' || name === 'address-form') {
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

    // 解析口味数据：后端返回 [{name: "辣度", value: '["不辣","微辣"]'}, ...]
    const rawFlavors = dish.flavors || [];
    let flavorGroups = [];
    if (rawFlavors.length > 0) {
      flavorGroups = rawFlavors.map((group) => {
        let options = [];
        try {
          options = JSON.parse(group.value);
        } catch (e) {
          options = [group.value];
        }
        return { name: group.name, options: options };
      });
    } else {
      // 无口味数据时，提供默认辣度选项（4-5种）
      flavorGroups = [{ name: '辣度', options: ['不辣', '微辣', '中辣', '重辣'] }];
    }

    let flavorHTML = '';
    if (flavorGroups.length > 0) {
      flavorHTML = flavorGroups.map((group) => `
        <div class="modal-section-title">选择${group.name}</div>
        <div class="flavor-list" data-flavor-name="${group.name}">
          ${group.options.map((opt, i) => `<div class="flavor-item${i === 0 ? ' selected' : ''}" data-flavor="${opt}">${opt}</div>`).join('')}
        </div>
      `).join('');
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

    // 口味选择事件：每个 flavor-list 组内互斥
    $$('.flavor-list').forEach((list) => {
      const items = list.querySelectorAll('.flavor-item');
      items.forEach((el) => {
        el.addEventListener('click', () => {
          items.forEach((e) => e.classList.remove('selected'));
          el.classList.add('selected');
        });
      });
    });
  }

  async function showSetmealDetail(setmealId) {
    const sm = state.setmeals.find((s) => s.id === setmealId);
    if (!sm) return;

    // 加载套餐内菜品
    let dishListHTML = '';
    let flavorOptionsHTML = '';
    try {
      const res = await apiGetSetmealDishes(setmealId);
      if (res.code === 1 && res.data && res.data.length > 0) {
        // 菜品列表
        dishListHTML = '<div class="modal-section-title">套餐内容</div><div class="setmeal-dish-list">';
        res.data.forEach((sd) => {
          dishListHTML += `
            <div class="setmeal-dish-item">
              ${getImageOnly(sd.image, 'setmeal-dish-img', '')}
              <div class="setmeal-dish-info">
                <div class="setmeal-dish-name">${sd.name}</div>
                <div class="setmeal-dish-desc">${sd.description || ''}</div>
              </div>
              <div class="setmeal-dish-count">×${sd.copies || 1}</div>
            </div>`;
        });
        dishListHTML += '</div>';

        // 口味选项（独立区域）
        let hasFlavors = false;
        res.data.forEach((sd) => {
          const dish = state.dishes.find((d) => d.id === sd.dishId);
          const flavors = dish && dish.flavors ? dish.flavors : [];
          if (flavors.length > 0) {
            hasFlavors = true;
            flavorOptionsHTML += `
              <div class="setmeal-option-group" data-dish-id="${sd.dishId}" data-dish-name="${sd.name}">
                <div class="setmeal-option-label">${sd.name}</div>
                <div class="flavor-list">
                  ${flavors.map((f, i) => `<div class="flavor-item${i === 0 ? ' selected' : ''}" data-flavor="${f.value || f.name}">${f.value || f.name}</div>`).join('')}
                </div>
              </div>`;
          }
        });
        if (hasFlavors) {
          flavorOptionsHTML = `<div class="modal-section-title">套餐选项</div><div class="setmeal-options-area">${flavorOptionsHTML}</div>`;
        }
      } else {
        dishListHTML = '<div style="font-size:13px;color:#999;padding:12px 0;">暂无套餐菜品信息</div>';
      }
    } catch (e) {
      dishListHTML = '<div style="font-size:13px;color:#999;padding:12px 0;">加载失败</div>';
    }

    const html = `
      <div class="modal-img-wrapper">
        ${getImageHTML(sm.image, 'modal-img', '暂无图片')}
        <div class="modal-btn-close" onclick="document.querySelector('#modal-overlay').classList.remove('active')">×</div>
      </div>
      <div class="modal-body">
        <div class="modal-name">${sm.name}</div>
        <div class="modal-desc">${sm.description || ''}</div>
        <div class="modal-price">${formatPrice(sm.price)}</div>
        ${dishListHTML}
        ${flavorOptionsHTML}
        <button class="btn-primary" onclick="window._addSetmealToCart(${sm.id})">加入购物车</button>
      </div>`;
    openModal(html);

    // 套餐选项口味选择事件
    $$('.setmeal-option-group .flavor-item').forEach((el) => {
      el.addEventListener('click', () => {
        const parent = el.parentElement;
        parent.querySelectorAll('.flavor-item').forEach((e) => e.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }

  // 催单
  window._handleReminder = async function (orderId) {
    try {
      const res = await apiReminder(orderId);
      if (res.code === 1) {
        toast('已催单，店家正在加急处理中');
      } else {
        toast(res.msg || '催单失败');
      }
    } catch (e) {
      toast('网络错误');
    }
  };

  // 暴露到全局，供弹窗按钮调用
  window._addDishToCart = async function (dishId) {
    // 收集每个口味分组的选中项，格式：辣度:微辣; 忌口:不要葱
    const flavorParts = [];
    $$('.flavor-list').forEach((list) => {
      const selected = list.querySelector('.flavor-item.selected');
      if (selected) {
        const groupName = list.dataset.flavorName;
        flavorParts.push(`${groupName}:${selected.dataset.flavor}`);
      }
    });
    const flavor = flavorParts.join('; ');
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
    // 收集套餐内各菜品的口味选择
    const flavorParts = [];
    $$('.setmeal-option-group').forEach((group) => {
      const selected = group.querySelector('.flavor-item.selected');
      if (selected) {
        const dishName = group.dataset.dishName;
        flavorParts.push(`${dishName}:${selected.dataset.flavor}`);
      }
    });
    const dishFlavor = flavorParts.join('; ');
    try {
      const body = { dishId: null, setmealId };
      if (dishFlavor) body.dishFlavor = dishFlavor;
      const res = await apiAddToCart(body);
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
                ${item.dishFlavor ? `<div class="cart-item-flavor">${item.dishFlavor.split('; ').map(f => '<span>' + f + '</span>').join('')}</div>` : ''}
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
        // 保存订单信息，跳转 KBZPay 支付
        state.pendingOrder = res.data || {};
        state.pendingAmount = totalAmount;
        startKBZPayPayment(totalAmount);
      } else {
        toast(res.msg || '下单失败');
      }
    } catch (e) {
      toast('网络错误：' + e.message);
    }
  }

  // ===== KBZPay 支付 =====
  let kbzpayTimer = null;

  function startKBZPayPayment(amount) {
    showPage('kbzpay');
    $('#kbzpay-amount').textContent = formatPrice(amount);
    $('#kbzpay-qr-section').style.display = 'block';
    $('#kbzpay-sim-section').style.display = 'none';
    $('#kbzpay-success-section').style.display = 'none';
    $('#btn-kbzpay-confirm').style.display = 'none';
    $('#btn-kbzpay-cancel').style.display = 'block';
    $('#btn-kbzpay-done').style.display = 'none';

    // 倒计时 5 分钟
    let seconds = 300;
    const timerEl = $('#kbzpay-timer');
    const updateTimer = () => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timerEl.textContent = `剩余 ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    updateTimer();

    kbzpayTimer = setInterval(() => {
      seconds--;
      updateTimer();
      if (seconds <= 300) {
        // 1 分钟后显示模拟确认按钮
        $('#btn-kbzpay-confirm').style.display = 'block';
      }
      if (seconds <= 0) {
        clearInterval(kbzpayTimer);
        kbzpayTimer = null;
        timerEl.textContent = '二维码已过期';
        toast('支付超时，请重新下单');
      }
    }, 1000);
  }

  function handleKBZPayConfirm() {
    if (kbzpayTimer) {
      clearInterval(kbzpayTimer);
      kbzpayTimer = null;
    }

    // 显示处理中
    $('#kbzpay-qr-section').style.display = 'none';
    $('#kbzpay-sim-section').style.display = 'block';
    $('#btn-kbzpay-confirm').style.display = 'none';
    $('#btn-kbzpay-cancel').style.display = 'none';

    // 模拟支付处理 2 秒
    setTimeout(async () => {
      // 调用后端支付接口（修复：传订单号 orderNumber 而非主键 id）
      const orderNumber = state.pendingOrder.orderNumber || state.pendingOrder.id || '';
      if (orderNumber) {
        try {
          await apiSimulatePay(orderNumber);
        } catch (e) {
          // 即使后端接口出错也模拟成功（演示模式）
          console.warn('支付接口调用失败，模拟支付成功:', e);
        }
      }

      // 显示支付成功
      $('#kbzpay-sim-section').style.display = 'none';
      $('#kbzpay-success-section').style.display = 'block';
      $('#kbzpay-success-amount').textContent = formatPrice(state.pendingAmount);
      $('#btn-kbzpay-done').style.display = 'block';

      // 清空购物车
      try {
        await apiClearCart();
        state.cart = [];
        updateCartBadge();
      } catch (e) {
        // 静默失败
      }
    }, 2000);
  }

  function handleKBZPayCancel() {
    if (kbzpayTimer) {
      clearInterval(kbzpayTimer);
      kbzpayTimer = null;
    }
    toast('已取消支付');
    showPage('checkout');
  }

  function handleKBZPayDone() {
    const orderId = state.pendingOrder.orderNumber || state.pendingOrder.id || '';
    loadOrderDetail(orderId);
    showPage('order-detail');
    state.pendingOrder = null;
    state.pendingAmount = 0;
  }

  // ===== 配送状态映射 =====
  function getDeliveryStatusLabel(status) {
    const map = { 1: '待付款', 2: '待接单', 3: '已接单', 4: '派送中', 5: '已完成', 6: '已取消' };
    return map[status] || '未知';
  }

  function getDeliverySteps(order) {
    const status = order.status || 1;
    const steps = [
      { key: 1, title: '已下单', time: order.orderTime || '', desc: '订单已提交' },
      { key: 2, title: '已付款', time: order.payTime || '', desc: 'KBZPay 支付成功' },
      { key: 3, title: '商家接单', time: order.acceptTime || '', desc: '商家已确认订单' },
      { key: 4, title: '骑手取餐', time: order.pickupTime || '', desc: '骑手已到店取餐' },
      { key: 5, title: '配送中', time: order.deliveryTime || '', desc: '骑手正在配送途中' },
      { key: 6, title: '已送达', time: order.deliverTime || '', desc: '订单已送达，请享用' },
    ];

    // 根据实际订单状态标记步骤
    // 状态 1:待付款 → 只有第1步 done
    // 状态 2:待接单 → 第1-2步 done
    // 状态 3:已接单 → 第1-3步 done
    // 状态 4:派送中 → 第1-5步 done
    // 状态 5:已完成 → 全部 done
    // 状态 6:已取消 → 只显示第1步，标记为取消
    const statusToStepMap = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 0 };
    const activeStep = statusToStepMap[status] || 1;

    return steps.map((step, i) => {
      if (status === 6) {
        if (i === 0) return { ...step, state: 'done' };
        return null;
      }
      if (i < activeStep) return { ...step, state: 'done' };
      if (i === activeStep) return { ...step, state: 'active' };
      return { ...step, state: 'pending' };
    }).filter(Boolean);
  }

  function getStatusLabel(status) {
    const map = { 1: '待付款', 2: '待接单', 3: '已接单', 4: '派送中', 5: '已完成', 6: '已取消' };
    return map[status] || '未知';
  }

  // ===== 订单详情 =====
  async function loadOrderDetail(orderId) {
    try {
      const res = await apiGetOrders(1, 20, '');
      let order = null;
      if (res.code === 1 && res.data) {
        const orders = res.data.records || res.data || [];
        order = orders.find(o => (o.id === orderId || o.number === String(orderId)));
      }
      if (order) {
        state.currentOrderDetail = order;
      } else {
        order = state.currentOrderDetail || state.pendingOrder;
      }
      if (!order) {
        $('#order-detail-content').innerHTML = '<div class="empty-state">订单不存在</div>';
        return;
      }
      renderOrderDetail(order);
      startDeliverySimulation(order);
    } catch (e) {
      $('#order-detail-content').innerHTML = '<div class="empty-state">加载失败</div>';
    }
  }

  function renderOrderDetail(order) {
    const status = order.status || 1;
    const steps = getDeliverySteps(order);
    const orderNo = order.number || order.id || '';

    let stepHTML = steps.map(s => `
      <div class="delivery-step ${s.state}">
        <div class="delivery-step-dot"></div>
        <div class="delivery-step-content">
          <div class="delivery-step-title">${s.title}</div>
          ${s.time ? `<div class="delivery-step-time">${s.time}</div>` : ''}
          ${s.desc ? `<div class="delivery-step-desc">${s.desc}</div>` : ''}
        </div>
      </div>
    `).join('');

    let actionHTML = '';
    if (status === 1) {
      actionHTML = `<button class="order-detail-pay-btn" onclick="window._goPayFromDetail()">去支付 (KBZPay)</button>`;
    } else if (status >= 2 && status < 5) {
      actionHTML = `<button class="btn-sim-delivery" onclick="window._simDeliveryStep()">模拟配送推进</button>`;
    }
    if (status === 2 || status === 3) {
      actionHTML += `<button class="btn-reminder" data-order-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#FF9800;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;display:block;" onclick="event.stopPropagation(); window._handleReminder(${order.id})">催单</button>`;
    }

    const html = `
      <div class="order-detail-card">
        <div class="order-detail-row">
          <span class="order-detail-label">订单编号</span>
          <span class="order-detail-value">${orderNo}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">订单状态</span>
          <span class="order-status status-${status}">${getDeliveryStatusLabel(status)}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">订单金额</span>
          <span class="order-detail-value order-detail-amount">${formatPrice(order.amount)}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">下单时间</span>
          <span class="order-detail-value">${order.orderTime || order.createTime || ''}</span>
        </div>
      </div>

      <div class="order-detail-card delivery-section">
        <div class="delivery-section-title">配送进度</div>
        <div class="delivery-progress">
          ${stepHTML}
        </div>
        ${actionHTML}
      </div>
    `;

    $('#order-detail-content').innerHTML = html;
  }

  // 配送模拟
  let deliverySimTimer = null;

  function startDeliverySimulation(order) {
    if (deliverySimTimer) {
      clearInterval(deliverySimTimer);
      deliverySimTimer = null;
    }
    // 不自动模拟，改为用户手动点击推进
  }

  window._goPayFromDetail = function () {
    const order = state.currentOrderDetail;
    if (order && (order.status === 1)) {
      state.pendingOrder = order;
      state.pendingAmount = order.amount;
      startKBZPayPayment(order.amount);
    }
  };

  window._simDeliveryStep = async function () {
    const order = state.currentOrderDetail;
    if (!order) return;
    const currentStatus = order.status || 1;
    let newStatus = currentStatus;

    if (currentStatus === 2) newStatus = 3;       // 待接单 → 已接单
    else if (currentStatus === 3) newStatus = 4;   // 已接单 → 派送中
    else if (currentStatus === 4) newStatus = 5;   // 派送中 → 已完成
    else {
      toast('当前状态无法模拟推进');
      return;
    }

    // 通过支付/催单接口模拟状态变更（使用催单接口不会真的催单，只做模拟）
    try {
      const orderId = order.id || order.number || '';
      // 尝试调用支付接口模拟状态变更
      await apiSimulatePay(orderId);
    } catch (e) {
      // 忽略
    }

    // 本地更新状态
    order.status = newStatus;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (newStatus === 3) order.acceptTime = timeStr;
    if (newStatus === 4) order.deliveryTime = timeStr;
    if (newStatus === 5) order.deliverTime = timeStr;

    renderOrderDetail(order);

    const labels = { 3: '商家已接单', 4: '骑手已取餐，正在派送中', 5: '订单已送达' };
    toast(labels[newStatus] || '状态已更新');
  };

  // ===== 订单列表 =====
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
    `).join('') + `
      <div class="checkout-add-addr" id="btn-checkout-add-addr">+ 新增地址</div>
    `;
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

  function showAddressForm(address, fromCheckout) {
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
    state.addrFromCheckout = !!fromCheckout;
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
        if (!id && state.addrFromCheckout) {
          state.addrFromCheckout = false;
          showPage('checkout');
          loadCheckoutAddresses();
        } else {
          showPage('address');
          loadAddresses();
        }
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
          <div class="order-item" data-order-id="${order.id}" data-order-no="${orderNo}" style="cursor:pointer;">
            <div class="order-header">
              <div class="order-no">订单号：${orderNo}</div>
              <div class="order-status status-${status}">${getDeliveryStatusLabel(status)}</div>
            </div>
            <div class="order-info">
              <div class="order-amount">${formatPrice(order.amount)}</div>
              <div class="order-time">${orderTime}</div>
            </div>
            ${status === 2 || status === 3 ? `<button class="btn-reminder" data-order-id="${order.id}" style="margin-top:8px;padding:6px 14px;background:#FF9800;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;" onclick="event.stopPropagation(); window._handleReminder(${order.id})">催单</button>` : ''}
          </div>`;
      })
      .join('');

    // 绑定订单点击事件
    $$('.order-item').forEach((el) => {
      el.addEventListener('click', () => {
        const orderId = el.dataset.orderId;
        state.currentOrderDetail = state.currentOrders.find(
          o => String(o.id) === orderId || String(o.number) === el.dataset.orderNo
        );
        loadOrderDetail(orderId);
        showPage('order-detail');
      });
    });
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

    // KBZPay 确认支付
    if (e.target.id === 'btn-kbzpay-confirm') {
      handleKBZPayConfirm();
      return;
    }

    // KBZPay 取消支付
    if (e.target.id === 'btn-kbzpay-cancel') {
      handleKBZPayCancel();
      return;
    }

    // KBZPay 支付完成查看订单
    if (e.target.id === 'btn-kbzpay-done') {
      handleKBZPayDone();
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
    if (e.target.id === 'checkout-no-address' || e.target.id === 'btn-checkout-add-addr') {
      showAddressForm(null, true);
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
