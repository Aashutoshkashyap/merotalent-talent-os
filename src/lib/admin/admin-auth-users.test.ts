import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  buildMergedAuthMetadata,
  parseAuthUserListQuery,
  parseDeleteAuthUserInput,
  parseInviteAuthUserInput,
  parsePatchAuthUserInput,
  sanitizeAuthUser,
} from "./admin-auth-users";
import { AdminResourceValidationError } from "./admin-resource-service";

const userId = "11111111-1111-4111-8111-111111111111";

describe("admin Auth user payload validation", () => {
  it("normalizes supported public role names to the existing app roles", () => {
    expect(
      parseInviteAuthUserInput({
        email: "  PERSON@Example.com ",
        role: "college",
        metadata: { full_name: "College Owner" },
      }),
    ).toEqual({
      email: "person@example.com",
      role: "institution",
      metadata: { fullName: "College Owner" },
    });
  });

  it("never accepts a password or arbitrary authorization metadata", () => {
    expect(() =>
      parseInviteAuthUserInput({
        email: "person@example.com",
        role: "talent",
        password: "should-never-be-accepted",
      }),
    ).toThrowError(/invalid/i);

    expect(() =>
      parsePatchAuthUserInput({
        action: "update_identity",
        app_metadata: { role: "admin" },
      }),
    ).toThrowError(/invalid/i);
  });

  it("rejects direct admin email replacement because it bypasses verification", () => {
    try {
      parsePatchAuthUserInput({
        action: "update_identity",
        email: "new@example.com",
        email_confirmation: "new@example.com",
      });
      throw new Error("Expected email replacement validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(AdminResourceValidationError);
      expect((error as AdminResourceValidationError).fields.email[0]).toMatch(
        /verification flow/i,
      );
    }
  });

  it("caps pagination and rejects unrecognized list parameters", () => {
    expect(parseAuthUserListQuery(new URLSearchParams("page=2&page_size=100"))).toEqual({
      page: 2,
      pageSize: 100,
    });
    expect(() =>
      parseAuthUserListQuery(new URLSearchParams("page_size=101")),
    ).toThrowError(/invalid/i);
    expect(() =>
      parseAuthUserListQuery(new URLSearchParams("page=10001")),
    ).toThrowError(/invalid/i);
    expect(() =>
      parseAuthUserListQuery(new URLSearchParams("include_secrets=true")),
    ).toThrowError(/invalid/i);
  });

  it("defaults to profile soft deletion and gates hard deletion by user ID", () => {
    expect(parseDeleteAuthUserInput(undefined, userId)).toEqual({
      action: "soft_delete",
    });
    expect(() =>
      parseDeleteAuthUserInput(
        { action: "delete_auth_user", confirmation: "DELETE" },
        userId,
      ),
    ).toThrowError(/invalid/i);
    expect(
      parseDeleteAuthUserInput(
        { action: "delete_auth_user", confirmation: `DELETE ${userId}` },
        userId,
      ),
    ).toEqual({
      action: "delete_auth_user",
      confirmation: `DELETE ${userId}`,
    });
  });
});

describe("admin Auth user response sanitization", () => {
  it("returns an allowlisted projection without tokens, identities, phone, or app metadata", () => {
    const rawUser = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "person@example.com",
      phone: "+9779800000000",
      app_metadata: { provider: "email", secret_claim: "do-not-return" },
      user_metadata: {
        full_name: "Metadata Name",
        avatar_url: "https://cdn.example.com/avatar.png",
        private_note: "do-not-return",
      },
      identities: [{ identity_data: { access_token: "do-not-return" } }],
      factors: [{ id: "factor-id", factor_type: "totp", status: "verified" }],
      created_at: "2026-08-06T00:00:00.000Z",
      updated_at: "2026-08-06T01:00:00.000Z",
      email_confirmed_at: "2026-08-06T00:30:00.000Z",
      banned_until: "2126-08-06T00:00:00.000Z",
    } as unknown as User;

    const result = sanitizeAuthUser(
      rawUser,
      {
        user_id: userId,
        account_status: "active",
        deleted_at: null,
        full_name: "Profile Name",
        avatar_url: null,
      },
      ["talent", "not-a-role", "talent"],
      Date.parse("2026-08-06T02:00:00.000Z"),
    );

    expect(result).toMatchObject({
      id: userId,
      email: "person@example.com",
      emailVerified: true,
      banned: true,
      roles: ["talent"],
      profile: {
        accountStatus: "active",
        metadata: {
          fullName: "Profile Name",
          avatarUrl: "https://cdn.example.com/avatar.png",
        },
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret_claim");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("private_note");
    expect(serialized).not.toContain("9800000000");
    expect(serialized).not.toContain("factor-id");
  });

  it("preserves unrelated non-authorization user metadata when applying safe fields", () => {
    expect(
      buildMergedAuthMetadata(
        { account_type: "mentor", onboarding_step: 2, constructor: "drop" },
        { fullName: "Updated Name", avatarUrl: null },
      ),
    ).toEqual({
      account_type: "mentor",
      onboarding_step: 2,
      full_name: "Updated Name",
      avatar_url: null,
    });
  });
});
