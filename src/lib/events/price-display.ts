type Price = { price: number | string; currency?: string | null };
type EventPrice = {
  ticket_price?: number | string | null;
  currency?: string | null;
  ticket_pricing?: Price | null;
  ticket_types?: Array<Price & { is_active?: boolean }>;
};

/** Presentation only. Checkout always calculates the selected tier server-side. */
export function displayedEventPrice(event: EventPrice | null | undefined) {
  const tiers = (event?.ticket_types ?? []).filter(t => t.is_active !== false);
  const candidates = tiers.length ? tiers : event?.ticket_pricing ? [event.ticket_pricing] : [];
  const priced = candidates.filter(t => Number.isFinite(Number(t.price)) && Number(t.price) >= 0);
  const lowest = priced.reduce<Price | undefined>((best, t) =>
    !best || Number(t.price) < Number(best.price) ? t : best, undefined);
  const amount = Number(lowest?.price ?? event?.ticket_price ?? 0);
  const currency = lowest?.currency ?? event?.currency ?? "NPR";
  const mixed = new Set(priced.map(t => t.currency ?? currency)).size > 1;
  const isFree = amount === 0 && !mixed;
  const label = mixed ? "See ticket prices" : isFree ? "Free" :
    `${lowest ? "From " : ""}${currency} ${amount.toLocaleString()}`;
  return { isFree, amount, currency, label };
}
