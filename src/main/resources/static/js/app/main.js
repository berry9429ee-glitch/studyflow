import { createApiClient } from "./apiClient.js";
import { authStore } from "./authStore.js";
import { createNotificationsFeature, bindNotifications, renderNotificationsSection } from "./notifications.js";
import { createPlansFeature, bindEditor, bindPlans, readEditor, renderEditorSection, renderPlansSection } from "./plans.js";
import { initTimer } from "./timer.js";
import {
  emptyState,
  escapeHtml,
  formatDate,
  glassPanel,
  normalizeStats,
  primaryButton,
  scrollToSection,
  softButton,
  toast
} from "./ui.js";

const api = createApiClient({ onUnauthorized: enterSignedOut });
const plansFeature = createPlansFeature(api);
const notificationsFeature = createNotificationsFeature(api);

const state = {
  signedIn: false,
  user: null,
  plans: [],
  allPlans: [],
  selectedPlan: null,
  stats: normalizeStats(null),
  notifications: [],
  unreadCount: 0,
  filters: { status: "", category: "", keyword: "" },
  readFilter: "",
  editor: createEmptyEditor(),
  confirm: null,
  bootMessage: ""
};

document.addEventListener("DOMContentLoaded", () => {
  initTimer({ toast });
  boot();
});

async function boot() {
  state.signedIn = authStore.isSignedIn();
  if (!state.signedIn) {
    enterSignedOut("登录后同步你的个人计划、任务、提醒和统计。");
    return;
  }
  await refreshAll();
}

async function refreshAll() {
  try {
    const [page, stats, notifications, unreadCount, user] = await Promise.all([
      plansFeature.load(state.filters),
      api.get("/api/dashboard/stats"),
      notificationsFeature.load(state.readFilter),
      notificationsFeature.unreadCount(),
      api.get("/api/user/me")
    ]);
    state.signedIn = true;
    state.user = user;
    state.plans = page.list;
    if (!state.filters.status && !state.filters.category && !state.filters.keyword) {
      state.allPlans = page.list;
    } else if (!state.allPlans.length) {
      state.allPlans = page.list;
    }
    state.stats = normalizeStats(stats, state.allPlans);
    state.notifications = notifications;
    state.unreadCount = Number(unreadCount || 0);

    const selectedStillVisible = state.selectedPlan && state.plans.some((plan) => plan.id === state.selectedPlan.id);
    const nextId = selectedStillVisible ? state.selectedPlan.id : state.plans[0]?.id;
    state.selectedPlan = nextId ? await plansFeature.detail(nextId) : null;
    renderApp();
  } catch (error) {
    if (!error.auth) {
      state.bootMessage = error.message || "数据同步失败";
      renderApp();
      toast(state.bootMessage);
    }
  }
}

function enterSignedOut(message = "") {
  state.signedIn = false;
  state.user = null;
  state.plans = [];
  state.allPlans = [];
  state.selectedPlan = null;
  state.stats = normalizeStats(null);
  state.notifications = [];
  state.unreadCount = 0;
  state.bootMessage = message;
  renderApp();
}

function renderApp() {
  const main = document.querySelector("main");
  if (!main) {
    return;
  }
  main.className = "w-full max-w-7xl mx-auto px-6 py-28 flex flex-col gap-44 relative z-10";
  main.innerHTML = [
    renderDashboardSection(),
    renderPlansSection(state),
    renderEditorSection(state),
    renderNotificationsSection(state),
    renderAccountSection(),
    renderConfirmModal()
  ].join("");
  installDock();
  bindApp(main);
  runRevealAnimations();
  jumpToCurrentHash();
}

function bindApp(root) {
  root.querySelectorAll("[data-new-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editor = createEmptyEditor();
      renderApp();
      scrollToSection("plan-editor");
    });
  });
  root.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", refreshAll);
  });
  root.querySelectorAll("[data-focus-login]").forEach((button) => {
    button.addEventListener("click", () => scrollToSection("account"));
  });
  root.querySelector("[data-editor-reset]")?.addEventListener("click", () => {
    state.editor = createEmptyEditor();
    renderApp();
    scrollToSection("plan-editor", "auto");
  });
  root.querySelector("[data-editor-cancel]")?.addEventListener("click", () => {
    state.editor = createEmptyEditor();
    renderApp();
    scrollToSection("plans");
  });

  bindPlans(root, {
    setStatusFilter: async (status) => {
      state.filters.status = status;
      await refreshAll();
      scrollToSection("plans", "auto");
    },
    setCategoryFilter: async (category) => {
      state.filters.category = category;
      await refreshAll();
      scrollToSection("plans", "auto");
    },
    setKeyword: async (keyword) => {
      state.filters.keyword = keyword;
      await refreshAll();
    },
    selectPlan,
    editPlan,
    deletePlan,
    setPlanStatus,
    toggleItem,
    deleteItem,
    addItem
  });

  bindEditor(root, {
    setEditorPriority: (priority) => {
      state.editor = { ...state.editor, ...readEditor(root), priority };
      renderApp();
      scrollToSection("plan-editor", "auto");
    },
    saveEditor
  });

  bindNotifications(root, {
    setReadFilter: async (readFilter) => {
      state.readFilter = readFilter;
      await refreshNotifications();
      renderApp();
      scrollToSection("notifications", "auto");
    },
    scanNotifications,
    markAllRead,
    markRead,
    openPlan: async (id) => {
      await selectPlan(id);
      scrollToSection("plans");
    }
  });

  root.querySelector("[data-login-form]")?.addEventListener("submit", submitLogin);
  root.querySelector("[data-register-form]")?.addEventListener("submit", submitRegister);
  root.querySelector("[data-logout]")?.addEventListener("click", () => {
    authStore.logout();
    enterSignedOut("已退出登录。");
    toast("已退出登录");
    scrollToSection("account");
  });
  root.querySelector("[data-reset-demo]")?.addEventListener("click", async () => {
    api.resetDemo();
    if (state.signedIn) {
      await refreshAll();
    } else {
      renderApp();
    }
    toast("演示数据已恢复");
  });

  root.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => {
    state.confirm = null;
    renderApp();
  });
  root.querySelector("[data-confirm-ok]")?.addEventListener("click", async () => {
    const action = state.confirm?.action;
    state.confirm = null;
    renderApp();
    await action?.();
  });
}

async function selectPlan(id) {
  if (!ensureLive()) {
    return;
  }
  state.selectedPlan = await plansFeature.detail(id);
  renderApp();
}

async function editPlan(id) {
  if (!ensureLive()) {
    return;
  }
  const plan = state.selectedPlan?.id === id ? state.selectedPlan : await plansFeature.detail(id);
  state.editor = {
    id: plan.id,
    title: plan.title || "",
    description: plan.description || "",
    category: plan.category || "",
    due_date: plan.due_date || "",
    priority: Number(plan.priority || 2),
    items: (plan.items || []).map((item) => item.content || "").filter(Boolean)
  };
  renderApp();
  scrollToSection("plan-editor");
}

async function saveEditor(draft) {
  if (!ensureLive()) {
    return;
  }
  const editor = { ...state.editor, ...draft };
  if (!editor.title) {
    toast("请输入计划标题");
    return;
  }
  try {
    const saved = await plansFeature.save(editor);
    state.editor = createEmptyEditor();
    await refreshAll();
    if (saved?.id) {
      await selectPlan(saved.id);
    }
    toast("计划已保存");
    scrollToSection("plans");
  } catch (error) {
    toast(error.message || "保存失败");
  }
}

function deletePlan(id) {
  if (!ensureLive()) {
    return;
  }
  askConfirm("删除计划", "删除后计划和任务清单都会移除，确定继续吗？", async () => {
    await plansFeature.deletePlan(id);
    state.selectedPlan = null;
    await refreshAll();
    toast("计划已删除");
  });
}

async function setPlanStatus(status) {
  if (!ensureLive() || !state.selectedPlan) {
    return;
  }
  await plansFeature.setStatus(state.selectedPlan.id, status);
  await refreshAll();
  toast("状态已更新");
}

async function addItem(content) {
  if (!ensureLive() || !state.selectedPlan) {
    return;
  }
  if (!content) {
    toast("请输入任务内容");
    return;
  }
  await plansFeature.addItem(state.selectedPlan.id, content);
  state.selectedPlan = await plansFeature.detail(state.selectedPlan.id);
  await refreshStatsOnly();
  renderApp();
  toast("任务已添加");
}

async function toggleItem(id) {
  if (!ensureLive() || !state.selectedPlan) {
    return;
  }
  await plansFeature.toggleItem(id);
  state.selectedPlan = await plansFeature.detail(state.selectedPlan.id);
  await refreshStatsOnly();
  renderApp();
}

function deleteItem(id) {
  if (!ensureLive() || !state.selectedPlan) {
    return;
  }
  askConfirm("删除任务", "确定删除这条任务吗？", async () => {
    await plansFeature.deleteItem(id);
    state.selectedPlan = await plansFeature.detail(state.selectedPlan.id);
    await refreshStatsOnly();
    renderApp();
    toast("任务已删除");
  });
}

async function refreshStatsOnly() {
  try {
    const stats = await api.get("/api/dashboard/stats");
    state.stats = normalizeStats(stats, state.allPlans);
  } catch (error) {
    // Stats are helpful, but should not block task operations.
  }
}

async function refreshNotifications() {
  state.notifications = await notificationsFeature.load(state.readFilter);
  state.unreadCount = Number(await notificationsFeature.unreadCount() || 0);
}

async function scanNotifications() {
  if (!ensureLive()) {
    return;
  }
  const created = await notificationsFeature.scan();
  await refreshNotifications();
  renderApp();
  toast(created > 0 ? `新增 ${created} 条提醒` : "没有新的到期提醒");
}

async function markAllRead() {
  if (!ensureLive()) {
    return;
  }
  const count = await notificationsFeature.markAllRead();
  await refreshNotifications();
  renderApp();
  toast(`已标记 ${count || 0} 条提醒`);
}

async function markRead(id) {
  if (!ensureLive()) {
    return;
  }
  await notificationsFeature.markRead(id);
  await refreshNotifications();
  renderApp();
}

async function submitLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector("[data-auth-error]");
  error.textContent = "";
  try {
    const data = await api.post("/api/auth/login", {
      username: form.username.value.trim(),
      password: form.password.value
    });
    authStore.saveAuth(data);
    await refreshAll();
    toast("登录成功");
    scrollToSection("dashboard");
  } catch (err) {
    error.textContent = err.message || "登录失败";
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector("[data-auth-error]");
  error.textContent = "";
  const payload = {
    username: form.username.value.trim(),
    password: form.password.value
  };
  if (form.email.value.trim()) {
    payload.email = form.email.value.trim();
  }
  try {
    const data = await api.post("/api/auth/register", payload);
    authStore.saveAuth(data);
    await refreshAll();
    toast("账号已创建");
    scrollToSection("dashboard");
  } catch (err) {
    error.textContent = err.message || "注册失败";
  }
}

function renderDashboardSection() {
  const stats = state.stats;
  return `
    <section class="snap-start scroll-mt-32" id="dashboard">
      ${api.mode === "demo" ? `
        <div class="mb-6 flex flex-col gap-3 rounded-2xl border border-[#1a73e8]/20 bg-[#e8f0fe]/80 px-5 py-4 text-[14px] text-[#174ea6] shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span><strong>静态演示模式：</strong>数据仅保存在当前浏览器，不会上传到服务器。</span>
          <button class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white/75 px-3 text-[13px] font-semibold transition hover:bg-white" type="button" data-reset-demo>
            <span class="material-symbols-outlined text-[17px]">restart_alt</span>恢复演示数据
          </button>
        </div>
      ` : ""}
      <div class="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-label-lg text-label-lg uppercase tracking-widest text-primary mb-3">StudyFlow OS</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">学习驾驶舱</h2>
          <p class="font-body-lg text-body-lg text-on-surface-variant tracking-wide">${state.signedIn ? "当前展示你的个人计划、任务、提醒和统计。" : state.bootMessage || "登录后同步你的个人学习数据。"}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a class="${softButton}" href="#plans"><span class="material-symbols-outlined text-[18px]">view_list</span>计划</a>
          <button class="${primaryButton}" type="button" data-new-plan><span class="material-symbols-outlined text-[18px]">add</span>新建</button>
        </div>
      </div>
      <div class="grid gap-5 md:grid-cols-4">
        ${statCard("总计划", stats.total_plans, "space_dashboard")}
        ${statCard("进行中", stats.in_progress_count, "progress_activity")}
        ${statCard("已完成", stats.done_count, "task_alt")}
        ${statCard("逾期", stats.overdue_count, "priority_high")}
      </div>
      <div class="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="${glassPanel} p-8">${renderWeekly(stats.weekly_done)}</div>
        <div class="${glassPanel} p-8">${renderCategories(stats.category_stats)}</div>
      </div>
    </section>
  `;
}

function renderAccountSection() {
  const snapshot = authStore.getUserSnapshot();
  return `
    <section class="snap-start scroll-mt-32 mb-32" id="account">
      <div class="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-label-lg text-label-lg uppercase tracking-widest text-primary mb-3">Account</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">账号与同步</h2>
          <p class="font-body-lg text-body-lg text-on-surface-variant tracking-wide">${api.mode === "demo" ? "当前是 Netlify 静态演示，账号和数据只保存在本机浏览器。" : "登录后只同步当前用户自己的计划、任务、提醒和统计。"}</p>
        </div>
      </div>
      <div class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div class="${glassPanel} p-8">
          <div class="flex items-center gap-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-xl font-bold text-on-primary-container">${escapeHtml((state.user?.username || snapshot.username || "SF").slice(0, 2).toUpperCase())}</div>
            <div>
              <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">${state.signedIn ? escapeHtml(state.user?.username || snapshot.username) : "未登录"}</h3>
              <p class="mt-1 text-[14px] text-on-surface-variant">${state.signedIn ? escapeHtml(state.user?.role || snapshot.role || "USER") : "登录后启用个人数据同步"}</p>
            </div>
          </div>
          <div class="mt-6">
            ${state.signedIn ? `<button class="${softButton}" type="button" data-logout><span class="material-symbols-outlined text-[18px]">logout</span>退出登录</button>` : `
              <div class="rounded-2xl border border-white/30 bg-white/35 px-4 py-3 text-[14px] leading-relaxed text-on-surface-variant">
                ${api.mode === "demo" ? "演示模式可输入任意非空用户名和密码；推荐使用 demo / user123。" : "你可以使用已有账号登录，也可以直接创建新账号。"}
              </div>
            `}
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          ${authForm("login")}
          ${authForm("register")}
        </div>
      </div>
    </section>
  `;
}

function authForm(type) {
  const isRegister = type === "register";
  return `
    <form class="${glassPanel} p-6" data-${type}-form>
      <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">${isRegister ? "创建账号" : "登录"}</h3>
      <div class="mt-5 flex flex-col gap-3">
        <input class="h-11 rounded-xl border border-white/40 bg-white/55 px-4 text-[14px]" name="username" placeholder="用户名" required>
        ${isRegister ? `<input class="h-11 rounded-xl border border-white/40 bg-white/55 px-4 text-[14px]" name="email" placeholder="邮箱，可选">` : `<input name="email" hidden>`}
        <input class="h-11 rounded-xl border border-white/40 bg-white/55 px-4 text-[14px]" name="password" type="password" placeholder="密码" required>
      </div>
      <div class="mt-3 min-h-5 text-[13px] font-medium text-[#d93025]" data-auth-error></div>
      <button class="mt-3 ${primaryButton} w-full" type="submit">${isRegister ? "注册并进入" : "登录"}</button>
    </form>
  `;
}

function statCard(label, value, icon) {
  return `
    <div class="${glassPanel} p-6">
      <span class="material-symbols-outlined text-[28px] text-primary">${icon}</span>
      <p class="mt-4 text-[12px] font-bold uppercase tracking-widest text-on-surface-variant">${label}</p>
      <p class="mt-1 font-headline-md text-headline-md text-on-surface tracking-tight">${Number(value || 0)}</p>
    </div>
  `;
}

function renderWeekly(items = []) {
  const safe = items.length ? items : Array.from({ length: 7 }, (_, index) => ({ date: `D${index + 1}`, count: 0 }));
  const max = Math.max(1, ...safe.map((item) => Number(item.count || 0)));
  return `
    <div class="mb-5 flex items-center justify-between">
      <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">本周完成</h3>
      <span class="text-[13px] font-semibold text-on-surface-variant">按完成记录统计</span>
    </div>
    <div class="flex h-48 items-end gap-3">
      ${safe.map((item) => `
        <div class="flex flex-1 flex-col items-center gap-2">
          <div class="w-full rounded-t-xl bg-[#1a73e8]/80" style="height:${Math.max(8, Number(item.count || 0) / max * 100)}%"></div>
          <span class="text-[11px] font-semibold text-on-surface-variant">${escapeHtml(String(item.date || "").slice(5) || item.date)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCategories(items = []) {
  if (!items.length) {
    return emptyState("暂无分类", "创建带分类的计划后，这里会出现分布。", "category");
  }
  return `
    <h3 class="mb-5 font-title-lg text-title-lg text-on-surface tracking-tight">分类分布</h3>
    <div class="flex flex-col gap-3">
      ${items.slice(0, 6).map((item) => `
        <div class="flex items-center justify-between rounded-xl bg-white/35 px-4 py-3">
          <span class="text-[14px] font-semibold text-on-surface">${escapeHtml(item.category || "未分类")}</span>
          <span class="text-[13px] font-bold text-primary">${Number(item.count || 0)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function installDock() {
  document.querySelector("[data-studyflow-dock]")?.remove();
  const dock = document.createElement("nav");
  dock.dataset.studyflowDock = "true";
  dock.setAttribute("aria-label", "StudyFlow 单页导航");
  dock.className = "fixed left-1/2 bottom-5 z-[80] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/40 bg-white/75 px-2.5 py-2 text-on-surface shadow-lg shadow-blue-500/10 backdrop-blur-xl md:left-auto md:right-6 md:top-6 md:bottom-auto md:translate-x-0";
  dock.innerHTML = `
    <a class="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-on-surface-variant transition hover:bg-white/70 hover:text-primary" href="#dashboard"><span class="material-symbols-outlined text-[18px]">space_dashboard</span><span class="hidden sm:inline">总览</span></a>
    <a class="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-on-surface-variant transition hover:bg-white/70 hover:text-primary" href="#plans"><span class="material-symbols-outlined text-[18px]">view_list</span><span class="hidden sm:inline">计划</span></a>
    <button class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#1a73e8] px-3 text-[13px] font-semibold text-white shadow-md shadow-[#1a73e8]/20 transition hover:bg-[#1557b0]" type="button" data-new-plan><span class="material-symbols-outlined text-[18px]">add</span><span class="hidden sm:inline">新建</span></button>
    <a class="relative inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-on-surface-variant transition hover:bg-white/70 hover:text-primary" href="#notifications"><span class="material-symbols-outlined text-[18px]">notifications</span><span class="hidden sm:inline">提醒</span>${state.unreadCount ? `<span class="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#d93025] px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">${state.unreadCount}</span>` : ""}</a>
    <a class="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-on-surface-variant transition hover:bg-white/70 hover:text-primary" href="#account"><span class="material-symbols-outlined text-[18px]">account_circle</span><span class="hidden sm:inline">${state.signedIn ? escapeHtml(state.user?.username || "账号") : "登录"}</span></a>
  `;
  document.body.appendChild(dock);
  dock.querySelectorAll("[data-new-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editor = createEmptyEditor();
      renderApp();
      scrollToSection("plan-editor");
    });
  });
}

function renderConfirmModal() {
  if (!state.confirm) {
    return "";
  }
  return `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-6 backdrop-blur-sm" data-confirm-modal>
      <div class="w-full max-w-md rounded-2xl border border-white/40 bg-white/90 p-7 shadow-xl backdrop-blur-xl">
        <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">${escapeHtml(state.confirm.title)}</h3>
        <p class="mt-3 text-[15px] leading-relaxed text-on-surface-variant">${escapeHtml(state.confirm.body)}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="${softButton} h-10 px-4" type="button" data-confirm-cancel>取消</button>
          <button class="h-10 rounded-xl bg-[#d93025] px-4 text-[14px] font-semibold text-white shadow-md shadow-[#d93025]/20 transition hover:bg-[#b3261e]" type="button" data-confirm-ok>确认</button>
        </div>
      </div>
    </div>
  `;
}

function askConfirm(title, body, action) {
  state.confirm = { title, body, action };
  renderApp();
}

function ensureLive() {
  if (state.signedIn && authStore.isSignedIn()) {
    return true;
  }
  toast("请先登录后操作");
  scrollToSection("account");
  return false;
}

function createEmptyEditor() {
  return {
    id: null,
    title: "",
    description: "",
    category: "",
    due_date: "",
    priority: 2,
    items: [""]
  };
}

function runRevealAnimations() {
  document.querySelectorAll(".animate-fade-in-up").forEach((el) => {
    el.style.animationPlayState = "running";
  });
}

function jumpToCurrentHash() {
  if (!location.hash) {
    return;
  }
  window.setTimeout(() => {
    const target = document.querySelector(location.hash);
    if (!target) {
      return;
    }
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - 96), behavior: "auto" });
  }, 0);
}
