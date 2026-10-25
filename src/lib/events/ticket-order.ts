export interface TicketOrderTier {
  ticket_kind?: string; min_team_size?: number; max_team_size?: number;
  min_per_order: number; max_per_order: number; price: number;
}

/** Team price is for one whole group; individual price is per attendee. */
export function calculateTicketOrder(tier: TicketOrderTier, quantity: number, attendeeCount?: number,
  participants?: Array<{ fullName: string }>, teamName?: string | null) {
  const team = tier.ticket_kind === "team" || tier.ticket_kind === "group";
  const attendees = attendeeCount ?? (team ? participants?.length ?? 0 : quantity);
  if (!Number.isSafeInteger(quantity) || quantity < Math.max(1,tier.min_per_order) || quantity > Math.min(10,tier.max_per_order))
    throw new Error("Choose a quantity within this ticket's purchase limits.");
  if (!Number.isSafeInteger(attendees) || attendees < 1 || attendees > 100 ||
    (team && (quantity !== 1 || !teamName?.trim() || attendees < (tier.min_team_size ?? 1) ||
      attendees > (tier.max_team_size ?? 100) || participants?.length !== attendees || participants.some(person => !person.fullName.trim()))) ||
    (!team && attendees !== quantity)) throw new Error("Provide the correct attendee count and complete group details. One group is purchased per order.");
  if (!Number.isFinite(tier.price) || tier.price < 0 || Math.abs(Math.round(tier.price*100)-tier.price*100)>0.00001)
    throw new Error("This ticket's price is invalid.");
  return { quantity, attendees, amount: Math.round(tier.price*100)*quantity/100 };
}
