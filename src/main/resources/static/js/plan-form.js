(function () {
  const api = window.StudyFlowApi;
  const params = new URLSearchParams(location.search);
  const planId = params.get("id");
  let priority = 2;

  document.addEventListener("DOMContentLoaded", async () => {
    if (!api.requireAuth()) {
      return;
    }
    await api.initShell(planId ? "plans" : "new-plan");
    bindForm();
    bindPriority();
    bindTasks();
    if (planId) {
      await loadPlan();
    } else {
      addTaskRow("");
    }
    api.renderIcons();
  });

  async function loadPlan() {
    const plan = await api.get(`/api/plans/${planId}`);
    document.title = "编辑计划 - StudyFlow";
    document.querySelector("[data-form-title]").textContent = "编辑计划";
    document.getElementById("title").value = plan.title || "";
    document.getElementById("category").value = plan.category || "";
    document.getElementById("description").value = plan.description || "";
    document.getElementById("due-date").value = plan.due_date || "";
    document.querySelector("[data-cancel-link]").href = `plan-detail.html?id=${planId}`;
    setPriority(plan.priority || 2);
    const taskList = document.querySelector("[data-task-list]");
    taskList.innerHTML = "";
    (plan.items || []).forEach((item) => addTaskRow(item.content));
    if (!plan.items || !plan.items.length) {
      addTaskRow("");
    }
  }

  function bindForm() {
    const form = document.getElementById("plan-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorEl = document.querySelector("[data-form-error]");
      errorEl.textContent = "";
      const title = document.getElementById("title").value.trim();
      if (!title) {
        errorEl.textContent = "计划标题不能为空";
        return;
      }
      const payload = {
        title,
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value.trim(),
        priority,
        due_date: document.getElementById("due-date").value || null,
        items: collectTasks()
      };

      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      try {
        const saved = planId
          ? await api.put(`/api/plans/${planId}`, payload)
          : await api.post("/api/plans", payload);
        location.href = `plan-detail.html?id=${saved.id}`;
      } catch (error) {
        errorEl.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function bindPriority() {
    document.querySelector("[data-priority-group]").addEventListener("click", (event) => {
      const button = event.target.closest("[data-priority]");
      if (!button) {
        return;
      }
      setPriority(Number(button.dataset.priority));
    });
  }

  function setPriority(value) {
    priority = value;
    document.querySelectorAll("[data-priority]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.priority) === priority);
    });
  }

  function bindTasks() {
    document.querySelector("[data-add-task]").addEventListener("click", () => {
      addTaskRow("");
      api.renderIcons();
    });
    document.querySelector("[data-task-list]").addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-task]");
      if (!remove) {
        return;
      }
      const rows = document.querySelectorAll(".task-row");
      if (rows.length === 1) {
        rows[0].querySelector("input").value = "";
        return;
      }
      remove.closest(".task-row").remove();
    });
  }

  function addTaskRow(value) {
    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `
      <input class="input" value="${api.escapeHtml(value)}" maxlength="200" placeholder="任务内容">
      <button class="icon-button" data-remove-task type="button" aria-label="删除任务"><i data-lucide="trash-2"></i></button>
    `;
    document.querySelector("[data-task-list]").appendChild(row);
    row.classList.add("reveal-row");
    row.querySelector("input").focus();
  }

  function collectTasks() {
    return Array.from(document.querySelectorAll("[data-task-list] input"))
      .map((input) => input.value.trim())
      .filter(Boolean);
  }
})();
