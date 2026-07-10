import { authStore } from "./authStore.js";
import { createDemoBackend, isStaticDemoMode } from "./demoBackend.js";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.auth = status === 401;
  }
}

export function createApiClient({ onUnauthorized } = {}) {
  const demoBackend = isStaticDemoMode() ? createDemoBackend() : null;
  const configuredBase = document.querySelector('meta[name="studyflow-api-base"]')?.content?.trim();
  const apiBase = configuredBase ? configuredBase.replace(/\/$/, "") : window.location.origin;

  async function request(path, options = {}) {
    if (demoBackend) {
      try {
        return await demoBackend.request(path, options);
      } catch (error) {
        if (error.status === 401) {
          authStore.clearAuth();
          onUnauthorized?.();
        }
        throw error;
      }
    }

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const token = authStore.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    const status = response.status;

    if (status === 401 || payload?.code === 401) {
      authStore.clearAuth();
      onUnauthorized?.();
      throw new ApiError(payload?.message || "登录已过期，请重新登录", 401, payload);
    }

    if (!response.ok || (payload?.code && payload.code >= 400)) {
      throw new ApiError(payload?.message || `请求失败（HTTP ${status}）`, status, payload);
    }

    if (!payload) {
      throw new ApiError("接口未返回 JSON，请检查后端地址或部署配置", status, null);
    }

    return payload && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
  }

  return {
    mode: demoBackend ? "demo" : "api",
    apiBase,
    resetDemo: () => demoBackend?.reset(),
    request,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body = {}) => request(path, { method: "PATCH", body }),
    delete: (path) => request(path, { method: "DELETE" })
  };
}
