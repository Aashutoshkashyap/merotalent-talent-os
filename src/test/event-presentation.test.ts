import { describe, expect, it, vi } from "vitest";
import { resolvePublicEventImages } from "@/lib/server/neon-event-presentation";
import { NeonEventsRepository } from "@/lib/server/neon-events";

describe("Event public media boundary", () => {
  it("signs canonical and imported public event images, never a private bucket", async () => {
    const sign = vi.fn(async (_module: string, path: string) => `https://signed.example/${path}`);
    const event = await resolvePublicEventImages({ cover_image_url: "events/cover.png", logo_url:
      "https://dtirpilgzlsfryucanlg.supabase.co/storage/v1/object/public/event-media/old/logo.png",
      gallery_urls: ["https://images.example/photo.jpg", "gallery/photo.webp"] }, sign);
    expect(event.cover_image_url).toBe("https://signed.example/events/cover.png");
    expect(event.logo_url).toBe("https://signed.example/old/logo.png");
    expect(event.gallery_urls).toEqual(["https://images.example/photo.jpg", "https://signed.example/gallery/photo.webp"]);
    expect(sign.mock.calls.every(call => call[0] === "event_cover")).toBe(true);
  });
  it("drops unsafe URLs and failed object resolution without breaking event details", async () => {
    const sign = vi.fn(async () => { throw new Error("missing"); });
    const result = await resolvePublicEventImages({ cover_image_url: "missing.png", logo_url: "http://images.example/no.png",
      gallery_urls: ["https://user:password@images.example/no.jpg", "javascript:alert(1)"] }, sign);
    expect(result).toMatchObject({ cover_image_url: null, logo_url: null, gallery_urls: [] });
  });
  it("returns no media for an unpublished or unowned record excluded by SQL", async () => {
    const query = vi.fn(async (_sql: string) => []);
    const repository = new NeonEventsRepository({ query } as never);
    expect(await repository.getPublicEvent("11111111-1111-4111-8111-111111111111")).toBeNull();
    expect(query.mock.calls[0][0]).toContain("approval_status = 'approved'");
  });
});
