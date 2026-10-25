import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(), refreshProfile: vi.fn(),
  profile: { full_name: "Test Student", email: "student@example.test", phone: "", location: "" },
  user: { id: "10000000-0000-4000-8000-000000000001", email: "student@example.test" },
}));
vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, session: null, profile: mocks.profile, refreshProfile: mocks.refreshProfile }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: new Proxy({}, { get() { throw Error("Legacy access forbidden"); } }) }));
vi.mock("@/components/ui/calendar", () => ({ Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => <button onClick={() => onSelect(new Date(Date.now() + 86_400_000))}>Choose tomorrow</button> }));
import BookingDialog from "@/components/mentors/BookingDialog";

const service = { id: "10000000-0000-4000-8000-000000000003", title: "Published service", duration_minutes: 60, price: 10, currency: "NPR", session_type: "one_to_one", capacity: 1 };
const props = { isOpen: true, onClose: vi.fn(), mentor: { id: "10000000-0000-4000-8000-000000000002", name: "Test Mentor", hourlyRate: 10, expertise: [] } };
const view = () => <MemoryRouter><BookingDialog {...props} /></MemoryRouter>;
async function chooseSession() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Choose tomorrow" }));
  // Time labels vary by locale; the nine published default slots are the only small buttons.
  const timeButton = screen.getAllByRole("button").find((button) => /9:00|09:00/.test(button.textContent || ""));
  expect(timeButton).toBeDefined();
  fireEvent.click(timeButton!);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile = { full_name: "Test Student", email: "student@example.test", phone: "", location: "" };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { services: [service] } }), { status: 200 })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Neon mentor booking saved-profile boundary", () => {
  it("shows missing saved details without a legacy Supabase session and blocks advancement", async () => {
    render(view());
    expect(screen.getByRole("alert")).toHaveTextContent("valid phone number, location");
    expect(screen.getByRole("link", { name: "Complete profile" })).toHaveAttribute("href", "/dashboard/profile");
    await chooseSession();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Complete your profile" }));
    expect(screen.queryByLabelText("What would you like to discuss?")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes the profile and uses read-only saved contact details for Neon users", async () => {
    const rendered = render(view());
    fireEvent.click(screen.getByRole("button", { name: "I’ve updated it" }));
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalledTimes(1));
    mocks.profile = { ...mocks.profile, phone: "9800000000", location: "Test City" };
    rendered.rerender(view());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await chooseSession();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    for (const label of ["Full name", "Email", "Phone *", "Address *"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("readonly");
    }
    expect(screen.getByLabelText("Phone *")).toHaveValue("9800000000");
    expect(screen.getByLabelText("Address *")).toHaveValue("Test City");
  });

  it("rechecks saved profile readiness before submitting, even after reaching review", async () => {
    mocks.profile = { ...mocks.profile, phone: "9800000000", location: "Test City" };
    const rendered = render(view());
    await chooseSession();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("What would you like to discuss?"), { target: { value: "Career planning" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    mocks.profile = { ...mocks.profile, location: "" };
    rendered.rerender(view());
    fireEvent.click(screen.getByRole("button", { name: "Continue to Pay" }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Complete your profile" }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('checks paid readiness before creating a reservation and preserves the actual restriction message', async () => {
    mocks.profile = { ...mocks.profile, phone: '9800000000', location: 'Test City' };
    vi.stubGlobal('fetch', vi.fn(async (input: string) => new Response(JSON.stringify(input.endsWith('/availability')
      ? { data: { available: false, message: 'Public checkout has not been enabled.' } }
      : { data: { services: [service] } }), { status: 200 })));
    render(view());
    await chooseSession();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('What would you like to discuss?'), { target: { value: 'Career planning' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Pay' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Public checkout has not been enabled.' })));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalledWith('/api/v1/mentors/book', expect.anything());
  });

  it('keeps free bookings usable without a paid checkout readiness check', async () => {
    mocks.profile = { ...mocks.profile, phone: '9800000000', location: 'Test City' };
    const freeService = { ...service, price: 0 };
    vi.stubGlobal('fetch', vi.fn(async (input: string) => new Response(JSON.stringify(input === '/api/v1/mentors/book'
      ? { data: { id: 'free-booking' } } : { data: { services: [freeService] } }), { status: 200 })));
    render(view());
    await chooseSession();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('What would you like to discuss?'), { target: { value: 'Career planning' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm.*Session/i }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Free session confirmed' })));
    expect(fetch).not.toHaveBeenCalledWith('/api/v1/payments/availability', expect.anything());
  });
});
