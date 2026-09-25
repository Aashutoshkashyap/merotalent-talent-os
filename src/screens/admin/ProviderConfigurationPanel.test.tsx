import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), toast: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: auth.getSession } },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: auth.toast }),
}));

import { ProviderConfigurationPanel } from "./ProviderConfigurationPanel";

const status = (secretStorageReady: boolean) => ({
  providerName: "esewa",
  enabled: false,
  configured: false,
  secretStorageReady,
  publicConfig: {},
});

describe("ProviderConfigurationPanel", () => {
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: "admin-token" } } });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const renderPanel = async (secretStorageReady: boolean) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: status(secretStorageReady) }), { status: 200 })));
    render(<ProviderConfigurationPanel kind="payment" title="eSewa payment" description="Payment provider" providers={["esewa"]} />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  };

  it("enables secret entry when secure storage is configured", async () => {
    await renderPanel(true);

    expect(screen.getByLabelText("Provider secret")).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables secret entry and explains the exact deployment action when storage is unavailable", async () => {
    await renderPanel(false);

    expect(screen.getByLabelText("Provider secret")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("PROVIDER_CONFIG_ENCRYPTION_KEY");
    expect(screen.getByRole("alert")).toHaveTextContent("not your eSewa, AI, or email provider secret");
  });

  it("notifies its parent after a successful save so the health snapshot can refresh", async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: status(true) }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: status(true) }), { status: 200 })));
    render(<ProviderConfigurationPanel kind="payment" title="eSewa payment" description="Payment provider" providers={["esewa"]} onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save eSewa payment" })).toBeEnabled());
    fireEvent.change(screen.getByPlaceholderText("Merchant code supplied by eSewa"), { target: { value: "EPAYTEST" } });

    fireEvent.click(screen.getByRole("button", { name: "Save eSewa payment" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not send an invalid eSewa save when merchant code is missing", async () => {
    await renderPanel(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save eSewa payment" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Save eSewa payment" }));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
