export interface PlaceableInstitute {
  id: string;
  name: string;
  admission_status: string | null;
  ranking: number | null;
}

export const hasCollegePosition = (institute: PlaceableInstitute) =>
  institute.admission_status === "open" &&
  typeof institute.ranking === "number" &&
  Number.isInteger(institute.ranking) &&
  institute.ranking > 0;

/** Fill the Super Admin's numbered slots, then use editorial order for the gaps. */
export function placeInstitutes<T extends PlaceableInstitute>(
  editorialOrder: T[],
  positioned: T[],
  totalCount: number,
  limit: number,
): T[] {
  const visibleCount = Math.min(Math.max(0, limit), Math.max(0, totalCount));
  if (!visibleCount) return [];

  const ranked = positioned
    .filter(hasCollegePosition)
    .sort((a, b) =>
      a.ranking! - b.ranking! || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );
  const rankedIds = new Set(ranked.map((institute) => institute.id));
  const slots: Array<T | undefined> = Array.from({ length: visibleCount });

  for (const institute of ranked) {
    const desired = Math.min(institute.ranking!, totalCount) - 1;
    if (desired >= visibleCount) continue;
    // A duplicate position uses the next free slot; collisions never hide a college.
    let slot = desired;
    while (slot < visibleCount && slots[slot]) slot += 1;
    if (slot === visibleCount) slot = slots.findIndex((value) => !value);
    if (slot >= 0) slots[slot] = institute;
  }

  const remaining = editorialOrder.filter((institute) => !rankedIds.has(institute.id));
  let next = 0;
  return slots.map((institute) => institute ?? remaining[next++]).filter((institute): institute is T => Boolean(institute));
}
