import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import RouteScrollReset from "@/components/navigation/RouteScrollReset";

function NavigationFixture() {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <RouteScrollReset />
    <output>{location.pathname}{location.search}{location.hash}</output>
    <button onClick={() => navigate("/institutes")}>Open directory</button>
    <button onClick={() => navigate("/institutes", { replace: true })}>Replace page</button>
    <button onClick={() => navigate("/?search=college")}>Change filter</button>
    <button onClick={() => navigate("/institutes#applications")}>Open fragment</button>
    <button onClick={() => navigate(-1)}>Back</button>
  </>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const setup = () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<MemoryRouter><NavigationFixture /></MemoryRouter>);
  return scroll;
};

describe("route scroll boundary", () => {
  it("resets a new page opened from a scrolled menu", () => {
    const scroll = setup();
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open directory" }));
    expect(screen.getByRole("status")).toHaveTextContent("/institutes");
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, left: 0, behavior: "instant" });
  });

  it("also starts a replacement page at the top", () => {
    const scroll = setup();
    fireEvent.click(screen.getByRole("button", { name: "Replace page" }));
    expect(scroll).toHaveBeenCalledOnce();
  });

  it("does not jump when changing query filters on the same page", () => {
    const scroll = setup();
    fireEvent.click(screen.getByRole("button", { name: "Change filter" }));
    expect(screen.getByRole("status")).toHaveTextContent("/?search=college");
    expect(scroll).not.toHaveBeenCalled();
  });

  it("does not override explicit fragment destinations", () => {
    const scroll = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open fragment" }));
    expect(screen.getByRole("status")).toHaveTextContent("/institutes#applications");
    expect(scroll).not.toHaveBeenCalled();
  });

  it("does not override browser back navigation", () => {
    const scroll = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open directory" }));
    scroll.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("status")).toHaveTextContent("/");
    expect(scroll).not.toHaveBeenCalled();
  });
});
