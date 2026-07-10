import {
  dangerButton,
  debounce,
  emptyState,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatDateTime,
  glassPanel,
  normalizePlan,
  normalizePlanPage,
  primaryButton,
  priorityLabel,
  progressBar,
  softButton,
  statusLabel,
  statusTone
} from "./ui.js";

export function createPlansFeature(api) {
  return {
    async load(filters) {
      const params = new URLSearchParams({ page: "1", size: "50" });
      if (filters.status) {
        params.set("status", filters.status);
      }
      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.keyword) {
        params.set("keyword", filters.keyword);
      }
      return normalizePlanPage(await api.get(`/api/plans?${params.toString()}`));
    },

    async detail(id) {
      return normalizePlan(await api.get(`/api/plans/${id}`), true);
    },

    async save(editor) {
      const payload = {
        title: editor.title,
        description: editor.description,
        category: editor.category,
        priority: editor.priority,
        due_date: editor.due_date || null,
        items: editor.items
      };
      if (editor.id) {
        return normalizePlan(await api.put(`/api/plans/${editor.id}`, payload));
      }
      return normalizePlan(await api.post("/api/plans", payload));
    },

    deletePlan(id) {
      return api.delete(`/api/plans/${id}`);
    },

    setStatus(id, status) {
      return api.patch(`/api/plans/${id}/status`, { status });
    },

    addItem(planId, content) {
      return api.post(`/api/plans/${planId}/items`, { content });
    },

    toggleItem(id) {
      return api.patch(`/api/items/${id}/toggle`, {});
    },

    deleteItem(id) {
      return api.delete(`/api/items/${id}`);
    }
  };
}

export function renderPlansSection(state) {
  const categories = Array.from(new Set(state.allPlans.map((plan) => plan.category).filter(Boolean))).sort();
  return `
    <section class="snap-start scroll-mt-32" id="plans">
      <div class="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-label-lg text-label-lg uppercase tracking-widest text-primary mb-3">Plan Workspace</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">计划工作区</h2>
          <p class="font-body-lg text-body-lg text-on-surface-variant tracking-wide">筛选、查看详情、勾选任务、改状态和删除都在本页完成。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="${softButton}" type="button" data-refresh>
            <span class="material-symbols-outlined text-[18px]">sync</span>刷新
          </button>
          <button class="${primaryButton}" type="button" data-new-plan>
            <span class="material-symbols-outlined text-[18px]">add</span>新建
          </button>
        </div>
      </div>

      <div class="${glassPanel} mb-6 p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2" data-status-tabs>
            ${renderStatusTab("", "全部", state.filters.status)}
            ${renderStatusTab("TODO", "待开始", state.filters.status)}
            ${renderStatusTab("IN_PROGRESS", "进行中", state.filters.status)}
            ${renderStatusTab("DONE", "已完成", state.filters.status)}
          </div>
          <div class="grid gap-3 sm:grid-cols-[180px_260px]">
            <select class="h-11 rounded-xl border border-white/40 bg-white/50 px-3 text-[14px] text-on-surface-variant shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-category-filter>
              <option value="">全部分类</option>
              ${categories.map((category) => `<option value="${escapeAttr(category)}" ${state.filters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
            </select>
            <label class="relative block">
              <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input class="h-11 w-full rounded-xl border border-white/40 bg-white/50 pl-10 pr-3 text-[14px] text-on-surface shadow-sm backdrop-blur-xl placeholder:text-on-surface-variant focus:border-primary focus:ring-primary" data-keyword-search placeholder="搜索标题、分类或描述" value="${escapeAttr(state.filters.keyword)}">
            </label>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="flex flex-col gap-4" data-plan-list>${renderPlanList(state)}</div>
        <div class="${glassPanel} min-h-[520px] p-8" data-plan-detail>${renderPlanDetail(state)}</div>
      </div>
    </section>
  `;
}

export function renderEditorSection(state) {
  const editor = state.editor;
  return `
    <section class="snap-start scroll-mt-32" id="plan-editor">
      <div class="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-label-lg text-label-lg uppercase tracking-widest text-primary mb-3">Compose</p>
          <h2 class="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">${editor.id ? "编辑计划" : "新建计划"}</h2>
          <p class="font-body-lg text-body-lg text-on-surface-variant tracking-wide">旧的新建/编辑能力已经收进这个单页表单，保存后自动回到计划区。</p>
        </div>
        <button class="${softButton}" type="button" data-editor-reset>
          <span class="material-symbols-outlined text-[18px]">restart_alt</span>清空
        </button>
      </div>

      <form class="${glassPanel} p-8" data-editor-form novalidate>
        <div class="grid gap-5 md:grid-cols-2">
          <label class="flex flex-col gap-2 md:col-span-2">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">计划标题</span>
            <input class="h-12 rounded-xl border border-white/40 bg-white/55 px-4 text-[15px] text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-editor-title maxlength="100" required value="${escapeAttr(editor.title)}">
          </label>
          <label class="flex flex-col gap-2">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">分类</span>
            <input class="h-12 rounded-xl border border-white/40 bg-white/55 px-4 text-[15px] text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-editor-category list="bridge-category-suggestions" value="${escapeAttr(editor.category)}">
            <datalist id="bridge-category-suggestions">
              <option value="Java基础"></option>
              <option value="Spring"></option>
              <option value="数据库"></option>
              <option value="算法"></option>
              <option value="其他"></option>
            </datalist>
          </label>
          <label class="flex flex-col gap-2">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">截止日期</span>
            <input class="h-12 rounded-xl border border-white/40 bg-white/55 px-4 text-[15px] text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-editor-due type="date" value="${escapeAttr(editor.due_date)}">
          </label>
          <div class="flex flex-col gap-2">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">优先级</span>
            <div class="grid grid-cols-3 gap-2" data-priority-group>
              ${[1, 2, 3].map((value) => renderPriorityButton(value, editor.priority)).join("")}
            </div>
          </div>
          <label class="flex flex-col gap-2 md:col-span-2">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">描述</span>
            <textarea class="min-h-32 rounded-xl border border-white/40 bg-white/55 px-4 py-3 text-[15px] leading-relaxed text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-editor-description>${escapeHtml(editor.description)}</textarea>
          </label>
        </div>

        <div class="mt-7">
          <div class="mb-3 flex items-center justify-between">
            <span class="font-label-lg text-label-lg uppercase tracking-widest text-on-surface-variant">任务清单</span>
            <button class="${softButton} h-10 px-3 text-[13px]" type="button" data-add-editor-task>
              <span class="material-symbols-outlined text-[18px]">add</span>添加任务
            </button>
          </div>
          <div class="flex flex-col gap-3" data-editor-tasks>
            ${(editor.items.length ? editor.items : [""]).map(renderEditorTask).join("")}
          </div>
        </div>

        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-h-5 text-[14px] font-medium text-[#d93025]" data-editor-error></div>
          <div class="flex flex-wrap gap-2">
            <button class="${softButton}" type="button" data-editor-cancel>取消</button>
            <button class="${primaryButton}" type="submit">保存计划</button>
          </div>
        </div>
      </form>
    </section>
  `;
}

export function bindPlans(root, handlers) {
  root.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => handlers.setStatusFilter(button.dataset.status || ""));
  });
  root.querySelector("[data-category-filter]")?.addEventListener("change", (event) => handlers.setCategoryFilter(event.target.value));
  root.querySelector("[data-keyword-search]")?.addEventListener("input", debounce((event) => handlers.setKeyword(event.target.value.trim()), 280));
  root.querySelectorAll("[data-select-plan]").forEach((button) => {
    button.addEventListener("click", () => handlers.selectPlan(Number(button.dataset.selectPlan)));
  });
  root.querySelectorAll("[data-edit-plan]").forEach((button) => {
    button.addEventListener("click", () => handlers.editPlan(Number(button.dataset.editPlan)));
  });
  root.querySelectorAll("[data-delete-plan]").forEach((button) => {
    button.addEventListener("click", () => handlers.deletePlan(Number(button.dataset.deletePlan)));
  });
  root.querySelectorAll("[data-set-plan-status]").forEach((button) => {
    button.addEventListener("click", () => handlers.setPlanStatus(button.dataset.setPlanStatus));
  });
  root.querySelectorAll("[data-toggle-item]").forEach((button) => {
    button.addEventListener("click", () => handlers.toggleItem(Number(button.dataset.toggleItem)));
  });
  root.querySelectorAll("[data-delete-item]").forEach((button) => {
    button.addEventListener("click", () => handlers.deleteItem(Number(button.dataset.deleteItem)));
  });
  root.querySelector("[data-add-item-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("[data-new-item-content]");
    handlers.addItem(input.value.trim());
  });
}

export function bindEditor(root, handlers) {
  root.querySelectorAll("[data-priority]").forEach((button) => {
    button.addEventListener("click", () => handlers.setEditorPriority(Number(button.dataset.priority)));
  });
  root.querySelector("[data-add-editor-task]")?.addEventListener("click", () => {
    const list = root.querySelector("[data-editor-tasks]");
    list.insertAdjacentHTML("beforeend", renderEditorTask(""));
    attachRemoveTaskButton(list.lastElementChild?.querySelector("[data-remove-editor-task]"), root);
  });
  root.querySelectorAll("[data-remove-editor-task]").forEach((button) => {
    attachRemoveTaskButton(button, root);
  });
  root.querySelector("[data-editor-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.saveEditor(readEditor(root));
  });
}

function attachRemoveTaskButton(button, root) {
  if (!button || button.dataset.bound === "true") {
    return;
  }
  button.dataset.bound = "true";
  button.addEventListener("click", () => {
    const list = root.querySelector("[data-editor-tasks]");
    if (list.children.length <= 1) {
      list.querySelector("[data-editor-task]").value = "";
      return;
    }
    button.closest("[data-editor-task-row]")?.remove();
  });
}

export function readEditor(root) {
  return {
    title: root.querySelector("[data-editor-title]")?.value.trim() || "",
    category: root.querySelector("[data-editor-category]")?.value.trim() || "",
    due_date: root.querySelector("[data-editor-due]")?.value || "",
    description: root.querySelector("[data-editor-description]")?.value.trim() || "",
    items: Array.from(root.querySelectorAll("[data-editor-task]"))
      .map((input) => input.value.trim())
      .filter(Boolean)
  };
}

function renderStatusTab(value, label, current) {
  const active = current === value;
  return `<button class="rounded-xl px-4 py-2 text-[13px] font-semibold transition ${active ? "bg-[#1a73e8] text-white shadow-md shadow-[#1a73e8]/20" : "bg-white/35 text-on-surface-variant hover:bg-white/70"}" type="button" data-status="${value}">${label}</button>`;
}

function renderPlanList(state) {
  if (!state.signedIn) {
    return emptyState("登录后查看计划", "这里不会显示默认任务；登录后会读取当前用户自己的计划。", "account_circle", "去登录", "data-focus-login");
  }
  if (!state.plans.length) {
    return emptyState("没有匹配计划", "当前筛选下没有数据，可以清除筛选或创建新的计划。", "filter_alt_off", "新建计划", "data-new-plan");
  }
  return state.plans.map((plan) => {
    const selected = state.selectedPlan?.id === plan.id;
    return `
      <article class="${glassPanel} cursor-pointer p-5 transition hover:-translate-y-0.5 hover:bg-white/55 ${selected ? "ring-2 ring-[#1a73e8]/45" : ""}" data-select-plan="${plan.id}">
        <div class="mb-4 flex items-start justify-between gap-3">
          <span class="rounded-full px-3 py-1 text-[12px] font-bold ${statusTone(plan.status)}">${statusLabel(plan.status)}</span>
          <span class="text-[13px] font-semibold text-on-surface-variant">${priorityLabel(plan.priority)}</span>
        </div>
        <h3 class="font-title-lg text-title-lg text-on-surface tracking-tight">${escapeHtml(plan.title)}</h3>
        <p class="mt-2 line-clamp-2 text-[14px] leading-relaxed text-on-surface-variant">${escapeHtml(plan.description || "暂无描述")}</p>
        <div class="mt-5 flex items-center gap-3">
          ${progressBar(plan.progress)}
          <span class="w-12 text-right text-[13px] font-bold text-on-surface-variant">${Number(plan.progress || 0)}%</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-3 text-[13px] font-semibold text-on-surface-variant">
          <span>截止 ${formatDate(plan.due_date)}</span>
          <span>${escapeHtml(plan.category || "未分类")}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderPlanDetail(state) {
  const plan = state.selectedPlan;
  if (!state.signedIn) {
    return emptyState("登录后展开计划", "计划详情、任务勾选和编辑都会读取当前用户自己的数据。", "account_circle", "去登录", "data-focus-login");
  }
  if (!plan) {
    return emptyState("选择一个计划", "左侧计划会在这里展开，任务勾选和详情编辑都不离开本页。", "view_list");
  }
  return `
    <div class="flex flex-col gap-7">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div class="mb-3 flex flex-wrap gap-2">
            <span class="rounded-full px-3 py-1 text-[12px] font-bold ${statusTone(plan.status)}">${statusLabel(plan.status)}</span>
            <span class="rounded-full bg-white/50 px-3 py-1 text-[12px] font-bold text-on-surface-variant">${priorityLabel(plan.priority)}</span>
          </div>
          <h3 class="font-headline-md text-headline-md text-on-surface tracking-tight">${escapeHtml(plan.title)}</h3>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">${escapeHtml(plan.description || "暂无描述")}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="${softButton} h-10 px-3" type="button" data-edit-plan="${plan.id}">编辑</button>
          <button class="${softButton} h-10 px-3" type="button" data-set-plan-status="DONE">完成</button>
          <button class="${dangerButton}" type="button" data-delete-plan="${plan.id}">删除</button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-4">
        ${detailMeta("分类", plan.category || "未分类", "sell")}
        ${detailMeta("截止", formatDate(plan.due_date), "event")}
        ${detailMeta("进度", `${Number(plan.progress || 0)}%`, "progress_activity")}
        ${detailMeta("任务", `${(plan.items || []).filter((item) => item.done).length}/${(plan.items || []).length}`, "checklist")}
      </div>

      <div>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 class="font-title-lg text-title-lg text-on-surface tracking-tight">任务清单</h4>
          <div class="flex flex-wrap gap-2">
            <button class="${softButton} h-9 px-3 text-[12px]" type="button" data-set-plan-status="TODO">待开始</button>
            <button class="${softButton} h-9 px-3 text-[12px]" type="button" data-set-plan-status="IN_PROGRESS">进行中</button>
          </div>
        </div>
        <form class="mb-4 flex gap-2" data-add-item-form>
          <input class="h-11 flex-1 rounded-xl border border-white/40 bg-white/55 px-4 text-[14px] text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-new-item-content maxlength="200" placeholder="添加任务">
          <button class="${primaryButton} px-4" type="submit"><span class="material-symbols-outlined text-[18px]">add</span></button>
        </form>
        <div class="flex flex-col gap-3">
          ${(plan.items || []).length ? plan.items.map(renderTaskItem).join("") : `<div class="rounded-xl border border-dashed border-white/35 bg-white/25 p-4 text-center text-[14px] font-medium text-on-surface-variant">还没有任务</div>`}
        </div>
      </div>

      <div>
        <h4 class="mb-4 font-title-lg text-title-lg text-on-surface tracking-tight">最近动态</h4>
        <div class="flex flex-col gap-3">
          ${(plan.logs || []).length ? plan.logs.slice(0, 6).map((log) => `
            <div class="rounded-xl bg-white/30 px-4 py-3 text-[14px] text-on-surface-variant">
              <strong class="text-on-surface">${escapeHtml(log.action || "LOG")}</strong>
              <span class="ml-2">${escapeHtml(log.detail || "")}</span>
              <span class="ml-2 text-[12px] text-outline">${formatDateTime(log.created_at)}</span>
            </div>
          `).join("") : `<div class="rounded-xl border border-dashed border-white/35 bg-white/25 p-4 text-center text-[14px] font-medium text-on-surface-variant">暂无动态</div>`}
        </div>
      </div>
    </div>
  `;
}

function detailMeta(label, value, icon) {
  return `
    <div class="rounded-2xl border border-white/25 bg-white/35 p-4">
      <span class="material-symbols-outlined text-[20px] text-primary">${icon}</span>
      <p class="mt-2 text-[12px] font-bold uppercase tracking-widest text-on-surface-variant">${label}</p>
      <p class="mt-1 truncate text-[14px] font-semibold text-on-surface">${escapeHtml(value || "-")}</p>
    </div>
  `;
}

function renderTaskItem(item) {
  return `
    <article class="flex items-center gap-3 rounded-2xl bg-white/35 px-4 py-3">
      <button class="flex h-8 w-8 items-center justify-center rounded-full border ${item.done ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-outline bg-white/60 text-on-surface-variant"}" type="button" data-toggle-item="${item.id}" aria-label="切换任务状态">
        <span class="material-symbols-outlined text-[19px]">${item.done ? "check" : "radio_button_unchecked"}</span>
      </button>
      <span class="flex-1 text-[15px] font-medium ${item.done ? "text-on-surface-variant line-through" : "text-on-surface"}">${escapeHtml(item.content)}</span>
      <button class="text-on-surface-variant transition hover:text-[#d93025]" type="button" data-delete-item="${item.id}" aria-label="删除任务">
        <span class="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </article>
  `;
}

function renderPriorityButton(value, current) {
  const active = Number(current) === value;
  return `<button class="h-12 rounded-xl border px-3 text-[14px] font-semibold transition ${active ? "border-primary/50 bg-[#1a73e8] text-white shadow-md shadow-[#1a73e8]/20" : "border-white/40 bg-white/40 text-on-surface-variant hover:bg-white/70"}" type="button" data-priority="${value}">${priorityLabel(value).replace("优先级", "")}</button>`;
}

function renderEditorTask(value) {
  return `
    <div class="flex gap-2" data-editor-task-row>
      <input class="h-11 flex-1 rounded-xl border border-white/40 bg-white/55 px-4 text-[14px] text-on-surface shadow-sm backdrop-blur-xl focus:border-primary focus:ring-primary" data-editor-task maxlength="200" placeholder="任务内容" value="${escapeAttr(value)}">
      <button class="h-11 w-11 rounded-xl border border-white/40 bg-white/45 text-on-surface-variant transition hover:bg-white/80 hover:text-[#d93025]" type="button" data-remove-editor-task aria-label="删除任务">
        <span class="material-symbols-outlined text-[19px]">delete</span>
      </button>
    </div>
  `;
}
