import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useEffect, useState } from "react";
import { CircleAlert, EyeOff, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ProviderKind = "payment" | "ai" | "email";
const isNeonStaging = isNeonClientRuntime();
type Status = { providerName: string | null; enabled: boolean; configured: boolean; secretStorageReady: boolean; publicConfig: Record<string, unknown> };
type ProviderConfigurationPanelProps = {
  kind: ProviderKind;
  title: string;
  description: string;
  providers: string[];
  onSaved?: () => void | Promise<void>;
};

export function ProviderConfigurationPanel({ kind, title, description, providers, onSaved }: ProviderConfigurationPanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const defaultProvider = providers[0];
  const [providerName, setProviderName] = useState(defaultProvider);
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [modelOrIdentifier, setModelOrIdentifier] = useState("");
  const [environment, setEnvironment] = useState<"production" | "uat">("production");
  const [saving, setSaving] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  useEffect(() => {
    const load = async () => {
      const accessToken = isNeonStaging ? null : await token(); if (!isNeonStaging && !accessToken) return;
      const response = await fetch(`${isNeonStaging ? "/api/v1/neon-staging" : "/api/v1"}/admin/providers/${kind}`,
        { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { data?: Status };
      if (!payload.data) return;
      setStatus(payload.data); setProviderName(payload.data.providerName || defaultProvider); setEnabled(payload.data.enabled);
      const config = payload.data.publicConfig || {};
      setModelOrIdentifier(String(config.model || config.merchant_code || config.from_address || ""));
      if (config.environment === "uat" || config.environment === "production") setEnvironment(config.environment);
    };
    void load();
  }, [kind, defaultProvider]);

  const save = async () => {
    const accessToken = isNeonStaging ? null : await token();
    if (!isNeonStaging && !accessToken) {
      toast({ variant: "destructive", title: `${title} not saved`, description: "Sign in again before saving provider settings." });
      return;
    }
    const trimmedSecret = secret.trim();
    const merchantCode = modelOrIdentifier.trim();
    if (kind === "payment") {
      if (!merchantCode) {
        toast({ variant: "destructive", title: "eSewa merchant code is required." });
        return;
      }
      if (!/^[A-Za-z0-9-]{2,128}$/.test(merchantCode)) {
        toast({ variant: "destructive", title: "Enter a valid eSewa merchant code." });
        return;
      }
      if (enabled && environment === "production" && merchantCode === "EPAYTEST") {
        toast({ variant: "destructive", title: "Test merchant code EPAYTEST cannot be enabled in production." });
        return;
      }
    }
    if (enabled && !status?.configured && !trimmedSecret) {
      toast({ variant: "destructive", title: `${title} not saved`, description: "A provider secret is required before this provider can be enabled." });
      return;
    }
    setSaving(true);
    try {
      const publicConfig = kind === "ai" ? { model: modelOrIdentifier } : kind === "payment" ? { merchant_code: merchantCode, environment } : { from_address: modelOrIdentifier };
      const response = await fetch(`${isNeonStaging ? "/api/v1/neon-staging" : "/api/v1"}/admin/providers/${kind}`, {
        method: "PUT", credentials: "same-origin",
        headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ providerName, enabled, publicConfig, ...(trimmedSecret ? { secret: trimmedSecret } : {}) }),
      });
      const payload = await response.json() as { data?: Status; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Provider configuration was not saved.");
      setStatus(payload.data); setSecret("");
      try {
        await onSaved?.();
      } catch {
        // The provider write is already confirmed. A stale dashboard summary
        // must never turn that successful save into a false failure toast.
      }
      toast({ title: `${title} saved`, description: "The secret was encrypted server-side and will not be shown again." });
    } catch (error) { toast({ variant: "destructive", title: `${title} not saved`, description: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSaving(false); }
  };

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
    <div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    <div className="flex items-center justify-between rounded-xl bg-white p-3"><span className="text-xs font-semibold text-slate-700">Enable integration</span><Switch checked={enabled} onCheckedChange={setEnabled} disabled={!status?.secretStorageReady} /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-xs">Provider</Label><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={providerName} onChange={(event) => setProviderName(event.target.value)}>{providers.map((provider) => <option key={provider}>{provider}</option>)}</select></div><div className="space-y-1"><Label className="text-xs">{kind === "ai" ? "Model" : kind === "payment" ? "Merchant code" : "From address"}</Label><Input value={modelOrIdentifier} onChange={(event) => setModelOrIdentifier(event.target.value)} placeholder={kind === "payment" ? "Merchant code supplied by eSewa" : undefined} className="bg-white" /></div></div>
    {kind === "payment" && <div className="space-y-1"><Label className="text-xs">eSewa environment</Label><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={environment} onChange={(event) => setEnvironment(event.target.value === "uat" ? "uat" : "production")}><option value="production">Production</option><option value="uat">UAT</option></select><p className="text-xs text-slate-500">Use UAT only with eSewa-issued test credentials; the return path always verifies status server-side.</p></div>}
    <div className="space-y-1"><Label htmlFor={`${kind}-provider-secret`} className="text-xs">{status?.configured ? "Replace secret (optional)" : "Provider secret"}</Label><Input id={`${kind}-provider-secret`} type="password" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={status?.secretStorageReady ? "Stored securely; never displayed" : "Secure storage must be configured first"} disabled={!status?.secretStorageReady} aria-describedby={`${kind}-provider-secret-help`} /><p id={`${kind}-provider-secret-help`} className="flex items-center gap-1 text-xs text-slate-500"><EyeOff className="h-3 w-3" />{status?.configured ? "An encrypted provider secret is stored and masked." : "No encrypted provider secret is stored."} This is the external provider credential, not the application encryption key.</p></div>
    {status && !status.secretStorageReady && <div role="alert" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Secure provider-secret storage is not configured on this deployment.</strong> Ask the deployment administrator to configure <code>PROVIDER_CONFIG_ENCRYPTION_KEY</code>. This server-only application encryption key protects provider credentials; it is not your eSewa, AI, or email provider secret.</p></div>}
    <Button onClick={save} disabled={saving || !status?.secretStorageReady} size="sm" className="bg-[#071a3d] hover:bg-[#05132d]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save {title}</Button>
  </div>;
}
