import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import FeaturedPosterCard from "./FeaturedPosterCard";
import OpportunityCard from "./OpportunityCard";
import Features from "./Features";

describe("public discovery card destinations", () => {
  it("makes every main feature card a usable link to an existing module", () => {
    render(<MemoryRouter><Features /></MemoryRouter>);
    for (const [title, path] of [
      ["Compete & Prove", "/competitions"], ["Build Your Profile", "/dashboard/profile"],
      ["Learn from Mentors", "/mentorship"], ["Get Hired", "/jobs"],
      ["Upskill Yourself", "/courses"], ["Track Progress", "/dashboard"],
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", path);
    }
  });
  it("links partner courses directly to the approved external learning platform", () => {
    render(<OpportunityCard data={{
      id: "course-1", title: "Partner course", organizer: "MeroTalent", logo: "MT",
      externalHref: "https://learn.merotalent.com/course-1",
    }} />);
    expect(screen.getByRole("link", { name: /Partner course/ })).toHaveAttribute("href", "https://learn.merotalent.com/course-1");
    expect(screen.getByRole("link", { name: /Partner course/ })).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps featured public records on their own detail pages", () => {
    render(<MemoryRouter><FeaturedPosterCard data={{
      id: "job-1", path: "/jobs/job-1", posterBg: "bg-blue-950", badgeTag: "Job", title: "Real job",
      posterContent: { bannerTitle: "Job", subtitle: "Real job", description: "Approved role" },
    }} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Real job/ })).toHaveAttribute("href", "/jobs/job-1");
  });
});
