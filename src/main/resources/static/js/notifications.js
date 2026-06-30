(function () {
  const api = window.StudyFlowApi;
  const state = {
    read: ""
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (!api.requireAuth()) {
      return;
    }
    await api.initShell("notifications");
    bindActions();
    await refresh();
    api.renderIcons();
  });

  function bindActions() {
    document.querySelector("[data-notification-tabs]").addEventListener("click", async (event) => {
      const tab = event.target.closest(".tab");
      if (!tab) {
        return;
      }
      state.read = tab.dataset.read;
      document.querySelectorAll(".tab").forEach((item) => {
        item.classList.toggle("active", item === tab);
      });
      await refresh();
    });

    document.querySelector("[data-read-all]").addEventListener("click", async () => {
      const updated = await api.patch("/api/notifications/read-all", {});
      api.showToast(`已标记 ${updated || 0} 条提醒`);
      await refresh();
    });

    document.querySelector("[data-scan-reminders]").addEventListener("click", async () => {
      const created = await api.post("/api/notifications/scan", {});
      api.showToast(created > 0 ? `新增 ${created} 条提醒` : "没有新的到期提醒");
      await refresh();
    });
  }

  async function refresh() {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  }

  async function loadUnreadCount() {
    const count = await api.get("/api/notifications/unread-count");
    document.querySelector("[data-unread-count]").textContent = `${count || 0} 条未读`;
  }

  async function loadNotifications() {
    const params = new URLSearchParams({ limit: "50" });
    if (state.read) {
      params.set("read", state.read);
    }
    const notifications = await api.get(`/api/notifications?${params.toString()}`);
    renderNotifications(notifications || []);
  }

  function renderNotifications(notifications) {
    const list = document.querySelector("[data-notification-list]");
    const empty = document.querySelector("[data-empty-state]");
    list.innerHTML = notifications.map((item) => notificationRow(item)).join("");
    empty.hidden = notifications.length > 0;
    list.hidden = notifications.length === 0;

    list.querySelectorAll("[data-mark-read]").forEach((button) => {
      button.addEventListener("click", async () => {
        await api.patch(`/api/notifications/${button.dataset.id}/read`, {});
        api.showToast("提醒已读");
        await refresh();
      });
    });

    api.revealChildren(list, ".notification-item");
    api.renderIcons();
  }

  function notificationRow(item) {
    const readClass = item.read ? "read" : "unread";
    const typeLabel = item.type === "OVERDUE" ? "逾期" : "到期";
    const icon = item.type === "OVERDUE" ? "triangle-alert" : "alarm-clock";
    return `
      <article class="notification-item ${readClass}">
        <div class="notification-mark">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="notification-body">
          <div class="notification-title-row">
            <strong>${api.escapeHtml(item.title)}</strong>
            <span class="notification-type">${typeLabel}</span>
          </div>
          <p>${api.escapeHtml(item.message)}</p>
          <div class="notification-meta">
            <span>触发日期 ${api.formatDate(item.trigger_date)}</span>
            <span>创建时间 ${api.formatDateTime(item.created_at)}</span>
          </div>
        </div>
        <div class="notification-actions">
          ${item.plan_id ? `<a class="button" href="plan-detail.html?id=${item.plan_id}"><i data-lucide="external-link"></i>查看</a>` : ""}
          ${item.read ? "" : `<button class="button" data-mark-read data-id="${item.id}" type="button"><i data-lucide="check"></i>已读</button>`}
        </div>
      </article>
    `;
  }
})();
