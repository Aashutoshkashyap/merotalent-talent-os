import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";

vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
afterEach(cleanup);

describe("truthful public landing content and navigation", () => {
  it("does not invent testimonials when no CMS testimonials are published", () => {
    const { container } = render(<Testimonials />);
    expect(container).toBeEmptyDOMElement();
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

  it("does not create an overflow scroll container that defeats the sticky header", () => {
    const source = readFileSync(`${process.cwd()}/src/screens/Index.tsx`, "utf8");
    expect(source).toContain("overflow-x-clip");
    expect(source).not.toContain("overflow-x-hidden");
    expect(source).toContain("sm:ml-[var(--sidebar-width)]");
    expect(source).toContain("<ContactForm key=\"contact_form\" settings={settings}");
  });
});
