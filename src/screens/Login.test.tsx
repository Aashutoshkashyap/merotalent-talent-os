import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signIn, signInWithOAuth: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/auth/AuthShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

function renderLogin() {
  render(<MemoryRouter><Login /></MemoryRouter>);
  return screen.getByLabelText("Password", { exact: true });
}

describe("login password visibility", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("hides the password by default and exposes an accessible visibility control", () => {
    const input = renderLogin();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toBeRequired();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-controls", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("shows and hides the same entered value without submitting or signing in", () => {
    const input = renderLogin();
    fireEvent.change(input, { target: { value: "Synthetic-test-value!" } });
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("Synthetic-test-value!");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("Synthetic-test-value!");
    expect(signIn).not.toHaveBeenCalled();
  });

  it.each([false, true])("preserves password submission when visible is %s", async (visible) => {
    signIn.mockResolvedValue({ error: new Error("Synthetic test response") });
    const input = renderLogin();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "test@example.test" } });
    fireEvent.change(input, { target: { value: "Synthetic-test-value!" } });
    if (visible) fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledExactlyOnceWith("test@example.test", "Synthetic-test-value!"));
  });
});
