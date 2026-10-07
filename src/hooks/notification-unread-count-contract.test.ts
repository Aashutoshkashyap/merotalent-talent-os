import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("notification unread count", () => {
  it("uses an exact recipient-scoped count instead of the rendered page length", () => {
    const hook = readFileSync(resolve(process.cwd(), "src/hooks/useNotifications.ts"), "utf8");
    expect(hook).toContain('.select("id", { count: "exact", head: true })');
    expect(hook).toContain('.eq("recipient_id", user.id)');
    expect(hook).toContain('.eq("is_read", false)');
    expect(hook).toContain("setUnreadCount(Math.max(0, count ?? 0))");
  });

  it("reuses the authenticated notification hook in the Admin header", () => {
    const header = readFileSync(resolve(process.cwd(), "src/components/admin/AdminHeader.tsx"), "utf8");
    expect(header).toContain("const { unreadCount } = useNotifications()");
    expect(header).not.toContain('from("notifications")');
  });
});
