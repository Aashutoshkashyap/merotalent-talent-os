import { describe, expect, it } from "vitest";
import { accessPlanCovers, accessValidityLabel, temporaryAccessOffers } from "@/lib/payments/access-plans";
import { configureTemporaryAccessOffers } from "@/lib/server/neon-test-access-offers";
import type { NeonActor } from "@/lib/server/neon-authorization";

describe("Temporary module offers using existing packages", () => {
  it("has an exact bundle for each selection, charging per module with a 24-hour duration", () => {
    const offers = temporaryAccessOffers();
    expect(offers).toHaveLength(15);
    expect(new Set(offers.map(offer => offer.code)).size).toBe(15);
    for (const offer of offers) {
      expect(offer.price).toBe(offer.module_scope.length * 10);
      expect(offer.duration_days).toBe(1);
      expect(offer.features).toMatchObject({ temporary_test: true, exact_module_scope: true });
      expect(accessPlanCovers(offer, offer.module_scope)).toBe(true);
      expect(offers.filter(candidate => accessPlanCovers(candidate, offer.module_scope))).toHaveLength(1);
    }
    expect(accessValidityLabel(1)).toBe("24 hours");
    expect(accessValidityLabel(90)).toBe("90 days");
  });
  it("keeps historical bundle compatibility unchanged and rejects empty selections", () => {
    expect(accessPlanCovers({ module_scope: ["college", "jobs"] }, ["college"])).toBe(true);
    expect(accessPlanCovers({ module_scope: ["college"] }, [])).toBe(false);
    expect(accessPlanCovers({ module_scope: ["college"] }, ["jobs"])).toBe(false);
  });
  it("does not allow ordinary users to configure prices", async () => {
    await expect(configureTemporaryAccessOffers({ platformAdmin: false } as NeonActor)).rejects.toMatchObject({ status: 403 });
  });
});
