(function () {
  const API_BASE = window.location.origin;
  const TOKEN_KEY = "studyflow_token";
  const USERNAME_KEY = "studyflow_username";
  const ROLE_KEY = "studyflow_role";

  async function request(path, options = {}) {
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
