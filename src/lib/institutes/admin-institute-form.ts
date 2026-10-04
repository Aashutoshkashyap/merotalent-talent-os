export function validateInstituteSeatCounts(totalSeats: string, availableSeats: string): string | null {
  const total = totalSeats.trim() === "" ? null : Number(totalSeats);
  const available = availableSeats.trim() === "" ? null : Number(availableSeats);

  if (total !== null && (!Number.isSafeInteger(total) || total < 0)) {
    return "Total seats must be a non-negative whole number.";
  }
  if (available !== null && (!Number.isSafeInteger(available) || available < 0)) {
    return "Available seats must be a non-negative whole number.";
  }
  if (total !== null && available !== null && available > total) {
    return "Available seats cannot exceed total seats.";
  }
  return null;
}
