import { describe, expect, it } from "vitest";
import { canTransitionJobApplication } from "@/lib/server/neon-jobs";

describe("Neon Jobs application transitions", () => {
  it("allows forward review and scheduling transitions", () => {
    expect(canTransitionJobApplication("submitted", "screening")).toBe(true);
    expect(canTransitionJobApplication("screening", "interview_scheduled")).toBe(true);
    expect(canTransitionJobApplication("offered", "confirmed")).toBe(true);
  });

  it("denies reopening terminal decisions or regressing to submitted", () => {
    expect(canTransitionJobApplication("confirmed", "screening")).toBe(false);
    expect(canTransitionJobApplication("rejected", "offered")).toBe(false);
    expect(canTransitionJobApplication("screening", "submitted")).toBe(false);
    expect(canTransitionJobApplication("unknown", "offered")).toBe(false);
  });
});
