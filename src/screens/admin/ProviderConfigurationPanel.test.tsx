import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: auth.getSession } },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
});
