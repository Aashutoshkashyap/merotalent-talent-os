import { describe, expect, it } from "vitest";
import { parseEsewaAmount } from "./esewa-amount";

describe("documented grouped eSewa callback amounts", () => {
  it.each([["1,000.0", 1000], ["1,000,000.50", 1000000.5], ["1000.00", 1000], [10, 10]])
    ("parses %s as %s without truncating at the comma", (value, expected) => {
      expect(parseEsewaAmount(value)).toBe(expected);
    });
  it.each(["1,00.0", "10,00", "1,000.00junk", " 1000 ", "1e3", "1_000", "1,,000", "01,000", "1000.001", null, {}, NaN, Infinity])
    ("rejects malformed provider amount %s", value => {
      expect(Number.isNaN(parseEsewaAmount(value))).toBe(true);
    });
});
