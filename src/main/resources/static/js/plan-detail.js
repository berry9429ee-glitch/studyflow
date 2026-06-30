(function () {
  const api = window.StudyFlowApi;
  const params = new URLSearchParams(location.search);
  const planId = params.get("id");
  let plan;
  const ringLength = 2 * Math.PI * 52;

  document.addEventListener("DOMContentLoaded", async () => {
    if (!api.requireAuth()) {
      return;
    }
    if (!planId) {
      location.href = "plans.html";
      return;
    }
    await api.initShell("plans");
    bindActions();
    await loadPlan();
    api.renderIcons();
  });

  async function loadPlan() {
    plan = await api.get(`/api/plans/${planId}`);
    renderPlan();
  }

  function renderPlan() {
    document.title = `${plan.title} - StudyFlow`;
    document.querySelector("[data-plan-title]").textContent = plan.title;
    document.querySelector("[data-title-status]").innerHTML = api.statusChip(plan.status);
    document.querySelector("[data-updated-at]").textContent = `更新于 ${api.formatDateTime(plan.updated_at)}`;
    document.querySelector("[data-edit-link]").href = `plan-form.html?id=${plan.id}`;

    const description = document.querySelector("[data-description]");
    description.textContent = plan.description || "暂无描述";
    description.classList.toggle("empty", !plan.description);

    renderChecklist();
    renderProgress(plan.progress || 0);
    renderMeta();
    renderLogs();
    api.renderIcons();
  }

  function renderChecklist() {
    const list = document.querySelector("[data-checklist]");
    const done = (plan.items || []).filter((item) => item.done).length;
    document.querySelector("[data-item-count]").textContent = `${done} / ${(plan.items || []).length}`;
    list.innerHTML = (plan.items || []).map((item) => `
      <label class="check-item" data-item-id="${item.id}">
        <input type="checkbox" ${item.done ? "checked" : ""} aria-label="切换任务">
        <span class="check-text ${item.done ? "done" : ""}">${api.escapeHtml(item.content)}</span>
      </label>
    `).join("");

    list.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.addEventListener("change", () => toggleItem(checkbox));
    });
    api.revealChildren(list, ".check-item");
  }

  async function toggleItem(checkbox) {
    const row = checkbox.closest("[data-item-id]");
    const itemId = Number(row.dataset.itemId);
    const item = plan.items.find((entry) => entry.id === itemId);
    const previous = item.done;
    item.done = checkbox.checked;
    row.querySelector(".check-text").classList.toggle("done", item.done);
    renderProgress(calculateProgress());
    renderChecklistCountOnly();

    try {
      await api.patch(`/api/items/${itemId}/toggle`, {});
      await loadPlan();
    } catch (error) {
      item.done = previous;
      checkbox.checked = previous;
      row.querySelector(".check-text").classList.toggle("done", previous);
      renderProgress(plan.progress || 0);
      renderChecklistCountOnly();
    }
  }

  function renderChecklistCountOnly() {
    const done = (plan.items || []).filter((item) => item.done).length;
    document.querySelector("[data-item-count]").textContent = `${done} / ${(plan.items || []).length}`;
  }

  function calculateProgress() {
    if (!plan.items || !plan.items.length) {
      return 0;
    }
    const done = plan.items.filter((item) => item.done).length;
    return Math.round(done * 100 / plan.items.length);
  }

  function renderProgress(progress) {
    const ring = document.querySelector("[data-progress-ring]");
    const text = document.querySelector("[data-progress-text]");
    ring.style.strokeDasharray = `${ringLength}`;
    ring.style.strokeDashoffset = `${ringLength * (1 - Number(progress || 0) / 100)}`;
    text.textContent = `${Number(progress || 0)}%`;
  }

  function renderMeta() {
    document.querySelector("[data-meta-category]").textContent = plan.category || "未分类";
    document.querySelector("[data-meta-priority]").textContent = api.priorityLabel(plan.priority);
    document.querySelector("[data-meta-due]").textContent = api.formatDate(plan.due_date);
    document.querySelector("[data-meta-created]").textContent = api.formatDateTime(plan.created_at);
  }

  function renderLogs() {
    const list = document.querySelector("[data-log-list]");
    const logs = plan.logs || [];
    list.innerHTML = logs.length ? logs.map((log) => `
      <div class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-text">${api.escapeHtml(log.detail || log.action)}</div>
        <div class="timeline-time">${relativeTime(log.created_at)}</div>
      </div>
    `).join("") : `<div class="muted">暂无记录</div>`;
  }

  function bindActions() {
    document.querySelector("[data-plan-title]").addEventListener("click", startTitleEdit);
    document.querySelector("[data-description]").addEventListener("click", startDescriptionEdit);
    document.querySelector("[data-new-item]").addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      const content = event.target.value.trim();
      if (!content) {
        return;
      }
      await api.post(`/api/plans/${planId}/items`, { content });
      event.target.value = "";
      await loadPlan();
    });
    document.querySelector("[data-mark-done]").addEventListener("click", async () => {
      await api.patch(`/api/plans/${planId}/status`, { status: "DONE" });
      await loadPlan();
    });
    document.querySelector("[data-delete-plan]").addEventListener("click", openDeleteModal);
    bindDeleteModal();
  }

  function startTitleEdit() {
    const titleEl = document.querySelector("[data-plan-title]");
    if (titleEl.querySelector("input")) {
      return;
    }
    const previous = plan.title;
    const input = document.createElement("input");
    input.className = "inline-title-input";
    input.value = previous;
    titleEl.textContent = "";
    titleEl.appendChild(input);
    input.focus();
    input.select();

    let saving = false;
    const save = async () => {
      if (saving) {
        return;
      }
      saving = true;
      const title = input.value.trim();
      if (!title || title === previous) {
        titleEl.textContent = previous;
        saving = false;
        return;
      }
      await api.put(`/api/plans/${planId}`, { title });
      await loadPlan();
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        titleEl.textContent = previous;
      }
    });
  }

  function startDescriptionEdit() {
    const box = document.querySelector("[data-description]");
    if (box.querySelector("textarea")) {
      return;
    }
    const previous = plan.description || "";
    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.value = previous;
    box.textContent = "";
    box.classList.remove("empty");
    box.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener("blur", async () => {
      const description = textarea.value.trim();
      if (description !== previous) {
        await api.put(`/api/plans/${planId}`, { description });
      }
      await loadPlan();
    });
  }

  function bindDeleteModal() {
    const modal = document.querySelector("[data-delete-modal]");
    modal.querySelector("[data-modal-cancel]").addEventListener("click", closeDeleteModal);
    modal.querySelector("[data-modal-confirm]").addEventListener("click", async () => {
      await api.delete(`/api/plans/${planId}`);
      location.href = "plans.html";
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeDeleteModal();
      }
    });
  }

  function openDeleteModal() {
    document.querySelector("[data-delete-modal]").classList.add("show");
  }

  function closeDeleteModal() {
    document.querySelector("[data-delete-modal]").classList.remove("show");
  }

  function relativeTime(value) {
    const time = new Date(value).getTime();
    const diff = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diff < 60) {
      return "刚刚";
    }
    if (diff < 3600) {
      return `${Math.floor(diff / 60)}分钟前`;
    }
    if (diff < 86400) {
      return `${Math.floor(diff / 3600)}小时前`;
    }
    return api.formatDate(value);
  }
})();
