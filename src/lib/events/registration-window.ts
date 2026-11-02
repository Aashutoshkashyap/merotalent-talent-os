/** Physical event time is a legacy fallback, never a substitute for an explicit sale window. */
export function registrationWindowOpen(event: { start_date: Date | string; registration_deadline?: Date | string | null;
  registration_open_at?: Date | string | null; registration_close_at?: Date | string | null },
  tier: { sales_start_at?: Date | string | null; sales_end_at?: Date | string | null } | undefined, now: number) {
  const starts = [event.registration_open_at, tier?.sales_start_at].filter(Boolean) as Array<Date | string>;
  const ends = [event.registration_close_at, event.registration_deadline, tier?.sales_end_at].filter(Boolean) as Array<Date | string>;
  const explicit = starts.length > 0 || ends.length > 0;
  return starts.every(date => new Date(date).getTime() <= now) && ends.every(date => now < new Date(date).getTime()) &&
    (explicit || now < new Date(event.start_date).getTime());
}
