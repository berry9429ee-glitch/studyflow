(function () {
  const api = window.StudyFlowApi;

  document.addEventListener("DOMContentLoaded", () => {
    api.initAmbientMotion();
    bindLogin();
    bindRegister();
    bindLogout();
    api.renderIcons();
  });

  function bindLogin() {
    const form = document.querySelector("#login-form");
    if (!form) {
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorEl = document.querySelector("[data-auth-error]");
      errorEl.textContent = "";
      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      try {
        const data = await api.post("/api/auth/login", {
          username: form.username.value.trim(),
          password: form.password.value
        });
        api.saveAuth(data);
        location.href = "dashboard.html";
      } catch (error) {
        errorEl.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function bindRegister() {
    const form = document.querySelector("#register-form");
    if (!form) {
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorEl = document.querySelector("[data-auth-error]");
      errorEl.textContent = "";
      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      try {
        const payload = {
          username: form.username.value.trim(),
          password: form.password.value
        };
        if (form.email.value.trim()) {
          payload.email = form.email.value.trim();
        }
        const data = await api.post("/api/auth/register", payload);
        api.saveAuth(data);
        location.href = "dashboard.html";
      } catch (error) {
        errorEl.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", api.logout);
    });
  }
})();
