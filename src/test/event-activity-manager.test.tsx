import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import EventActivityManager from "@/components/events/EventActivityManager";
vi.mock("@/lib/neon/role-workspaces-client", () => ({ requestRoleWorkspace: vi.fn().mockResolvedValue({ activities: [], questions: [], tickets: [
  { id: "individual", name: "Regular", ticket_kind: "individual" }, { id: "group", name: "Group purchase", ticket_kind: "group" },
] }) }));
vi.mock("@/components/events/EventPresentationManager", () => ({ default: () => null }));
vi.mock("@/components/events/EventAssignmentReview", () => ({ default: () => null }));
vi.mock("@/components/events/EventCertificateManager", () => ({ default: () => null }));
vi.mock("@/components/events/EventEnrollmentAccess", () => ({ default: () => null }));
vi.mock("@/components/events/AssessmentContent", () => ({ AssessmentContent: () => null, AssessmentImage: () => null }));
it("keeps group-tier activity mapping but does not advertise unsupported single-student group enrollment", async () => {
  render(<EventActivityManager eventId="11111111-1111-4111-8111-111111111111" />);
  const select = await screen.findByLabelText("Ticket category");
  expect(within(select).getByRole("option", { name: "Regular" })).toBeInTheDocument();
  expect(within(select).queryByRole("option", { name: "Group purchase" })).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Included ticket types" })).toHaveTextContent("Group purchase");
});
