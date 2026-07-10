const STATE_KEY = "studyflow_demo_state_v2";
const TOKEN_KEY = "studyflow_token";
const STATIC_DEMO_HOSTS = ["netlify.app", "netlify.live"];

export function isStaticDemoMode() {
  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    return true;
  }
  const configuredMode = document.querySelector('meta[name="studyflow-runtime"]')?.content;
  if (configuredMode === "demo") {
    return true;
  }
  if (configuredMode === "api") {
    return false;
  }
  const host = window.location.hostname.toLowerCase();
  return STATIC_DEMO_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function createDemoBackend() {
  return {
    mode: "demo",
    request,
    reset() {
      localStorage.removeItem(STATE_KEY);
      return loadState();
    }
  };
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "https://studyflow.demo");
  const body = options.body || {};
  const state = loadState();

  if (url.pathname === "/api/auth/login" && method === "POST") {
    requireText(body.username, "请输入用户名");
    requireText(body.password, "请输入密码");
    state.user.username = body.username.trim();
    state.user.role = state.user.username === "admin" ? "ADMIN" : "USER";
    saveState(state);
    return authPayload(state.user);
  }

  if (url.pathname === "/api/auth/register" && method === "POST") {
    requireText(body.username, "请输入用户名");
    requireText(body.password, "请输入密码");
    state.user.username = body.username.trim();
    state.user.email = body.email?.trim() || "";
    state.user.role = "USER";
    saveState(state);
    return authPayload(state.user);
  }

  requireDemoAuth();

  if (url.pathname === "/api/user/me" && method === "GET") {
    return clone(state.user);
  }

  if (url.pathname === "/api/dashboard/stats" && method === "GET") {
    return buildStats(state);
  }

  if (url.pathname === "/api/plans" && method === "GET") {
    return listPlans(state, url.searchParams);
  }

  if (url.pathname === "/api/plans" && method === "POST") {
    const plan = createPlan(state, body);
    saveState(state);
    return planSummary(plan);
  }

  const planItemMatch = url.pathname.match(/^\/api\/plans\/(\d+)\/items$/);
  if (planItemMatch && method === "POST") {
    const plan = findPlan(state, Number(planItemMatch[1]));
    const content = requireText(body.content, "请输入任务内容");
    const item = {
      id: nextId(state, "item"),
      plan_id: plan.id,
      content,
      done: false,
      sort_order: plan.items.length + 1,
      created_at: now()
    };
    plan.items.push(item);
    addLog(plan, state, "ITEM_ADDED", `新增任务：${content}`);
    normalizePlanState(plan);
    saveState(state);
    return clone(item);
  }

  const planStatusMatch = url.pathname.match(/^\/api\/plans\/(\d+)\/status$/);
  if (planStatusMatch && method === "PATCH") {
    const plan = findPlan(state, Number(planStatusMatch[1]));
    if (!new Set(["TODO", "IN_PROGRESS", "DONE"]).has(body.status)) {
      fail("状态参数无效", 400);
    }
    if (body.status === "DONE") {
      plan.items.forEach((item) => {
        item.done = true;
      });
    }
    plan.status = body.status;
    normalizePlanState(plan);
    if (!plan.items.length && body.status === "DONE") {
      plan.status = "DONE";
      plan.progress = 100;
    }
    addLog(plan, state, "STATUS_CHANGED", `状态更新为：${plan.status}`);
    saveState(state);
    return planSummary(plan);
  }

  const planMatch = url.pathname.match(/^\/api\/plans\/(\d+)$/);
  if (planMatch && method === "GET") {
    return clone(findPlan(state, Number(planMatch[1])));
  }
  if (planMatch && method === "PUT") {
    const plan = findPlan(state, Number(planMatch[1]));
    updatePlan(state, plan, body);
    saveState(state);
    return planSummary(plan);
  }
  if (planMatch && method === "DELETE") {
    const index = state.plans.findIndex((plan) => plan.id === Number(planMatch[1]));
    if (index < 0) {
      fail("计划不存在", 404);
    }
    state.plans.splice(index, 1);
    state.notifications = state.notifications.filter((item) => item.plan_id !== Number(planMatch[1]));
    saveState(state);
    return null;
  }

  const toggleMatch = url.pathname.match(/^\/api\/items\/(\d+)\/toggle$/);
  if (toggleMatch && method === "PATCH") {
    const { plan, item } = findItem(state, Number(toggleMatch[1]));
    item.done = !item.done;
    normalizePlanState(plan);
    addLog(plan, state, item.done ? "ITEM_DONE" : "ITEM_REOPENED", `${item.done ? "完成" : "重新打开"}任务：${item.content}`);
    saveState(state);
    return { item: clone(item), progress: plan.progress };
  }

  const itemMatch = url.pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemMatch && method === "DELETE") {
    const { plan, item } = findItem(state, Number(itemMatch[1]));
    plan.items = plan.items.filter((candidate) => candidate.id !== item.id);
    normalizePlanState(plan);
    addLog(plan, state, "ITEM_DELETED", `删除任务：${item.content}`);
    saveState(state);
    return null;
  }

  if (url.pathname === "/api/notifications" && method === "GET") {
    const read = url.searchParams.get("read");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);
    return clone(state.notifications
      .filter((item) => read === null || String(item.read) === read)
      .sort((left, right) => Number(left.read) - Number(right.read) || right.id - left.id)
      .slice(0, limit));
  }

  if (url.pathname === "/api/notifications/unread-count" && method === "GET") {
    return state.notifications.filter((item) => !item.read).length;
  }

  if (url.pathname === "/api/notifications/read-all" && method === "PATCH") {
    let count = 0;
    state.notifications.forEach((item) => {
      if (!item.read) {
        item.read = true;
        item.read_at = now();
        count++;
      }
    });
    saveState(state);
    return count;
  }

  const notificationMatch = url.pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (notificationMatch && method === "PATCH") {
    const notification = state.notifications.find((item) => item.id === Number(notificationMatch[1]));
    if (!notification) {
      fail("通知不存在", 404);
    }
    notification.read = true;
    notification.read_at = now();
    saveState(state);
    return clone(notification);
  }

  if (url.pathname === "/api/notifications/scan" && method === "POST") {
    const created = scanNotifications(state);
    saveState(state);
    return created;
  }

  fail(`演示模式暂不支持 ${method} ${url.pathname}`, 404);
}

function listPlans(state, params) {
  const page = Math.max(Number(params.get("page") || 1), 1);
  const size = Math.min(Math.max(Number(params.get("size") || 10), 1), 100);
  const status = params.get("status");
  const category = params.get("category")?.trim().toLowerCase();
  const keyword = params.get("keyword")?.trim().toLowerCase();
  const filtered = state.plans.filter((plan) => {
    const text = `${plan.title} ${plan.description || ""} ${plan.category || ""}`.toLowerCase();
    return (!status || plan.status === status)
      && (!category || plan.category.toLowerCase() === category)
      && (!keyword || text.includes(keyword));
  });
  const start = (page - 1) * size;
  return {
    list: filtered.slice(start, start + size).map(planSummary),
    total: filtered.length,
    page,
    size
  };
}

function createPlan(state, body) {
  const title = requireText(body.title, "请输入计划标题");
  const plan = {
    id: nextId(state, "plan"),
    title,
    description: body.description?.trim() || "",
    category: body.category?.trim() || "未分类",
    status: "TODO",
    priority: Number(body.priority || 2),
    due_date: body.due_date || "",
    progress: 0,
    created_at: now(),
    updated_at: now(),
    items: [],
    logs: []
  };
  (body.items || []).filter(Boolean).forEach((content, index) => {
    plan.items.push({
      id: nextId(state, "item"),
      plan_id: plan.id,
      content: String(content).trim(),
      done: false,
      sort_order: index + 1,
      created_at: now()
    });
  });
  addLog(plan, state, "CREATED", `创建计划：${title}`);
  state.plans.unshift(plan);
  return plan;
}

function updatePlan(state, plan, body) {
  if (body.title !== undefined) {
    plan.title = requireText(body.title, "请输入计划标题");
  }
  if (body.description !== undefined) plan.description = body.description?.trim() || "";
  if (body.category !== undefined) plan.category = body.category?.trim() || "未分类";
  if (body.priority !== undefined) plan.priority = Number(body.priority || 2);
  if (body.due_date !== undefined) plan.due_date = body.due_date || "";
  if (Array.isArray(body.items)) {
    plan.items = body.items.filter(Boolean).map((content, index) => ({
      id: nextId(state, "item"),
      plan_id: plan.id,
      content: String(content).trim(),
      done: false,
      sort_order: index + 1,
      created_at: now()
    }));
  }
  plan.updated_at = now();
  normalizePlanState(plan);
  addLog(plan, state, "UPDATED", `更新计划：${plan.title}`);
}

function buildStats(state) {
  const today = dateOnly(new Date());
  const done = state.plans.filter((plan) => plan.status === "DONE").length;
  const categories = new Map();
  state.plans.forEach((plan) => categories.set(plan.category || "未分类", (categories.get(plan.category || "未分类") || 0) + 1));
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateOnly(date);
    const count = state.plans.flatMap((plan) => plan.logs || [])
      .filter((log) => log.action === "ITEM_DONE" && String(log.created_at).startsWith(key)).length;
    return { date: key, count };
  });
  return {
    total_plans: state.plans.length,
    todo_count: state.plans.filter((plan) => plan.status === "TODO").length,
    in_progress_count: state.plans.filter((plan) => plan.status === "IN_PROGRESS").length,
    done_count: done,
    overdue_count: state.plans.filter((plan) => plan.status !== "DONE" && plan.due_date && plan.due_date < today).length,
    completion_rate: state.plans.length ? Math.round(done * 100 / state.plans.length) : 0,
    weekly_done: weekly,
    category_stats: Array.from(categories, ([category, count]) => ({ category, count }))
  };
}

function scanNotifications(state) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 2);
  let created = 0;
  state.plans.filter((plan) => plan.status !== "DONE" && plan.due_date).forEach((plan) => {
    const due = new Date(`${plan.due_date}T00:00:00`);
    if (due > end) return;
    const overdue = due < new Date(`${dateOnly(today)}T00:00:00`);
    const type = overdue ? "OVERDUE" : "DUE_SOON";
    const exists = state.notifications.some((item) => item.plan_id === plan.id && item.type === type && item.trigger_date === plan.due_date);
    if (exists) return;
    state.notifications.unshift({
      id: nextId(state, "notification"),
      plan_id: plan.id,
      type,
      title: overdue ? "计划已逾期" : "计划即将到期",
      message: `计划「${plan.title}」${overdue ? "已经逾期" : "即将到期"}，建议优先处理。`,
      read: false,
      trigger_date: plan.due_date,
      created_at: now(),
      read_at: null
    });
    created++;
  });
  return created;
}

function normalizePlanState(plan) {
  const total = plan.items.length;
  const completed = plan.items.filter((item) => item.done).length;
  plan.progress = total ? Math.round(completed * 100 / total) : 0;
  if (plan.progress === 100 && total) plan.status = "DONE";
  else if (plan.progress > 0) plan.status = "IN_PROGRESS";
  else if (plan.status === "DONE") plan.status = "TODO";
  plan.updated_at = now();
}

function addLog(plan, state, action, detail) {
  plan.logs = plan.logs || [];
  plan.logs.unshift({ id: nextId(state, "log"), action, detail, created_at: now() });
  plan.logs = plan.logs.slice(0, 20);
}

function findPlan(state, id) {
  const plan = state.plans.find((candidate) => candidate.id === id);
  if (!plan) fail("计划不存在", 404);
  return plan;
}

function findItem(state, id) {
  for (const plan of state.plans) {
    const item = plan.items.find((candidate) => candidate.id === id);
    if (item) return { plan, item };
  }
  fail("任务不存在", 404);
}

function planSummary(plan) {
  const { items, logs, ...summary } = plan;
  return clone(summary);
}

function authPayload(user) {
  return { token: `demo-token-${Date.now()}`, username: user.username, role: user.role };
}

function requireDemoAuth() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    fail("请先登录演示账号", 401);
  }
}

function requireText(value, message) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(message, 400);
  return normalized;
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  error.auth = status === 401;
  throw error;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_KEY));
    if (parsed?.version === 2) return parsed;
  } catch (_error) {
    // Fall through to a fresh demo state.
  }
  const state = seedState();
  saveState(state);
  return state;
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function nextId(state, type) {
  state.ids[type] = (state.ids[type] || 0) + 1;
  return state.ids[type];
}

function seedState() {
  const day = (offset) => {
    const value = new Date();
    value.setDate(value.getDate() + offset);
    return dateOnly(value);
  };
  const plans = [
    seedPlan(1, "Spring Security JWT 实战", "Spring", 3, day(5), [true, true, false, false]),
    seedPlan(2, "MySQL 索引复习", "数据库", 2, day(10), [false, false, false]),
    seedPlan(3, "算法每日练习", "算法", 2, day(2), [true, true, false]),
    seedPlan(4, "Java 基础查漏补缺", "Java基础", 1, day(-3), [true, true, true]),
    seedPlan(5, "Redis 缓存设计", "数据库", 3, day(-1), [false, false])
  ];
  return {
    version: 2,
    user: { id: 2, username: "demo", email: "demo@studyflow.local", role: "USER" },
    plans,
    notifications: [
      { id: 1, plan_id: 5, type: "OVERDUE", title: "计划已逾期", message: "计划「Redis 缓存设计」已经逾期，建议优先处理。", read: false, trigger_date: day(-1), created_at: now(), read_at: null },
      { id: 2, plan_id: 3, type: "DUE_SOON", title: "计划即将到期", message: "计划「算法每日练习」即将到期，建议优先处理。", read: false, trigger_date: day(2), created_at: now(), read_at: null }
    ],
    ids: { plan: 5, item: 60, log: 10, notification: 2 }
  };
}

function seedPlan(id, title, category, priority, dueDate, doneStates) {
  const labels = ["整理知识点", "完成代码练习", "补充测试", "整理复盘笔记"];
  const items = doneStates.map((done, index) => ({
    id: id * 10 + index + 1,
    plan_id: id,
    content: labels[index] || `任务 ${index + 1}`,
    done,
    sort_order: index + 1,
    created_at: now()
  }));
  const progress = Math.round(items.filter((item) => item.done).length * 100 / items.length);
  return {
    id,
    title,
    description: `围绕${title}完成学习任务并形成可复盘的输出。`,
    category,
    status: progress === 100 ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO",
    priority,
    due_date: dueDate,
    progress,
    created_at: now(),
    updated_at: now(),
    items,
    logs: [{ id, action: "CREATED", detail: `创建计划：${title}`, created_at: now() }]
  };
}

function dateOnly(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
