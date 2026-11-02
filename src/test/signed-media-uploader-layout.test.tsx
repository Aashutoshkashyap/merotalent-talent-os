import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { SignedMediaUploader } from "@/components/media/SignedMediaUploader";

it("keeps hidden file controls at one pixel and associates each visible label", () => {
  render(<><SignedMediaUploader label="Event banner" module="event_cover" resourceId="event-a" onUploaded={vi.fn()} /><SignedMediaUploader label="Event logo" module="event_cover" resourceId="event-a" onUploaded={vi.fn()} /></>);
  const banner = screen.getByLabelText("Event banner");
  const logo = screen.getByLabelText("Event logo");
  expect(banner).toHaveAttribute("type", "file");
  expect(banner).toHaveClass("sr-only", "h-px", "w-px", "p-0");
  expect(banner).not.toHaveClass("w-full", "h-11", "px-3.5", "py-2");
  expect(banner.id).not.toBe(logo.id);
  expect(screen.getAllByRole("button", { name: "Choose image" })).toHaveLength(2);
});
