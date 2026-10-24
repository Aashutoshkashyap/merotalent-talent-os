import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ user: { id: "student" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, session: null }) }));
vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
import MyTickets from "@/screens/dashboard/MyTickets";
beforeEach(() => { mocks.user = { id: "student" }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Neon event passes", () => {
  it("uses the authenticated cookie without requiring a legacy bearer and finishes loading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }))));
    render(<MyTickets />);
    expect(await screen.findByText("No event tickets yet")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/v1/events/my-tickets", { credentials: "same-origin", cache: "no-store", headers: {} });
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });
  it("shows a retry action after an authorization/server failure, not a fake empty result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Not authorized" } }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }))));
    render(<MyTickets />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Not authorized");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No event tickets yet")).toBeInTheDocument();
  });
  it("does not request private passes or spin forever when signed out", async () => {
    mocks.user = null; vi.stubGlobal("fetch", vi.fn());
    render(<MyTickets />);
    await waitFor(() => expect(screen.queryByText("Loading your event passes...")).not.toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalled();
  });
});
