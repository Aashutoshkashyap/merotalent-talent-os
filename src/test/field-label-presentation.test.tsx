import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { connectFieldLabel } from "@/lib/ui/field-labels";

describe("app-wide input label presentation", () => {
  it("keeps a for/id caption visible and its accessible name intact", () => {
    render(<div><Label htmlFor="email">Email address *</Label><Input id="email" type="email" placeholder="you@example.com" /></div>);
    const input=screen.getByRole("textbox",{name:"Email address *"});
    expect(input).toHaveAttribute("placeholder","you@example.com");
    expect(input).toHaveAttribute("title","Email address *");
    expect(screen.getByText("Email address *").closest("label")).toBeVisible();
    expect(screen.getByText("Email address *").closest("label")).not.toHaveAttribute("data-input-label");
  });
  it("names legacy sibling inputs without generating text inside the field", () => {
    render(<div><Label>Organization name</Label><Input /></div>);
    expect(screen.getByRole("textbox",{name:"Organization name"})).not.toHaveAttribute("placeholder");
    expect(screen.getByText("Organization name")).toBeVisible();
  });
  it("keeps wrapping captions and entered values visible", () => {
    render(<Label><strong>Expected salary</strong><Input type="number" defaultValue="10" /></Label>);
    const input=screen.getByRole("spinbutton",{name:"Expected salary"});
    expect(input.closest("label")).not.toHaveAttribute("data-input-label");
    expect(screen.getByText("Expected salary")).toBeVisible();
    expect(input.closest("[data-field-label-copy]")).toBeNull();
    expect(input).toHaveValue(10);
  });
  it("preserves native select options and selection", () => {
    render(<Label>Pricing unit<select defaultValue="group"><option value="individual">Per attendee</option><option value="group">Per group</option></select></Label>);
    expect(screen.getByRole("combobox",{name:"Pricing unit"})).toHaveValue("group");
    expect(screen.getByRole("option",{name:"Per group"}).closest("[data-field-label-copy]")).toBeNull();
  });
  it("keeps checkbox, radio, range and switch descriptions visible", () => {
    render(<><Label><input type="checkbox" />On sale</Label><Label><input type="radio" />Individual</Label>
      <div><Label htmlFor="enabled">Enable integration</Label><button id="enabled" role="switch" aria-checked="false" /></div>
      <Label>Volume<input type="range" /></Label></>);
    for(const text of ["On sale","Individual","Enable integration","Volume"])
      expect(screen.getByText(text).closest("label")).not.toHaveAttribute("data-input-label");
    fireEvent.click(screen.getByRole("checkbox",{name:"On sale"}));
    expect(screen.getByRole("checkbox",{name:"On sale"})).toBeChecked();
  });
  it("retains upload actions and names separate document inputs", () => {
    render(<><Label className="cursor-pointer">Choose profile picture<input type="file" className="hidden" /></Label>
      <div><Label htmlFor="proof">Company recommendation letter *</Label><Input id="proof" type="file" /></div></>);
    expect(screen.getByText("Choose profile picture").closest("label")).not.toHaveAttribute("data-input-label");
    expect(screen.getByLabelText("Company recommendation letter *")).toHaveAttribute("title","Company recommendation letter *");
  });
  it("does not steal a field name from a section heading or another label", () => {
    render(<div><Label>Contact information</Label><div><Label>Your name</Label><Input /></div></div>);
    expect(screen.getByText("Contact information").closest("label")).toBeVisible();
    expect(screen.getByRole("textbox",{name:"Your name"})).not.toHaveAttribute("placeholder");
  });
  it("preserves explicit accessible names, descriptions and validation", () => {
    render(<div><Label>Display caption</Label><Textarea aria-label="Existing accessible name" aria-describedby="help" aria-invalid="true" required /><p id="help">Required information</p></div>);
    const input=screen.getByRole("textbox",{name:"Existing accessible name"});
    expect(input).toHaveAttribute("aria-describedby","help");expect(input).toHaveAttribute("aria-invalid","true");expect(input).toBeRequired();
  });
  it("handles custom combobox triggers without labelling their hidden select", () => {
    render(<div><Label>Account role</Label><div><button role="combobox" aria-expanded="false" aria-controls="role-options">Student</button><select aria-hidden="true" tabIndex={-1}><option>Student</option></select><div id="role-options" role="listbox" hidden /></div></div>);
    expect(screen.getByRole("combobox",{name:"Account role"})).toHaveAttribute("title","Account role");
  });
  it("keeps password actions visible while finding the nearby input", () => {
    render(<div><div><Label>Password</Label><a href="/reset-password">Forgot password?</a></div><Input type="password" /></div>);
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("placeholder");
    expect(screen.getByText("Password")).toBeVisible();
    expect(screen.getByRole("link",{name:"Forgot password?"})).toBeVisible();
  });
  it("updates dynamic names, preserves refs and never changes entered values", () => {
    const ref=createRef<HTMLLabelElement>();
    const {rerender}=render(<div><Label ref={ref}>Full name</Label><Input defaultValue="Actual user" /></div>);
    expect(ref.current).not.toHaveAttribute("data-input-label");
    expect(ref.current).toBeVisible();
    const input=screen.getByRole("textbox",{name:"Full name"});fireEvent.change(input,{target:{value:"Updated user"}});
    rerender(<div><Label ref={ref}>Legal name</Label><Input defaultValue="Actual user" /></div>);
    expect(screen.getByRole("textbox",{name:"Legal name"})).toHaveValue("Updated user");
    expect(input).not.toHaveAttribute("placeholder");
    expect(screen.getByText("Legal name")).toBeVisible();
  });
  it("cleans up generated metadata without deleting later explicit attributes", () => {
    const root=document.createElement("div");root.innerHTML='<label>Notes</label><textarea></textarea>';
    const label=root.querySelector("label")!,input=root.querySelector("textarea")!;
    const cleanup=connectFieldLabel(label);input.setAttribute("title","Owner supplied title");cleanup();
    expect(input).not.toHaveAttribute("aria-label");expect(input).not.toHaveAttribute("placeholder");
    expect(input).toHaveAttribute("title","Owner supplied title");
  });
  it("does not place fragment-wrapped controls inside hidden caption spans", () => {
    render(<Label><>Message<Textarea /></></Label>);
    expect(screen.getByRole("textbox",{name:"Message"}).closest("[data-field-label-copy]")).toBeNull();
  });
  it("suppresses only placeholder pseudo-elements, never labels or entered text", () => {
    const css=readFileSync("src/index.css","utf8");
    expect(css).toMatch(/input::placeholder,\s*textarea::placeholder\s*\{\s*color: transparent !important;\s*opacity: 0 !important;/);
    expect(css).not.toContain('label[data-input-label=');
    expect(css).not.toContain('[data-field-label-copy]');
  });
  it("keeps page-size captions and selected Radix values intact", () => {
    render(<SystemPagination currentPage={1} totalPages={2} totalItems={40} pageSize={20} onPageChange={()=>{}} onPageSizeChange={()=>{}} />);
    expect(screen.getByText("Per page:").closest("label")).toBeVisible();
    expect(screen.getByRole("combobox",{name:"Per page:"})).toHaveAttribute("title","Per page:");
  });
  it("keeps multi-field group captions and their choices visible", () => {
    render(<div><Label>Select modules</Label><div><Label><input type="checkbox" />College</Label><Label><input type="checkbox" />Jobs</Label></div></div>);
    expect(screen.getByText("Select modules").closest("label")).toBeVisible();
    expect(screen.getByRole("checkbox",{name:"College"}).closest("label")).not.toHaveAttribute("data-input-label");
    expect(screen.getByRole("checkbox",{name:"Jobs"}).closest("label")).not.toHaveAttribute("data-input-label");
  });
});
