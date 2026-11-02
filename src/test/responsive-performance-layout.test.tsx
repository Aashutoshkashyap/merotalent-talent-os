import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { OperationsPage } from "@/screens/admin/OperationsUI";
import { Button } from "@/components/ui/button";

const source = (file: string) => readFileSync(`${process.cwd()}/${file}`, "utf8");
describe("responsive performance regressions", () => {
  it("contains and wraps admin header actions without shrinking site typography", () => {
    const { container } = render(<OperationsPage><div className="flex items-center justify-between"><div><h1>Event management</h1></div><div className="flex gap-2"><Button>Live Check-in Scanner</Button><Button>Create Event</Button></div></div></OperationsPage>);
    expect(container.firstChild).toHaveClass(
      "[&>div:first-child]:flex-wrap",
      "max-sm:[&>div:first-child]:flex-col",
      "max-sm:[&>div:first-child]:items-stretch",
      "[&>div:first-child>div]:min-w-0",
      "[&>div:first-child>div]:max-w-full",
      "[&>div:first-child>div.flex]:flex-wrap",
      "[&>div:first-child_button]:max-w-full",
      "[&>div:first-child_button]:whitespace-normal",
      "[&>div:first-child_button]:h-auto",
      "[&>div:first-child_button]:min-h-10",
    );
    expect(screen.getByRole("button", { name: "Create Event" })).toBeEnabled();
  });
  it("keeps status pills compact without clipping long labels or shrinking global type", () => {
    render(<div className="flex flex-col"><Badge>Recovery needed</Badge></div>);
    expect(screen.getByText("Recovery needed")).toHaveClass("w-fit", "max-w-full", "min-w-0", "shrink-0", "whitespace-normal", "break-words", "leading-5", "text-xs");
  });
  it("does not create ancestor scroll containers that trap sticky headers", () => {
    for (const file of ["src/layouts/AdminLayout.tsx", "src/layouts/DashboardLayout.tsx"]) {
      expect(source(file)).toContain("w-full overflow-x-clip");
    }
    expect(source("src/components/admin/AdminHeader.tsx")).toContain("sticky top-0");
    expect(source("src/components/dashboard/DashboardHeader.tsx")).toContain("sticky top-0");
    expect(source("src/components/landing/PublicPageLayout.tsx")).toContain("overflow-x-clip");
  });
  it("provides tablet navigation until the desktop links become visible", () => {
    const navbar = source("src/components/landing/Navbar.tsx");
    expect(navbar).toContain("fixed inset-x-0 top-0");
    expect(navbar).toContain("xl:flex");
    expect(navbar).toContain("text-[#c2410c] xl:hidden");
    expect(navbar).toContain("max-h-[calc(100dvh-68px)] overflow-y-auto");
  });
  it("loads expensive administration routes on demand rather than in the entry bundle", () => {
    const app = source("src/App.tsx");
    for (const page of ["AdminUsers", "AdminReports", "AdminDashboard", "AdminSettings"]) {
      expect(app).toContain(`const ${page} = lazy(() => import("./screens/admin/${page}"))`);
      expect(app).not.toContain(`import ${page} from`);
    }
    expect(source("src/layouts/AdminLayout.tsx")).toContain("<Suspense");
  });
});
