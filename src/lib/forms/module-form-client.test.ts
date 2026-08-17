import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ModuleFormClientError,
  submitAuthenticatedModuleForm,
} from "./module-form-client";

describe("module form client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits through the authenticated module API with an idempotency key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: "95920411-b7dd-48c7-95d4-a3fba9cd7f75", status: "submitted" },
          error: null,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    const values = {
      eventId: "a70c51ac-e25e-42fd-b596-a2972836ca9e",
      fullName: "Maya Rai",
      email: "maya@example.com",
      phone: "+977 9800000000",
      attendeeCount: 1,
      consent: true,
    };

    await expect(
      submitAuthenticatedModuleForm({
        accessToken: "user-access-token",
        idempotencyKey: "event-submit-1234",
        module: "event_registration",
        values,
      }),
    ).resolves.toMatchObject({ status: "submitted" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/submissions/event_registration",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer user-access-token",
          "Idempotency-Key": "event-submit-1234",
        }),
        body: JSON.stringify(values),
      }),
    );
  });

  it("preserves server field errors for the module form UI", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            message: "The submitted form is invalid.",
            fields: { phone: ["Enter a valid phone number"] },
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const promise = submitAuthenticatedModuleForm({
      accessToken: "user-access-token",
      idempotencyKey: "mentor-submit-1234",
      module: "mentor_booking",
      values: {},
    });

    await expect(promise).rejects.toMatchObject({
      name: "ModuleFormClientError",
      status: 422,
      code: "VALIDATION_FAILED",
      fields: { phone: ["Enter a valid phone number"] },
    } satisfies Partial<ModuleFormClientError>);
  });
});
