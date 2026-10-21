import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { adminUserPageKey, loadAdminUserPage } from "./user-page-cache";

const clients: QueryClient[] = [];
function client() { const value = new QueryClient(); clients.push(value); return value; }
const page = { page: 1, pageSize: 25, search: "" };
afterEach(() => { clients.splice(0).forEach(value => value.clear()); });

describe("private user-list page cache", () => {
  it("reuses a fresh page on navigation without another network request", async () => {
    const cache = client(); const load = vi.fn(async () => ["user"]);
    await loadAdminUserPage(cache, "admin-a", page, load);
    expect(await loadAdminUserPage(cache, "admin-a", page, load)).toEqual(["user"]);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("deduplicates concurrent reads", async () => {
    const cache = client(); const load = vi.fn(async () => ["user"]);
    await Promise.all([loadAdminUserPage(cache, "admin-a", page, load),
      loadAdminUserPage(cache, "admin-a", page, load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("does not share pages between accounts, searches, or page numbers", async () => {
    const cache = client(); const load = vi.fn(async () => []);
    await loadAdminUserPage(cache, "admin-a", page, load);
    await loadAdminUserPage(cache, "admin-b", page, load);
    await loadAdminUserPage(cache, "admin-a", { ...page, search: "college" }, load);
    await loadAdminUserPage(cache, "admin-a", { ...page, page: 2 }, load);
    expect(load).toHaveBeenCalledTimes(4);
  });
  it("refreshes expired pages", async () => {
    const cache = client(); const load = vi.fn(async () => []);
    cache.setQueryData(adminUserPageKey("admin-a", 1, 25, ""), ["old"], { updatedAt: Date.now() - 31_000 });
    expect(await loadAdminUserPage(cache, "admin-a", page, load)).toEqual([]);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("forces fresh results after a mutation or explicit Refresh", async () => {
    const cache = client(); const load = vi.fn(async () => ["updated"]);
    cache.setQueryData(adminUserPageKey("admin-a", 1, 25, ""), ["old"]);
    expect(await loadAdminUserPage(cache, "admin-a", page, load, true)).toEqual(["updated"]);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("does not retry authorization errors or save a successful result", async () => {
    const cache = client(); const load = vi.fn(async () => { throw new Error("ADMIN_REQUIRED"); });
    await expect(loadAdminUserPage(cache, "admin-a", page, load)).rejects.toThrow("ADMIN_REQUIRED");
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.getQueryData(adminUserPageKey("admin-a", 1, 25, ""))).toBeUndefined();
  });
});
