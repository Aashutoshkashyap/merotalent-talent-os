import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const context = vi.hoisted(() => ({ current: { user: { id: "fixture" } as { id: string } | null,
  profile: { account_status: "active" }, roles: ["talent"], permissions: [] as string[], capabilities: [] as string[], isLoading: false, isAdmin: false } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => context.current }));
const workspace = () => render(<MemoryRouter initialEntries={["/event-admin"]}><Routes>
  <Route path="/event-admin" element={<ProtectedRoute requiredModule="events"><p>Assigned events</p></ProtectedRoute>} />
  <Route path="/dashboard" element={<p>Student dashboard</p>} /><Route path="/login" element={<p>Sign in</p>} />
</Routes></MemoryRouter>);
beforeEach(() => { context.current.user = { id: "fixture" }; context.current.capabilities = []; context.current.isAdmin = false; });
describe("event workspace route boundary", () => {
  it("allows an Events-only student capability without a company role", () => {
    context.current.capabilities = ["events"];
    workspace();
    expect(screen.getByText("Assigned events")).toBeInTheDocument();
  });
  it("denies a Jobs-only user and requires authentication", () => {
    context.current.capabilities = ["jobs"];
    const mounted = workspace();
    expect(screen.getByText("Student dashboard")).toBeInTheDocument();
    mounted.unmount(); context.current.user = null; workspace();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
});
