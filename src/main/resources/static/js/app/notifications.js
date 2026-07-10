import {
  emptyState,
  escapeHtml,
  formatDateTime,
  glassPanel,
  normalizeNotification,
  primaryButton,
  softButton
} from "./ui.js";

export function createNotificationsFeature(api) {
  return {
    async load(readFilter = "") {
      const params = new URLSearchParams({ limit: "50" });
      if (readFilter) {
        params.set("read", readFilter);
      }
      const items = await api.get(`/api/notifications?${params.toString()}`);
      return (Array.isArray(items) ? items : []).map(normalizeNotification);
    },

    unreadCount() {
      return api.get("/api/notifications/unread-count");
    },

    markRead(id) {
      return api.patch(`/api/notifications/${id}/read`, {});
    },

    markAllRead() {
      return api.patch("/api/notifications/read-all", {});
    },

    scan() {
      return api.post("/api/notifications/scan", {});
    }
  };
}

export function renderNotificationsSection(state) {
  return `
    <section class="snap-start scroll-mt-32" id="notifications">
      <div class="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-label-lg text-label-lg uppercase tracking-widest text-primary mb-3">Reminder Center</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">提醒中心</h2>
          <p class="font-body-lg text-body-lg text-on-surface-variant tracking-wide">到期扫描、未读提醒和计划跳转全部在本页完成。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="${softButton}" type="button" data-scan-notifications>
            <span class="material-symbols-outlined text-[18px]">sync</span>扫描到期
          </button>
          <button class="${primaryButton}" type="button" data-read-all>
            <span class="material-symbols-outlined text-[18px]">done_all</span>全部已读
          </button>
        </div>
      </div>
      <div class="${glassPanel} mb-6 p-5">
        <div class="flex flex-wrap gap-2" data-notification-tabs>
          ${renderReadTab("", "全部", state.readFilter)}
          ${renderReadTab("false", "未读", state.readFilter)}
          ${renderReadTab("true", "已读", state.readFilter)}
        </div>
      </div>
      <div class="flex max-w-4xl flex-col gap-5" data-notification-list>
        ${renderNotificationList(state)}
      </div>
    </section>
  `;
}

export function bindNotifications(root, handlers) {
  root.querySelectorAll("[data-read]").forEach((button) => {
    button.addEventListener("click", () => handlers.setReadFilter(button.dataset.read || ""));
  });
  root.querySelector("[data-scan-notifications]")?.addEventListener("click", handlers.scanNotifications);
  root.querySelector("[data-read-all]")?.addEventListener("click", handlers.markAllRead);
  root.querySelectorAll("[data-mark-read]").forEach((button) => {
    button.addEventListener("click", () => handlers.markRead(Number(button.dataset.markRead)));
  });
  root.querySelectorAll("[data-open-plan]").forEach((button) => {
    button.addEventListener("click", () => handlers.openPlan(Number(button.dataset.openPlan)));
  });
}

function renderReadTab(value, label, current) {
  const active = current === value;
  return `<button class="rounded-xl px-4 py-2 text-[13px] font-semibold transition ${active ? "bg-[#1a73e8] text-white shadow-md shadow-[#1a73e8]/20" : "bg-white/35 text-on-surface-variant hover:bg-white/70"}" type="button" data-read="${value}">${label}</button>`;
}

function renderNotificationList(state) {
  if (!state.signedIn) {
    return emptyState("登录后查看提醒", "提醒中心只显示当前用户自己的到期提醒和未读状态。", "account_circle", "去登录", "data-focus-login");
  }
  if (!state.notifications.length) {
    return emptyState("暂无提醒", "到期扫描后，逾期和即将到期的计划会出现在这里。", "notifications", "扫描到期", "data-scan-notifications");
  }
  return state.notifications.map((item) => {
    const unread = !item.read;
    return `
      <article class="${glassPanel} group flex items-start gap-5 p-5 transition hover:bg-white/55 ${unread ? "ring-1 ring-[#1a73e8]/25" : ""}">
        <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${unread ? "bg-primary-fixed text-on-primary-fixed" : "bg-tertiary-fixed text-on-tertiary-fixed"} shadow-sm transition-transform group-hover:scale-105">
          <span class="material-symbols-outlined text-[24px]">${item.type === "OVERDUE" ? "priority_high" : "notifications"}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 class="font-title-lg text-title-lg text-on-surface tracking-tight">${escapeHtml(item.title || "提醒")}</h4>
              <p class="mt-2 text-[15px] leading-relaxed text-on-surface-variant">${escapeHtml(item.message || "")}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-[12px] font-bold ${unread ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"}">${unread ? "未读" : "已读"}</span>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="text-[12px] font-semibold uppercase tracking-widest text-outline">${formatDateTime(item.created_at)}</span>
            ${item.plan_id ? `<button class="${softButton} h-9 px-3 text-[12px]" type="button" data-open-plan="${item.plan_id}">查看计划</button>` : ""}
            ${unread ? `<button class="${softButton} h-9 px-3 text-[12px]" type="button" data-mark-read="${item.id}">标记已读</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");
}
