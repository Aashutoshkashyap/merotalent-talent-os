import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";
import CTA from "@/components/landing/CTA";
import { MemoryRouter } from "react-router-dom";
import type { PageSection } from "@/hooks/useSiteCMS";

const section = (section_key: string, values: Partial<PageSection> = {}): PageSection => ({
  id: section_key, section_key, parent_id: null, title: "Edited section", subtitle: null,
  body: null, image_url: null, image_alt: null, cta_label: null, cta_url: null,
  display_order: 1, is_visible: true, page: "home", ...values,
});

vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
afterEach(cleanup);

describe("truthful public landing content and navigation", () => {
  it("keeps an enabled testimonial section editable and visible without inventing quotes", () => {
    render(<Testimonials title="Community feedback" description="Edited introduction" />);
    expect(screen.getByRole("heading", { name: "Community feedback" })).toBeVisible();
    expect(screen.getByText("Edited introduction")).toBeVisible();
    expect(screen.queryByText("Aman Shakya")).not.toBeInTheDocument();
  });

  it("preserves explicitly supplied CMS testimonials", () => {
    render(<Testimonials testimonials={[{ id: "published", quote: "Published feedback", author: "Approved author", role: "", institution: "" }]} />);
    expect(screen.getByText("Approved author")).toBeVisible();
    expect(screen.getByText(/Published feedback/)).toBeVisible();
  });

  it("shows only configured contact details and gives form controls accessible names", () => {
    const { rerender } = render(<ContactForm />);
    expect(screen.queryByText("Our Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone Number")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText(/Email Address/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/Subject/)).toBeVisible();
    expect(screen.getByLabelText(/Your Message/)).toBeVisible();
    rerender(<ContactForm settings={{ support_email: "help@example.test", contact_phone: "+977 9800000000", contact_address: "Configured office" }} />);
    expect(screen.getByRole("link", { name: "help@example.test" })).toHaveAttribute("href", "mailto:help@example.test");
    expect(screen.getByRole("link", { name: "+977 9800000000" })).toHaveAttribute("href", "tel:+9779800000000");
    expect(screen.getByText("Configured office")).toBeVisible();
    expect(screen.queryByText(/5551234|9801234567|within 24 hours/)).not.toBeInTheDocument();
  });

  it("uses the configured FAQ contact action rather than invented hotline numbers", () => {
    render(<FAQ contactUrl="mailto:help@example.test" contactLabel="Email our team" />);
    expect(screen.getByRole("link", { name: "Email our team" })).toHaveAttribute("href", "mailto:help@example.test");
    expect(screen.queryByRole("link", { name: "9801010803" })).not.toBeInTheDocument();
    const paymentQuestion = screen.getByRole("button", { name: "Is MeroTalent free for students?" });
    expect(paymentQuestion).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(paymentQuestion);
    expect(paymentQuestion).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/may have a fee/)).toBeVisible();
    expect(screen.getByRole("button", { name: "What is MeroTalent?" })).toHaveAttribute("aria-expanded", "false");
  });

  it("rejects executable contact links", () => {
    render(<FAQ contactUrl="javascript:alert(1)" />);
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "#contact");
  });

  it("renders edited contact headings and individual component content", () => {
    render(<ContactForm section={section("contact_form", { title: "Talk to our team", subtitle: "Support", body: "Our edited introduction" })}
      settings={{ contact_email: "old@example.test" }}
      components={[section("contact_form_email", { title: "Admissions email", body: "admissions@example.test" }),
        section("contact_form_message", { title: "Ask a question", body: "Edited form instructions", cta_label: "Send inquiry" })]} />);
    expect(screen.getByRole("heading", { name: "Talk to our team" })).toBeVisible();
    expect(screen.getByText("Our edited introduction")).toBeVisible();
    expect(screen.getByText("Admissions email")).toBeVisible();
    expect(screen.getByRole("link", { name: "admissions@example.test" })).toHaveAttribute("href", "mailto:admissions@example.test");
    expect(screen.queryByText("old@example.test")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask a question" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Send inquiry" })).toBeVisible();
  });

  it("does not resurrect hidden contact components from global settings", () => {
    const visibility = Object.fromEntries(["email", "phone", "message"].map(kind => {
      const key = `contact_form_${kind}`;
      return [key, { section_key: key, parent_id: "contact_form", display_order: 1, is_visible: false }];
    }));
    const { rerender } = render(<ContactForm settings={{ contact_email: "configured@example.test", contact_phone: "+977 9800000000" }} componentVisibility={visibility} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    rerender(<ContactForm settings={{ contact_email: "configured@example.test" }} />);
    expect(screen.getByRole("link", { name: "configured@example.test" })).toBeVisible();
    expect(screen.getByLabelText(/Full Name/)).toBeVisible();
  });

  it("does not restore fallback questions when the configured FAQ list is empty", () => {
    render(<FAQ title="Edited FAQ" items={[]} />);
    expect(screen.getByRole("heading", { name: "Edited FAQ" })).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses the editable CTA section instead of hardcoded copy and destination", () => {
    render(<MemoryRouter><CTA section={section("cta", { title: "Join our community", subtitle: "Edited eyebrow", body: "Edited CTA body", cta_label: "Explore colleges", cta_url: "/institutes" })} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Join our community" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore colleges" })).toHaveAttribute("href", "/institutes");
    expect(screen.getByText("Edited CTA body")).toBeVisible();
  });

  it("does not create an overflow scroll container that defeats the sticky header", () => {
    const source = readFileSync(`${process.cwd()}/src/screens/Index.tsx`, "utf8");
    expect(source).toContain("overflow-x-clip");
    expect(source).not.toContain("overflow-x-hidden");
    expect(source).toContain("sm:ml-[var(--sidebar-width)]");
    expect(source).toContain("<ContactForm key=\"contact_form\" settings={settings}");
  });
});
