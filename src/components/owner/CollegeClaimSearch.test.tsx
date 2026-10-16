import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollegeClaimSearch, type ClaimCollegeOption } from "./CollegeClaimSearch";

const college: ClaimCollegeOption = {
  id: "a25e6694-279f-445d-b468-826cdfaa8a6d",
  name: "St. Xavier's College",
  location: "Kathmandu",
  institution_category: "college",
};

function ClaimSearchHarness() {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<ClaimCollegeOption | null>(null);

  return (
    <>
      <CollegeClaimSearch
        value={value}
        selected={selected}
        onChange={(next) => { setValue(next); setSelected(null); }}
        onSelect={(next) => { setValue(next.name); setSelected(next); }}
      />
      <output data-testid="selected-id">{selected?.id ?? ""}</output>
    </>
  );
}

describe("CollegeClaimSearch", () => {
  const fetchDirectory = vi.fn();
  beforeEach(() => {
    fetchDirectory.mockResolvedValue({ ok: true, json: async () => ({ data: [college] }) });
    vi.stubGlobal("fetch", fetchDirectory);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers matching directory colleges and selects the exact ID", async () => {
    render(<ClaimSearchHarness />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Xavier" } });
    await waitFor(() => expect(screen.getByRole("option", { name: /St. Xavier's College/ })).toBeInTheDocument());
    expect(fetchDirectory).toHaveBeenCalledWith("/api/v1/institutes/directory?name=Xavier&sort=name&limit=8");

    fireEvent.click(screen.getByRole("option", { name: /St. Xavier's College/ }));
    expect(screen.getByTestId("selected-id")).toHaveTextContent(college.id);
    expect(screen.getByRole("combobox")).toHaveValue(college.name);
  });

  it("clears a previous selection when the claimant changes the text", async () => {
    render(<ClaimSearchHarness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Xavier" } });
    fireEvent.click(await screen.findByRole("option", { name: /St. Xavier's College/ }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Another college" } });
    expect(screen.getByTestId("selected-id")).toBeEmptyDOMElement();
  });
});
