(function () {
  const API_BASE = window.location.origin;
  const STATIC_DEMO_HOSTS = ["netlify.app", "netlify.live"];
  const MOCK_STATE_KEY = "studyflow_mock_state";
  const TOKEN_KEY = "studyflow_token";
  const USERNAME_KEY = "studyflow_username";
  const ROLE_KEY = "studyflow_role";

  async function request(path, options = {}) {
    if (isStaticDemoMode()) {
      return mockRequest(path, options);
    }

    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json().catch(() => null);
    if (response.status === 401 || payload?.code === 401) {
      clearAuth();
      if (!location.pathname.endsWith("login.html") && !location.pathname.endsWith("register.html")) {
        location.href = "login.html";
      }
      throw new Error(payload?.message || "登录已过期");
    }

    if (!response.ok || (payload && payload.code && payload.code >= 400)) {
      const message = payload?.message || "请求失败";
      showToast(message);
      throw new Error(message);
    }

    return payload ? payload.data : null;
  }


  async function mockRequest(path, options = {}) {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    const method = (options.method || "GET").toUpperCase();
    const url = new URL(path, window.location.origin);
    const body = options.body || {};
    const state = loadMockState();

    if (url.pathname === "/api/auth/login" && method === "POST") {
      const username = String(body.username || "demo").trim() || "demo";
      state.user.username = username;
      saveMockState(state);
      return { token: `mock-token-${Date.now()}`, username, role: state.user.role };
    }

    if (url.pathname === "/api/auth/register" && method === "POST") {
      const username = String(body.username || "").trim();
      if (!username) return mockFailure("用户名不能为空");
      state.user.username = username;
      saveMockState(state);
      return { token: `mock-token-${Date.now()}`, username, role: state.user.role };
    }

    if (url.pathname === "/api/user/me" && method === "GET") return state.user;
    if (url.pathname === "/api/plans" && method === "GET") return queryMockPlans(state, url.searchParams);
    if (url.pathname === "/api/plans" && method === "POST") {
      const plan = createMockPlan(state, body);
      saveMockState(state);
      return toPlanDetail(plan);
    }

    const planItemMatch = url.pathname.match(/^\/api\/plans\/(\d+)\/items$/);
    if (planItemMatch && method === "POST") {
      const plan = findMockPlan(state, planItemMatch[1]);
      if (!plan) return mockFailure("计划不存在");
      const content = String(body.content || "").trim();
      if (!content) return mockFailure("任务内容不能为空");
      plan.items.push({ id: nextMockId(state), content, done: false });
      touchMockPlan(plan, "ITEM_ADDED", `新增任务：${content}`);
      saveMockState(state);
      return toPlanDetail(plan);
    }

    const planStatusMatch = url.pathname.match(/^\/api\/plans\/(\d+)\/status$/);
    if (planStatusMatch && method === "PATCH") {
      const plan = findMockPlan(state, planStatusMatch[1]);
      if (!plan) return mockFailure("计划不存在");
      plan.status = body.status || plan.status;
      if (plan.status === "DONE") plan.items.forEach((item) => { item.done = true; });
      recalculateMockPlan(plan);
      touchMockPlan(plan, "STATUS_CHANGED", `状态更新为：${statusLabel(plan.status)}`);
      saveMockState(state);
      return toPlanDetail(plan);
    }

    const planMatch = url.pathname.match(/^\/api\/plans\/(\d+)$/);
    if (planMatch && method === "GET") {
      const plan = findMockPlan(state, planMatch[1]);
      if (!plan) return mockFailure("计划不存在");
      return toPlanDetail(plan);
    }
    if (planMatch && method === "PUT") {
      const plan = findMockPlan(state, planMatch[1]);
      if (!plan) return mockFailure("计划不存在");
      updateMockPlan(state, plan, body);
      saveMockState(state);
      return toPlanDetail(plan);
    }
    if (planMatch && method === "DELETE") {
      state.plans = state.plans.filter((plan) => String(plan.id) !== planMatch[1]);
      state.notifications = state.notifications.filter((item) => String(item.plan_id) !== planMatch[1]);
      saveMockState(state);
      return true;
    }

    const itemToggleMatch = url.pathname.match(/^\/api\/items\/(\d+)\/toggle$/);
    if (itemToggleMatch && method === "PATCH") {
      const found = findMockItem(state, itemToggleMatch[1]);
      if (!found) return mockFailure("任务不存在");
      found.item.done = !found.item.done;
      recalculateMockPlan(found.plan);
      touchMockPlan(found.plan, "ITEM_TOGGLED", `${found.item.done ? "完成" : "取消完成"}任务：${found.item.content}`);
      saveMockState(state);
      return { item_id: found.item.id, done: found.item.done, progress: found.plan.progress, status: found.plan.status };
    }

    if (url.pathname === "/api/notifications/unread-count" && method === "GET") {
      return state.notifications.filter((item) => !item.read).length;
    }
    if (url.pathname === "/api/notifications" && method === "GET") return queryMockNotifications(state, url.searchParams);
    if (url.pathname === "/api/notifications/read-all" && method === "PATCH") {
      const unread = state.notifications.filter((item) => !item.read).length;
      state.notifications.forEach((item) => { item.read = true; });
      saveMockState(state);
      return unread;
    }
    if (url.pathname === "/api/notifications/scan" && method === "POST") {
      const created = scanMockNotifications(state);
      saveMockState(state);
      return created;
    }
    const notificationMatch = url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (notificationMatch && method === "PATCH") {
      const notification = state.notifications.find((item) => String(item.id) === notificationMatch[1]);
      if (!notification) return mockFailure("提醒不存在");
      notification.read = true;
      saveMockState(state);
      return true;
    }

    return mockFailure("演示模式暂不支持该操作");
  }

  function isStaticDemoMode() {
    const host = window.location.hostname;
    return STATIC_DEMO_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  }

  function loadMockState() {
    try {
      const raw = localStorage.getItem(MOCK_STATE_KEY);
      if (raw) return normalizeMockState(JSON.parse(raw));
    } catch (error) {
      // Ignore broken demo state and recreate it.
    }
    const state = createInitialMockState();
    saveMockState(state);
    return state;
  }

  function saveMockState(state) {
    localStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state));
  }

  function normalizeMockState(state) {
    return {
      nextId: Number(state.nextId || 100),
      user: {
        username: state.user?.username || "demo",
        role: state.user?.role || "USER",
        avatar_color: state.user?.avatar_color || "#14b8a6"
      },
      plans: Array.isArray(state.plans) ? state.plans : [],
      notifications: Array.isArray(state.notifications) ? state.notifications : []
    };
  }

  function createInitialMockState() {
    const now = new Date();
    const created = now.toISOString();
    const today = formatDateForMock(now);
    const plusTwo = addDaysForMock(2);
    const plusFive = addDaysForMock(5);
    const overdue = addDaysForMock(-1);
    return {
      nextId: 120,
      user: { username: "demo", role: "USER", avatar_color: "#14b8a6" },
      plans: [
        {
          id: 1,
          title: "Spring Security JWT 实战",
          description: "完成认证授权、JWT 过滤器和权限边界梳理。",
          category: "Spring",
          status: "IN_PROGRESS",
          priority: 3,
          due_date: plusFive,
          progress: 50,
          created_at: created,
          updated_at: created,
          items: [
            { id: 101, content: "实现登录注册接口", done: true },
            { id: 102, content: "编写 JWT 过滤器", done: true },
            { id: 103, content: "完成接口权限测试", done: false },
            { id: 104, content: "整理安全配置笔记", done: false }
          ],
          logs: [
            { id: 201, action: "CREATED", detail: "创建计划：Spring Security JWT 实战", created_at: created },
            { id: 202, action: "ITEM_DONE", detail: "完成任务：实现登录注册接口", created_at: created }
          ]
        },
        {
          id: 2,
          title: "算法每日练习",
          description: "保持题感，重点复盘动态规划和双指针。",
          category: "算法",
          status: "IN_PROGRESS",
          priority: 2,
          due_date: plusTwo,
          progress: 67,
          created_at: created,
          updated_at: created,
          items: [
            { id: 105, content: "完成 5 道双指针题", done: true },
            { id: 106, content: "完成 3 道动态规划题", done: true },
            { id: 107, content: "复盘错题并写题解", done: false }
          ],
          logs: [{ id: 203, action: "CREATED", detail: "创建计划：算法每日练习", created_at: created }]
        },
        {
          id: 3,
          title: "Redis 缓存设计",
          description: "完成缓存穿透、击穿、雪崩的对比笔记。",
          category: "数据库",
          status: "TODO",
          priority: 3,
          due_date: overdue,
          progress: 0,
          created_at: created,
          updated_at: created,
          items: [
            { id: 108, content: "总结缓存穿透解决方案", done: false },
            { id: 109, content: "整理热点 Key 保护策略", done: false }
          ],
          logs: [{ id: 204, action: "CREATED", detail: "创建计划：Redis 缓存设计", created_at: created }]
        },
        {
          id: 4,
          title: "Java 基础查漏补缺",
          description: "复习集合、并发基础和 JVM 内存模型。",
          category: "Java 基础",
          status: "DONE",
          priority: 1,
          due_date: today,
          progress: 100,
          created_at: created,
          updated_at: created,
          items: [
            { id: 110, content: "整理 HashMap 扩容流程", done: true },
            { id: 111, content: "复习线程池参数", done: true },
            { id: 112, content: "回顾类加载机制", done: true }
          ],
          logs: [{ id: 205, action: "STATUS_CHANGED_DONE", detail: "计划已完成", created_at: created }]
        }
      ],
      notifications: [
        { id: 301, plan_id: 3, type: "OVERDUE", title: "计划已逾期", message: "计划「Redis 缓存设计」已逾期 1 天，请及时调整或完成。", read: false, trigger_date: overdue, created_at: created },
        { id: 302, plan_id: 2, type: "DUE_SOON", title: "计划即将到期", message: "计划「算法每日练习」2 天后截止，建议优先处理。", read: false, trigger_date: plusTwo, created_at: created }
      ]
    };
  }

  function queryMockPlans(state, params) {
    const status = params.get("status") || "";
    const category = params.get("category") || "";
    const keyword = (params.get("keyword") || "").toLowerCase();
    const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10));
    const size = Math.max(1, Number.parseInt(params.get("size") || "10", 10));
    const filtered = state.plans.filter((plan) => {
      if (status && plan.status !== status) return false;
      if (category && plan.category !== category) return false;
      if (keyword && !`${plan.title} ${plan.description || ""}`.toLowerCase().includes(keyword)) return false;
      return true;
    });
    const start = (page - 1) * size;
    return { list: filtered.slice(start, start + size).map(toPlanListItem), total: filtered.length, page, size };
  }

  function queryMockNotifications(state, params) {
    const read = params.get("read");
    return state.notifications
      .filter((item) => read === null || String(item.read) === read)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  function createMockPlan(state, body) {
    const now = new Date().toISOString();
    const plan = {
      id: nextMockId(state),
      title: String(body.title || "新的学习计划").trim(),
      description: String(body.description || "").trim(),
      category: String(body.category || "").trim(),
      status: "TODO",
      priority: Number(body.priority || 2),
      due_date: body.due_date || null,
      progress: 0,
      created_at: now,
      updated_at: now,
      items: (Array.isArray(body.items) ? body.items : []).filter(Boolean).map((content) => ({ id: nextMockId(state), content, done: false })),
      logs: []
    };
    touchMockPlan(plan, "CREATED", `创建计划：${plan.title}`);
    state.plans.unshift(plan);
    return plan;
  }

  function updateMockPlan(state, plan, body) {
    if (Object.prototype.hasOwnProperty.call(body, "title")) plan.title = String(body.title || plan.title).trim();
    if (Object.prototype.hasOwnProperty.call(body, "description")) plan.description = String(body.description || "").trim();
    if (Object.prototype.hasOwnProperty.call(body, "category")) plan.category = String(body.category || "").trim();
    if (Object.prototype.hasOwnProperty.call(body, "priority")) plan.priority = Number(body.priority || 2);
    if (Object.prototype.hasOwnProperty.call(body, "due_date")) plan.due_date = body.due_date || null;
    if (Array.isArray(body.items)) {
      plan.items = body.items.filter(Boolean).map((content) => ({ id: nextMockId(state), content, done: false }));
    }
    recalculateMockPlan(plan);
    touchMockPlan(plan, "UPDATED", `更新计划：${plan.title}`);
  }

  function findMockPlan(state, id) {
    return state.plans.find((plan) => String(plan.id) === String(id));
  }

  function findMockItem(state, id) {
    for (const plan of state.plans) {
      const item = plan.items.find((entry) => String(entry.id) === String(id));
      if (item) return { plan, item };
    }
    return null;
  }

  function recalculateMockPlan(plan) {
    if (!plan.items.length) {
      plan.progress = plan.status === "DONE" ? 100 : 0;
      return;
    }
    const done = plan.items.filter((item) => item.done).length;
    plan.progress = Math.round((done / plan.items.length) * 100);
    if (plan.progress >= 100) plan.status = "DONE";
    else if (plan.progress > 0 && plan.status === "TODO") plan.status = "IN_PROGRESS";
    else if (plan.progress === 0 && plan.status === "DONE") plan.status = "TODO";
  }

  function touchMockPlan(plan, action, detail) {
    const now = new Date().toISOString();
    plan.updated_at = now;
    plan.logs = plan.logs || [];
    plan.logs.unshift({ id: Date.now(), action, detail, created_at: now });
    plan.logs = plan.logs.slice(0, 8);
  }

  function scanMockNotifications(state) {
    let created = 0;
    const todayKey = formatDateForMock(new Date());
    state.plans.forEach((plan) => {
      if (!plan.due_date || plan.status === "DONE") return;
      const days = Math.ceil((new Date(`${plan.due_date}T00:00:00`).getTime() - new Date(`${todayKey}T00:00:00`).getTime()) / 86400000);
      const type = days < 0 ? "OVERDUE" : days <= 2 ? "DUE_SOON" : "";
      if (!type) return;
      const exists = state.notifications.some((item) => item.plan_id === plan.id && item.type === type && item.trigger_date === plan.due_date);
      if (exists) return;
      state.notifications.unshift({
        id: nextMockId(state),
        plan_id: plan.id,
        type,
        title: type === "OVERDUE" ? "计划已逾期" : "计划即将到期",
        message: type === "OVERDUE" ? `计划「${plan.title}」已逾期，请及时调整或完成。` : `计划「${plan.title}」即将截止，建议优先处理。`,
        read: false,
        trigger_date: plan.due_date,
        created_at: new Date().toISOString()
      });
      created += 1;
    });
    return created;
  }

  function toPlanListItem(plan) {
    return { id: plan.id, title: plan.title, category: plan.category, priority: plan.priority, due_date: plan.due_date, progress: plan.progress, status: plan.status };
  }

  function toPlanDetail(plan) {
    return { ...plan, items: plan.items.map((item) => ({ ...item })), logs: (plan.logs || []).map((log) => ({ ...log })) };
  }

  function nextMockId(state) {
    state.nextId += 1;
    return state.nextId;
  }

  function addDaysForMock(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return formatDateForMock(date);
  }

  function formatDateForMock(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function mockFailure(message) {
    showToast(message);
    throw new Error(message);
  }
  function get(path) {
    return request(path, { method: "GET" });
  }

  function post(path, body) {
    return request(path, { method: "POST", body });
  }

  function put(path, body) {
    return request(path, { method: "PUT", body });
  }

  function patch(path, body) {
    return request(path, { method: "PATCH", body });
  }

  function del(path) {
    return request(path, { method: "DELETE" });
  }

  function saveAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USERNAME_KEY, data.username);
    localStorage.setItem(ROLE_KEY, data.role);
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);
  }

  function logout() {
    clearAuth();
    location.href = "login.html";
  }

  function requireAuth() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      location.href = "login.html";
      return false;
    }
    return true;
  }

  async function initShell(activeNav) {
    initAmbientMotion();
    document.querySelectorAll("[data-nav]").forEach((item) => {
      item.classList.toggle("active", item.dataset.nav === activeNav);
    });
    renderIcons();
    try {
      const user = await get("/api/user/me");
      const nameEl = document.querySelector("[data-user-name]");
      const avatarEl = document.querySelector("[data-user-avatar]");
      if (nameEl) {
        nameEl.textContent = user.username;
      }
      if (avatarEl) {
        avatarEl.textContent = initials(user.username);
        avatarEl.style.background = user.avatar_color || "#5b7cf6";
      }
      localStorage.setItem(USERNAME_KEY, user.username);
      localStorage.setItem(ROLE_KEY, user.role);
      return user;
    } catch (error) {
      return null;
    }
  }

  function initials(username) {
    if (!username) {
      return "SF";
    }
    return username.slice(0, 2).toUpperCase();
  }

  function showToast(message) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
      if (!stack.children.length) {
        stack.remove();
      }
    }, 3000);
  }

  function renderIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function initAmbientMotion() {
    if (document.body.dataset.ambientReady === "true") {
      return;
    }
    document.body.dataset.ambientReady = "true";
    let frame = null;
    window.addEventListener("pointermove", (event) => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        const x = `${Math.round((event.clientX / window.innerWidth) * 100)}%`;
        const y = `${Math.round((event.clientY / window.innerHeight) * 100)}%`;
        document.documentElement.style.setProperty("--mouse-x", x);
        document.documentElement.style.setProperty("--mouse-y", y);
        frame = null;
      });
    }, { passive: true });
  }

  function animateNumber(el, target, duration = 720) {
    const end = Number(target || 0);
    const startTime = performance.now();
    const formatter = new Intl.NumberFormat("zh-CN");
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatter.format(Math.round(end * eased));
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    }
    window.requestAnimationFrame(tick);
  }

  function revealChildren(container, selector = "tr") {
    if (!container) {
      return;
    }
    container.querySelectorAll(selector).forEach((item, index) => {
      item.classList.add("reveal-row");
      item.style.animationDelay = `${Math.min(index * 42, 360)}ms`;
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    return String(value).slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    return String(value).replace("T", " ").slice(0, 16);
  }

  function statusLabel(status) {
    return {
      TODO: "待开始",
      IN_PROGRESS: "进行中",
      DONE: "已完成"
    }[status] || status || "-";
  }

  function statusClass(status) {
    return {
      TODO: "todo",
      IN_PROGRESS: "in-progress",
      DONE: "done"
    }[status] || "todo";
  }

  function priorityLabel(priority) {
    return {
      1: "低",
      2: "中",
      3: "高"
    }[priority] || "-";
  }

  function priorityClass(priority) {
    return {
      1: "low",
      2: "medium-priority",
      3: "high"
    }[priority] || "low";
  }

  function statusChip(status) {
    return `<span class="status-chip"><span class="dot ${statusClass(status)}"></span>${statusLabel(status)}</span>`;
  }

  function priorityChip(priority) {
    return `<span class="priority-chip"><span class="dot ${priorityClass(priority)}"></span>${priorityLabel(priority)}</span>`;
  }

  function progressLine(progress) {
    const value = Number(progress || 0);
    return `<div class="progress-line" style="--progress:${value}%"><span></span></div>`;
  }

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  window.StudyFlowApi = {
    get,
    post,
    put,
    patch,
    delete: del,
    saveAuth,
    clearAuth,
    logout,
    requireAuth,
    initShell,
    showToast,
    renderIcons,
    initAmbientMotion,
    animateNumber,
    revealChildren,
    escapeHtml,
    formatDate,
    formatDateTime,
    statusLabel,
    statusClass,
    priorityLabel,
    priorityClass,
    statusChip,
    priorityChip,
    progressLine,
    debounce
  };
})();

