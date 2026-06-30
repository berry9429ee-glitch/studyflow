(function () {
  const api = window.StudyFlowApi;
  const state = {
    status: "",
    category: "",
    keyword: "",
    page: 1,
    size: 10,
    pendingDeleteId: null
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (!api.requireAuth()) {
      return;
    }
    await api.initShell("plans");
    readParams();
    bindFilters();
    bindDeleteModal();
    await loadPlans();
    api.renderIcons();
  });

  function readParams() {
    const params = new URLSearchParams(location.search);
    state.status = params.get("status") || "";
    state.category = params.get("category") || "";
    state.keyword = params.get("keyword") || "";
    document.getElementById("category-filter").value = state.category;
    document.getElementById("keyword-search").value = state.keyword;
    updateActiveTab();
  }

  function bindFilters() {
    document.querySelector("[data-status-tabs]").addEventListener("click", async (event) => {
      const tab = event.target.closest(".tab");
      if (!tab) {
        return;
      }
      state.status = tab.dataset.status;
      state.page = 1;
      updateActiveTab();
      updateUrl();
      await loadPlans();
    });

    document.getElementById("category-filter").addEventListener("change", async (event) => {
      state.category = event.target.value;
      state.page = 1;
      updateUrl();
      await loadPlans();
    });

    document.getElementById("keyword-search").addEventListener("input", api.debounce(async (event) => {
      state.keyword = event.target.value.trim();
      state.page = 1;
      updateUrl();
      await loadPlans();
    }, 300));
  }

  async function loadPlans() {
    const params = new URLSearchParams({
      page: String(state.page),
      size: String(state.size)
    });
    if (state.status) {
      params.set("status", state.status);
    }
    if (state.category) {
      params.set("category", state.category);
    }
    if (state.keyword) {
      params.set("keyword", state.keyword);
    }
    const page = await api.get(`/api/plans?${params.toString()}`);
    renderPlans(page.list || []);
  }

  function renderPlans(plans) {
    const tbody = document.querySelector("[data-plan-list]");
    const empty = document.querySelector("[data-empty-state]");
    tbody.innerHTML = plans.map((plan) => `
      <tr class="clickable-row" data-id="${plan.id}">
        <td><input type="checkbox" aria-label="选择计划"></td>
        <td>${api.escapeHtml(plan.title)}</td>
        <td class="muted">${api.escapeHtml(plan.category || "未分类")}</td>
        <td>${api.priorityChip(plan.priority)}</td>
        <td class="muted">${api.formatDate(plan.due_date)}</td>
        <td>${api.progressLine(plan.progress)}</td>
        <td>${api.statusChip(plan.status)}</td>
        <td>
          <div class="table-actions">
            <a class="text-link" href="plan-detail.html?id=${plan.id}" data-action="view">查看</a>
            <a class="text-link" href="plan-form.html?id=${plan.id}" data-action="edit">编辑</a>
            <button class="text-link danger" data-action="delete" data-id="${plan.id}" type="button">删除</button>
          </div>
        </td>
      </tr>
    `).join("");
    empty.hidden = plans.length > 0;
    tbody.closest(".table-wrap").hidden = plans.length === 0;

    tbody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest("a, button, input")) {
          return;
        }
        location.href = `plan-detail.html?id=${row.dataset.id}`;
      });
    });

    tbody.querySelectorAll("[data-action='delete']").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.pendingDeleteId = button.dataset.id;
        openDeleteModal();
      });
    });
    api.revealChildren(tbody);
    api.renderIcons();
  }

  function updateActiveTab() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.status === state.status);
    });
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.status) {
      params.set("status", state.status);
    }
    if (state.category) {
      params.set("category", state.category);
    }
    if (state.keyword) {
      params.set("keyword", state.keyword);
    }
    history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}`);
  }

  function bindDeleteModal() {
    const modal = document.querySelector("[data-delete-modal]");
    modal.querySelector("[data-modal-cancel]").addEventListener("click", closeDeleteModal);
    modal.querySelector("[data-modal-confirm]").addEventListener("click", async () => {
      if (!state.pendingDeleteId) {
        return;
      }
      await api.delete(`/api/plans/${state.pendingDeleteId}`);
      closeDeleteModal();
      await loadPlans();
      api.showToast("计划已删除");
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
    state.pendingDeleteId = null;
    document.querySelector("[data-delete-modal]").classList.remove("show");
  }
})();
