import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/PublicPageLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/AuthContext", () => {
  const state = { user: { id: "student" }, profile: {} };
  return { useAuth: () => state };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import CompetitionsPage from "@/screens/competitions/CompetitionsPage";
import DashboardCompetitions from "@/screens/dashboard/Competitions";

const item = { id: "10000000-0000-4000-8000-000000000001", title: "Live Challenge",
  type: "hackathon", description: "Public competition details", status: "upcoming",
  organizer_type: "institution", format: "online", is_team_based: false };
afterEach(() => vi.unstubAllGlobals());

describe("public competition navigation", () => {
  it("routes the public directory to its real implementation, not Coming Soon", () => {
    const app = readFileSync(`${process.cwd()}/src/App.tsx`, "utf8");
    expect(app).toContain('<Route path="/competitions" element={<CompetitionsPage />} />');
    expect(app).not.toContain('<ComingSoonPage moduleKey="competitions"');
  });

  it("resolves a landing-page anchor and links to the selected registration workflow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [item] }) }));
    render(<MemoryRouter initialEntries={[`/competitions#competition-${item.id}`]}><CompetitionsPage /></MemoryRouter>);
    await screen.findByText(item.title);
    expect(document.getElementById(`competition-${item.id}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `View ${item.title} details and registration` }))
      .toHaveAttribute("href", `/dashboard/competitions?competition=${item.id}`);
  });

  it("opens the requested public competition in the authenticated dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true,
      json: async () => ({ data: url.includes("registrations") ? [] : [item] }) })));
    render(<MemoryRouter initialEntries={[`/dashboard/competitions?competition=${item.id}`]}><DashboardCompetitions /></MemoryRouter>);
    expect(await screen.findByRole("dialog", { name: item.title })).toBeInTheDocument();
  });
});
