export const glassPanel = "rounded-2xl border border-white/20 bg-white/40 shadow-sm backdrop-blur-xl";
export const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 text-[14px] font-semibold text-white shadow-md shadow-[#1a73e8]/20 transition hover:bg-[#1557b0]";
export const softButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/50 px-4 text-[14px] font-semibold text-on-surface-variant backdrop-blur-xl transition hover:bg-white/80 hover:text-primary";
export const dangerButton = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d93025]/25 bg-[#fce8e6] px-3 text-[13px] font-semibold text-[#b3261e] transition hover:bg-[#fad2cf]";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : "未设置";
}

export function formatDateTime(value) {
  return value ? String(value).replace("T", " ").slice(0, 16) : "刚刚";
}

export function statusLabel(status) {
  return { TODO: "待开始", IN_PROGRESS: "进行中", DONE: "已完成" }[status] || "计划";
}

export function statusTone(status) {
  return {
    TODO: "bg-surface-container text-on-surface-variant",
    IN_PROGRESS: "bg-primary-container text-on-primary-container",
    DONE: "bg-[#e6f4ea] text-[#137333]"
  }[status] || "bg-surface-container text-on-surface-variant";
}

export function priorityLabel(priority) {
  return { 1: "低优先级", 2: "中优先级", 3: "高优先级" }[Number(priority)] || "中优先级";
}

export function normalizePlan(plan, detail = false) {
  if (!plan) {
    return null;
  }
  const normalized = {
    ...plan,
    due_date: plan.due_date || plan.dueDate || "",
    created_at: plan.created_at || plan.createdAt || "",
    updated_at: plan.updated_at || plan.updatedAt || "",
    progress: Number(plan.progress || 0),
    priority: Number(plan.priority || 2)
  };
  if (detail) {
    normalized.items = (plan.items || []).map((item) => ({
      ...item,
      plan_id: item.plan_id || item.planId,
      sort_order: item.sort_order || item.sortOrder,
      created_at: item.created_at || item.createdAt,
      done: Boolean(item.done)
    }));
    normalized.logs = (plan.logs || []).map((log) => ({
      ...log,
      created_at: log.created_at || log.createdAt
    }));
  }
  return normalized;
}

export function normalizePlanPage(payload) {
  if (Array.isArray(payload)) {
    return { list: payload.map((item) => normalizePlan(item)), total: payload.length };
  }
  const list = payload?.list || payload?.records || payload?.content || [];
  return {
    list: list.map((item) => normalizePlan(item)),
    total: Number(payload?.total || list.length || 0)
  };
}

export function normalizeNotification(item) {
  return {
    ...item,
    user_id: item.user_id || item.userId,
    plan_id: item.plan_id || item.planId,
    trigger_date: item.trigger_date || item.triggerDate,
    created_at: item.created_at || item.createdAt,
    read_at: item.read_at || item.readAt,
    read: Boolean(item.read)
  };
}

export function normalizeStats(payload, plans = []) {
  const safe = payload || {};
  return {
    total_plans: Number(safe.total_plans || safe.totalPlans || plans.length || 0),
    todo_count: Number(safe.todo_count || safe.todoCount || plans.filter((plan) => plan.status === "TODO").length || 0),
    in_progress_count: Number(safe.in_progress_count || safe.inProgressCount || plans.filter((plan) => plan.status === "IN_PROGRESS").length || 0),
    done_count: Number(safe.done_count || safe.doneCount || plans.filter((plan) => plan.status === "DONE").length || 0),
    completion_rate: Number(safe.completion_rate || safe.completionRate || 0),
    overdue_count: Number(safe.overdue_count || safe.overdueCount || 0),
    weekly_done: safe.weekly_done || safe.weeklyDone || [],
    category_stats: safe.category_stats || safe.categoryStats || []
  };
}

export function progressBar(value) {
  const progress = Math.max(0, Math.min(100, Number(value || 0)));
  return `
    <div class="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
      <div class="h-full rounded-full bg-[#1a73e8] shadow-[0_0_8px_rgba(26,115,232,0.45)]" style="width:${progress}%"></div>
    </div>
  `;
}

export function emptyState(title, body, icon = "inbox", action = "", attr = "") {
  return `
    <div class="${glassPanel} p-8 text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
        <span class="material-symbols-outlined text-[28px]">${icon}</span>
      </div>
      <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">${escapeHtml(title)}</h3>
      <p class="mx-auto mt-2 max-w-md font-body-md text-[15px] leading-relaxed text-on-surface-variant">${escapeHtml(body)}</p>
      ${action ? `<button class="mt-5 ${primaryButton}" type="button" ${attr}>${escapeHtml(action)}</button>` : ""}
    </div>
  `;
}

export function toast(message) {
  let stack = document.querySelector("[data-toast-stack]");
  if (!stack) {
    stack = document.createElement("div");
    stack.dataset.toastStack = "true";
    stack.className = "fixed right-5 top-20 z-[120] flex flex-col gap-3";
    document.body.appendChild(stack);
  }
  const node = document.createElement("div");
  node.className = "rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-[14px] font-semibold text-on-surface shadow-lg backdrop-blur-xl";
  node.textContent = message;
  stack.appendChild(node);
  window.setTimeout(() => {
    node.remove();
    if (!stack.children.length) {
      stack.remove();
    }
  }, 2600);
}

export function debounce(fn, delay = 260) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function scrollToSection(id, mode = "smooth") {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, top - 96), behavior: mode });
  history.replaceState(null, "", `#${id}`);
}
