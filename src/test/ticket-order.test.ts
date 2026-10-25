import { describe, expect, it } from "vitest";
import { calculateTicketOrder } from "@/lib/events/ticket-order";
const individual = { price: 10, min_per_order: 1, max_per_order: 10 };
const group = { ...individual, ticket_kind: "group", max_per_order: 1, min_team_size: 2, max_team_size: 4 };
const people = [{ fullName: "Person One" },{ fullName: "Person Two" }];
describe("Authoritative ticket order units", () => {
  it("prices individual tickets per attendee and groups once for all members", () => {
    expect(calculateTicketOrder(individual,3,3)).toEqual({ quantity:3,attendees:3,amount:30 });
    expect(calculateTicketOrder(group,1,2,people,"Team")).toEqual({ quantity:1,attendees:2,amount:10 });
    expect(calculateTicketOrder({...group,ticket_kind:"team"},1,2,people,"Team").amount).toBe(10);
  });
  it.each([0,11,1.5,NaN])("rejects invalid quantity %s", quantity => {
    expect(() => calculateTicketOrder(individual,quantity)).toThrow();
  });
  it("rejects mismatched group size, missing members, unnamed groups and multiple groups", () => {
    for (const run of [() => calculateTicketOrder(group,2,2,people,"Team"),
      () => calculateTicketOrder(group,1,5,people,"Team"),() => calculateTicketOrder(group,1,2,people,""),
      () => calculateTicketOrder(group,1,3,people,"Team"),() => calculateTicketOrder(individual,2,1)]) expect(run).toThrow();
  });
  it("uses exact minor-unit totals and refuses malformed stored prices", () => {
    expect(calculateTicketOrder({...individual,price:0.1},3).amount).toBe(0.3);
    for (const price of [-1,0.001,NaN,Infinity]) expect(() => calculateTicketOrder({...individual,price},1)).toThrow();
  });
});
