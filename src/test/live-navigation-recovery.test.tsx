import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), user: { id: "student" }, events: vi.fn(), categories: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, signOut: mocks.signOut, session: null, roles: [], permissions: [], capabilities: [] }) }));
vi.mock("@/components/landing/PublicPageLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/jobs/JobApplicationWizard", () => ({ default: () => null }));
vi.mock("@/components/mentors/BookingDialog", () => ({ default: () => null }));
vi.mock("@/components/events/EventRegistrationModal", () => ({ default: () => null }));
vi.mock("@/lib/events/events-client", () => ({ fetchPublicEvents: mocks.events, fetchEventCategories: mocks.categories }));
import SidebarNav from "@/components/landing/SidebarNav";
import { SearchBar } from "@/components/landing/HeaderNav";
import JobsPage from "@/screens/jobs/JobsPage";
import MentorshipPage from "@/screens/mentorship/MentorshipPage";
import CompetitionsPage from "@/screens/competitions/CompetitionsPage";
import EventsPage from "@/screens/events/EventsPage";

function Location() { const location = useLocation(); return <output>{location.pathname + location.search}</output>; }
beforeEach(() => { vi.clearAllMocks(); mocks.signOut.mockResolvedValue(undefined); mocks.categories.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("live navigation repairs", () => {
  it("opens navigation with a keyboard-accessible toggle and routes Post to module access", () => {
    render(<MemoryRouter><SidebarNav /><Location /></MemoryRouter>);
    const toggle = screen.getByRole("button", { name: "Toggle Navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("link", { name: "Post" }));
    expect(screen.getByRole("status").textContent).toBe("/request-access");
  });
  it("actually signs out before returning home instead of just opening login", async () => {
    render(<MemoryRouter initialEntries={["/jobs"]}><SidebarNav /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/^\/$/));
  });
  it("keeps the current page and shows an error if sign-out fails", async () => {
    mocks.signOut.mockRejectedValue(new Error("offline"));
    render(<MemoryRouter initialEntries={["/jobs"]}><SidebarNav /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign out failed");
    expect(screen.getByRole("status")).toHaveTextContent("/jobs");
  });
  it("routes global search and applies its query in the real Jobs directory", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { id: "a", title: "Civil Engineer" }, { id: "b", title: "Wordpress Developer" },
    ] }))));
    render(<MemoryRouter><SearchBar /><JobsPage /><Location /></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: "Search Opportunities" }), { target: { value: "Wordpress" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "Search Opportunities" }).closest("form")!);
    expect(await screen.findByRole("link", { name: "Wordpress Developer" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Civil Engineer" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("/jobs?q=Wordpress");
  });
});
describe.each([
  ["Jobs", JobsPage], ["Mentors", MentorshipPage], ["Competitions", CompetitionsPage], ["Events", EventsPage],
] as const)("%s directory read recovery", (_name, Page) => {
  it("distinguishes request failure from empty results and retries the real read", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Temporarily unavailable" } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal("fetch", fetcher);
    mocks.events.mockRejectedValueOnce(new Error("Temporarily unavailable")).mockResolvedValueOnce([]);
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(_name === "Events" ? mocks.events : fetcher).toHaveBeenCalledTimes(2);
  });
});
