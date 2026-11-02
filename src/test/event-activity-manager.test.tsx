import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import EventActivityManager from "@/components/events/EventActivityManager";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
vi.mock("@/lib/neon/role-workspaces-client", () => ({ requestRoleWorkspace: vi.fn() }));
const base = { activities: [], questions: [], tickets: [
  { id: "individual", name: "Regular", ticket_kind: "individual" }, { id: "group", name: "Group purchase", ticket_kind: "group" },
] };
beforeEach(() => { vi.mocked(requestRoleWorkspace).mockReset().mockResolvedValue(base); });
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
it("clears an unsaved activity draft and entity selections when switching events", async () => {
  const first = "11111111-1111-4111-8111-111111111111", second = "22222222-2222-4222-8222-222222222222";
  vi.mocked(requestRoleWorkspace).mockImplementation(async url => url.includes(second) ? { ...base, tickets: [{ id: "b", name: "Event B admission", ticket_kind: "individual" }] } : base);
  const view = render(<EventActivityManager eventId={first} />);
  fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Unsaved Event A quiz" } });
  view.rerender(<EventActivityManager eventId={second} />);
  expect(await screen.findByLabelText("Title")).toHaveValue("");
  const select = screen.getByLabelText("Ticket category");
  expect(within(select).getByRole("option", { name: "Event B admission" })).toBeInTheDocument();
  expect(within(select).queryByRole("option", { name: "Regular" })).not.toBeInTheDocument();
});
it("ignores a delayed previous-event configuration after the new event has loaded", async () => {
  let resolveFirst: (value: typeof base) => void;
  const delayed = new Promise<typeof base>(resolve => { resolveFirst = resolve; });
  vi.mocked(requestRoleWorkspace).mockImplementation(url => url.includes("11111111-1111-4111-8111-111111111111") ? delayed : Promise.resolve({ ...base, tickets: [{ id: "b", name: "Event B admission", ticket_kind: "individual" }] }));
  const view = render(<EventActivityManager eventId="11111111-1111-4111-8111-111111111111" />);
  view.rerender(<EventActivityManager eventId="22222222-2222-4222-8222-222222222222" />);
  await screen.findByRole("option", { name: "Event B admission" });
  await act(async () => { resolveFirst(base); await delayed; });
  expect(screen.getByRole("option", { name: "Event B admission" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Regular" })).not.toBeInTheDocument();
});
