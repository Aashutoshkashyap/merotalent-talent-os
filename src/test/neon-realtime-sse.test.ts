import { describe, expect, it } from "vitest";
import { NeonRealtimeService } from "@/lib/neon/neon-realtime";

describe("Neon Realtime Server-Sent Events (SSE) Engine (Phase 9)", () => {
  it("delivers user-scoped notification events accurately without leaking to other users", () => {
    const realtime = new NeonRealtimeService();
    const userAEvents: any[] = [];
    const userBEvents: any[] = [];

    const unsubA = realtime.subscribe("notifications:user_A", (e) => userAEvents.push(e));
    const unsubB = realtime.subscribe("notifications:user_B", (e) => userBEvents.push(e));

    // Publish to User A
    realtime.publish("notifications:user_A", "NEW_NOTIFICATION", {
      id: "notif_1",
      title: "Session Confirmed",
    });

    expect(userAEvents.length).toBe(1);
    expect(userAEvents[0].payload.title).toBe("Session Confirmed");
    expect(userBEvents.length).toBe(0); // USER B RECEIVED ZERO LEAKED EVENTS

    unsubA();
    unsubB();
  });

  it("recovers missed events after temporary network disconnection", () => {
    const realtime = new NeonRealtimeService();
    const pastTimestamp = new Date(Date.now() - 5000).toISOString();

    realtime.publish("notifications:user_A", "NEW_NOTIFICATION", {
      id: "notif_2",
      title: "Payment Verified",
    });

    const missed = realtime.getEventsSince("notifications:user_A", pastTimestamp);
    expect(missed.length).toBeGreaterThanOrEqual(1);
    expect(missed[0].payload.title).toBe("Payment Verified");
  });
});
