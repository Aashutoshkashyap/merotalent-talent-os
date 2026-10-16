import {describe,expect,it} from "vitest";
import {parseLosslessSnapshotRow} from "../../../scripts/lossless-snapshot-json.mjs";
import {semanticDifferences} from "../../../scripts/source-snapshot-reconciliation.mjs";
describe("lossless migration numeric reconciliation",()=>{
  it("detects distinct integers and fractional values beyond JS number precision",()=>{
    expect(semanticDifferences(parseLosslessSnapshotRow('{"amount":9007199254740993}'),parseLosslessSnapshotRow('{"amount":9007199254740992}'))).toHaveLength(1);
    expect(semanticDifferences(parseLosslessSnapshotRow('{"amount":0.123456789012345678901}'),parseLosslessSnapshotRow('{"amount":0.123456789012345678902}'))).toHaveLength(1);
  });
  it("compares equivalent decimal and exponent representations without rounding",()=>{
    expect(semanticDifferences(parseLosslessSnapshotRow('{"amount":100.00}'),parseLosslessSnapshotRow('{"amount":1e2}'))).toEqual([]);
    expect(semanticDifferences(parseLosslessSnapshotRow('{"amount":-0}'),parseLosslessSnapshotRow('{"amount":0.00}'))).toEqual([]);
  });
});
