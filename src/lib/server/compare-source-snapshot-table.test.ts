import { describe, expect, it } from "vitest";
import { compareSourceSnapshotTable, isAuditedStagingProviderConfiguration } from "../../../scripts/compare-source-snapshot-table.mjs";
import { parseLosslessSnapshotRow } from "../../../scripts/lossless-snapshot-json.mjs";

const row = parseLosslessSnapshotRow;
const compare = (source: Record<string, unknown>[], target: Record<string, unknown>[], overrides = {}) => compareSourceSnapshotTable({
  table: "test", sourceRows: source, targetRows: target, keyColumns: ["id"], sourceColumns: ["id", "amount"], targetColumns: ["id", "amount"], ...overrides,
});
describe("source snapshot table coverage", () => {
  it("detects exact large numeric deltas without disclosing row content", () => {
    const result = compare([row('{"id":1,"amount":9007199254740993}')], [row('{"id":1,"amount":9007199254740992}')]);
    expect(result.status).toBe("UNRESOLVED_SOURCE_DELTA");
    expect(result.changedShared[0].fields[0].path).toBe("amount");
    expect(JSON.stringify(result)).not.toContain("9007199254740993");
  });
  it("preserves target-only synthetic rows and ignores explicit target-only schema additions", () => {
    const result = compare([row('{"id":1,"amount":100.00}')], [row('{"id":1,"amount":1e2,"extra":true}'), row('{"id":2,"amount":0,"extra":false}')], { targetColumns: ["id", "amount", "extra"] });
    expect(result.status).toBe("SHARED_SOURCE_BUSINESS_VALUES_MATCH");
    expect(result.stagingOnly).toBe(1);
    expect(result.targetOnlyColumns).toEqual(["extra"]);
  });
  it("does not silently reduce incomplete schema or duplicate-key rows", () => {
    expect(compare([], [], { targetColumns: ["id"] }).status).toBe("TARGET_COLUMNS_MISSING");
    expect(() => compare([{ id: "a", amount: 0 }, { id: "a", amount: 1 }], [])).toThrow("SNAPSHOT_PRIMARY_KEY_DUPLICATED");
    expect(() => compare([{ id: "a" }], [])).toThrow("SNAPSHOT_SOURCE_ROW_INCOMPLETE");
    expect(() => compare([], [], { keyColumns: [] })).toThrow("SNAPSHOT_PRIMARY_KEY_REQUIRED");
  });
  it("uses all composite-key columns and reports missing source records", () => {
    const result = compare([{ id: "a", module: "jobs", amount: 1 }, { id: "a", module: "college", amount: 1 }], [{ id: "a", module: "jobs", amount: 1 }], {
      keyColumns: ["id", "module"], sourceColumns: ["id", "module", "amount"], targetColumns: ["id", "module", "amount"],
    });
    expect(result.sourceOnly).toBe(1);
    expect(result.changedShared).toEqual([]);
  });
  it("classifies sandbox provider differences only with matching explicit staging audit evidence", () => {
    const at = "2026-10-13T20:00:00Z";
    const target = { provider_kind: "payment", provider_name: "esewa", is_enabled: true, configured_by: null,
      configured_at: at, updated_at: at, secret_ciphertext: "test-fixture", secret_iv: "test-fixture", secret_tag: "test-fixture",
      public_config: { environment: "uat", merchant_code: "EPAYTEST" } };
    const audits = [{ action: "staging_configure_esewa_uat", entity_type: "provider_configuration", entity_id: "payment", created_at: at,
      metadata: { operator_bootstrap: true, environment: "uat", merchant_code: "EPAYTEST" } }];
    expect(isAuditedStagingProviderConfiguration(target, audits)).toBe(true);
    expect(isAuditedStagingProviderConfiguration(target, [])).toBe(false);
    expect(isAuditedStagingProviderConfiguration({ ...target, public_config: { environment: "production", merchant_code: "EPAYTEST" } }, audits)).toBe(false);
    expect(isAuditedStagingProviderConfiguration({ ...target, updated_at: "2026-10-14T20:00:00Z" }, audits)).toBe(false);
  });
});
