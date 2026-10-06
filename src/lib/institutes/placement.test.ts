import { describe, expect, it } from "vitest";
import { hasCollegePosition, placeInstitutes, type PlaceableInstitute } from "./placement";

const college = (id: string, ranking: number | null = null, admission_status = "open"): PlaceableInstitute => ({
  id,
  name: `College ${id}`,
  ranking,
  admission_status,
});

describe("Super Admin college placement", () => {
  const editorial = Array.from({ length: 15 }, (_, index) => college(String(index + 1)));

  it("uses numbered slots instead of treating rank as a sorting weight", () => {
    const first = college("first", 1);
    const twelfth = college("twelfth", 12);
    const result = placeInstitutes([first, twelfth, ...editorial], [first, twelfth], 17, 12);
    expect(result).toHaveLength(12);
    expect(result[0].id).toBe("first");
    expect(result[11].id).toBe("twelfth");
    expect(result[1].id).toBe("1");
  });

  it("does not show a later ranked college prematurely on the first student page", () => {
    const twelfth = college("twelfth", 12);
    const result = placeInstitutes([twelfth, ...editorial], [twelfth], 16, 6);
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("does not reserve a slot for closed admissions", () => {
    const closed = college("closed", 1, "closed");
    expect(hasCollegePosition(closed)).toBe(false);
    expect(placeInstitutes([closed, ...editorial], [closed], 16, 2).map((item) => item.id))
      .toEqual(["closed", "1"]);
  });

  it("handles duplicate slot numbers without dropping either college", () => {
    const alpha = college("A", 1);
    const beta = college("B", 1);
    expect(placeInstitutes([beta, alpha, ...editorial], [beta, alpha], 17, 3).map((item) => item.id))
      .toEqual(["A", "B", "1"]);
  });
});
