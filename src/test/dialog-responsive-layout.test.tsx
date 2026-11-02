import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

it("contains long dialog actions without widening form grids or resizing close/checkbox controls", () => {
  render(<Dialog open><DialogContent><DialogHeader><DialogTitle>Post New Job</DialogTitle><DialogDescription>Create a job listing</DialogDescription></DialogHeader><div className="grid gap-4"><Button>Generate Description, Requirements and Skills with AI</Button><input aria-label="Job title" /></div><DialogFooter><Button>Cancel</Button><Button>Post Job</Button></DialogFooter></DialogContent></Dialog>);
  expect(screen.getByRole("dialog")).toHaveClass(
    "[&>*]:min-w-0", "[&_.grid>*]:min-w-0",
    "[&_[data-slot=button]]:max-w-full", "[&_[data-slot=button]]:whitespace-normal",
    "[&_[data-slot=button]]:h-auto", "[&_[data-slot=button]]:min-h-10",
  );
  expect(screen.getByRole("button", { name: /Generate Description/ })).toHaveAttribute("data-slot", "button");
  expect(screen.getByRole("button", { name: "Close" })).not.toHaveAttribute("data-slot");
  expect(screen.getByRole("heading", { name: "Post New Job" }).parentElement).toHaveClass("pr-8", "min-w-0");
  expect(screen.getByRole("button", { name: "Cancel" }).parentElement).toHaveClass("gap-2", "sm:flex-wrap");
});
