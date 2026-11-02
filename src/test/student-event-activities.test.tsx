import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import StudentEventActivities from "@/components/events/StudentEventActivities";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/neon/role-workspaces-client", () => ({ requestRoleWorkspace: request }));
vi.mock("@/components/events/EventCertificateManager", () => ({ StudentEventCertificates: () => null }));
vi.mock("@/components/events/AssessmentContent", () => ({ AssessmentContent: ({ text }: { text: string }) => <span>{text}</span>, AssessmentImage: () => null }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
describe("student Event activity interaction", () => {
  it("does not falsely claim an enrollment has no activities while it is loading", () => {
    request.mockImplementation(() => new Promise(() => {}));
    render(<StudentEventActivities eventId="fixture-event" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your event activities");
    expect(screen.queryByText("No published activities are included in this enrollment yet.")).not.toBeInTheDocument();
  });
  it("keeps answer inputs usable during slow background autosaves", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const now = new Date();
    const activity = { id: "quiz", kind: "quiz", title: "Fixture quiz", instructions: "", status: "published", opens_at: now.toISOString(), closes_at: new Date(now.getTime() + 3600000).toISOString(), last_attempt_id: null };
    const attempt = { id: "attempt", state: "in_progress", started_at: now.toISOString(), deadline_at: new Date(now.getTime() + 300000).toISOString(),
      completed_at: null, answers: {}, server_time: now.toISOString(), score: null, total_marks: null, review: null,
      questions: [{ id: "question", question: "Two squared?", question_type: "single", options: [{ id: "a", text: "4" }, { id: "b", text: "5" }], points: 1, media_file_id: null }] };
    request.mockImplementation((url: string, input?: RequestInit) => input?.method === "PATCH" ? new Promise(() => {})
      : Promise.resolve(url.endsWith("/activities") ? [activity] : attempt));
    render(<StudentEventActivities eventId="fixture-event" />);
    fireEvent.click(await screen.findByRole("button", { name: "Start / resume quiz" }));
    const answer = await screen.findByRole("radio", { name: "4" });
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(request.mock.calls.some(([, input]) => input?.method === "PATCH")).toBe(true);
    expect(answer).toBeEnabled();
    fireEvent.click(answer);
    expect(answer).toBeChecked();
  });
});
