import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import HeaderNav from "./HeaderNav";
import { SystemPagination } from "@/components/ui/SystemPagination";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

it("exposes public module links in the mobile/tablet menu and closes on selection", () => {
  render(<MemoryRouter><HeaderNav /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Institutes" })).toHaveAttribute("href", "/institutes");
  fireEvent.click(screen.getByRole("link", { name: "Events" }));
  expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
});

it("supports explicit keyboard-accessible close without navigating", () => {
  render(<MemoryRouter><HeaderNav /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
});

it("displays a custom active page size instead of an empty pagination pill", () => {
  render(<SystemPagination currentPage={1} totalPages={5} totalItems={108} pageSize={25}
    pageSizeOptions={[10, 50, 100]} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
  expect(screen.getByRole("combobox")).toHaveTextContent("25");
});
