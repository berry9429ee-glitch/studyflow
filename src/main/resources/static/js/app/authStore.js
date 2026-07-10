const TOKEN_KEY = "studyflow_token";
const USERNAME_KEY = "studyflow_username";
const ROLE_KEY = "studyflow_role";

export const authStore = {
  tokenKey: TOKEN_KEY,

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  isSignedIn() {
    return Boolean(this.getToken());
  },

  getUserSnapshot() {
    return {
      username: localStorage.getItem(USERNAME_KEY) || "",
      role: localStorage.getItem(ROLE_KEY) || ""
    };
  },

  saveAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.token || "");
    localStorage.setItem(USERNAME_KEY, data.username || "");
    localStorage.setItem(ROLE_KEY, data.role || "");
    window.dispatchEvent(new CustomEvent("studyflow:auth", { detail: { signedIn: true } }));
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);
    window.dispatchEvent(new CustomEvent("studyflow:auth", { detail: { signedIn: false } }));
  },

  logout() {
    this.clearAuth();
  }
};
