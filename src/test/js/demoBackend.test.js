import test from "node:test";
import assert from "node:assert/strict";

import { createDemoBackend } from "../../main/resources/static/js/app/demoBackend.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

test("demo backend supports the public demo flow", async () => {
  const backend = createDemoBackend();

  await assert.rejects(
    backend.request("/api/plans"),
    (error) => error.status === 401
  );

  const auth = await backend.request("/api/auth/login", {
    method: "POST",
    body: { username: "demo", password: "user123" }
  });
  localStorage.setItem("studyflow_token", auth.token);

  const initial = await backend.request("/api/plans?page=1&size=50");
  assert.equal(initial.total, 5);

  const created = await backend.request("/api/plans", {
    method: "POST",
    body: {
      title: "学习复盘",
      category: "效率",
      priority: 3,
      items: ["整理项目介绍", "练习缓存追问"]
    }
  });
  assert.equal(created.status, "TODO");

  const detail = await backend.request(`/api/plans/${created.id}`);
  assert.equal(detail.items.length, 2);

  await backend.request(`/api/items/${detail.items[0].id}/toggle`, { method: "PATCH", body: {} });
  const updated = await backend.request(`/api/plans/${created.id}`);
  assert.equal(updated.progress, 50);
  assert.equal(updated.status, "IN_PROGRESS");

  const stats = await backend.request("/api/dashboard/stats");
  assert.equal(stats.total_plans, 6);
});
