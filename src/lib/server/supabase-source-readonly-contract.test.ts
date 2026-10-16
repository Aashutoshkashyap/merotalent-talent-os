import { describe, expect, it, vi } from "vitest";
import { parseReadOnlySourceConfig, verifyReadOnlySource } from "../../../scripts/require-supabase-source-readonly.mjs";

const host = "aws-0-ap-south-1.pooler.supabase.com";
const role = "merotalent_inventory_reader";
const valid = `postgresql://${role}.dtirpilgzlsfryucanlg:secret@${host}:5432/postgres`;

describe("Supabase production inventory source gate", () => {
  it("accepts only the exact supplied pooler host and dedicated role", () => {
    const config = parseReadOnlySourceConfig(valid, host, role);
    expect(config).toMatchObject({ host, port: 5432, database: "postgres", ssl: { rejectUnauthorized: true } });
    expect(config.password).toBe("secret");
  });

  it.each([
    [valid, undefined, role],
    [valid, "aws-1-ap-south-1.pooler.supabase.com", role],
    [valid.replace("5432", "6543"), host, role],
    [valid.replace("pooler.supabase.com", "example.com"), host, role],
    [valid.replace(role, "postgres"), host, "postgres"],
    [valid.replace("/postgres", "/other"), host, role],
    [`${valid}?sslmode=disable`, host, role],
  ])("fails closed before connecting", (url, expectedHost, expectedRole) => {
    expect(() => parseReadOnlySourceConfig(url, expectedHost, expectedRole)).toThrow();
  });

  it("rejects a role with mutation privileges despite a read-only transaction", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{
      database_name: "postgres", role_name: role, transaction_read_only: "on",
      rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false,
      rolbypassrls: false, can_create_database_objects: false,
      can_create_schema_objects: false, can_mutate_tables: true,
      can_mutate_sequences: false, can_execute_security_definer: false,
      users_exist: true, identities_exist: true, can_read_users: true, can_read_identities: true,
    }] });
    await expect(verifyReadOnlySource({ query }, role)).rejects.toThrow("read-only privileges");
  });
});
