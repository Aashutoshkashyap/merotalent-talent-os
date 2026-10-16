import { beforeEach, describe, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({ query: vi.fn(), publicUrl: vi.fn() }));
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: io.query }));
vi.mock("@/lib/server/application-storage", () => ({ publicObjectUrl: io.publicUrl }));
import { GET } from "../../app/api/v1/advertisements/route";

beforeEach(() => { vi.clearAllMocks(); io.query.mockResolvedValue([]); io.publicUrl.mockResolvedValue("https://signed.test/banner"); });
describe("Neon public advertisement placement", () => {
  it("requires current active campaign dates and placement and resolves canonical public image paths", async () => {
    io.query.mockResolvedValue([{ id: "ad-one", title: "Campaign", image_url: "uploader/advertisement/ad-one/banner.png", destination_url: null, sponsor_name: "Sponsor" }]);
    const result = await GET(new Request("https://app.test/api/v1/advertisements?placement=college_listing"));
    expect(await result.json()).toMatchObject({ data: [{ image_url: "https://signed.test/banner" }] });
    expect(io.query.mock.calls[0][0]).toContain("status IN ('active','scheduled')");
    expect(io.query.mock.calls[0][0]).toContain("deleted_at IS NULL");
    expect(io.query.mock.calls[0][1][1]).toBe("college_listing");
    expect(io.publicUrl).toHaveBeenCalledWith("advertisement", "uploader/advertisement/ad-one/banner.png");
  });
  it("preserves imported public URLs and excludes invalid public object references", async () => {
    io.query.mockResolvedValue([{ id: "old", title: "Imported", image_url: "https://public.test/imported.png" },
      { id: "invalid", title: "Invalid", image_url: "../private" }]);
    io.publicUrl.mockRejectedValueOnce(new Error("Invalid path"));
    expect(await (await GET()).json()).toMatchObject({ data: [{ id: "old", image_url: "https://public.test/imported.png" }] });
    expect((await GET(new Request("https://app.test/api/v1/advertisements?placement=../../private"))).status).toBe(400);
  });
});
