import { useEffect, useState } from "react";
import { EyeOff, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ProviderKind = "payment" | "ai" | "email";
type Status = { providerName: string | null; enabled: boolean; configured: boolean; secretStorageReady: boolean; publicConfig: Record<string, unknown> };

export function ProviderConfigurationPanel({ kind, title, description, providers }: { kind: ProviderKind; title: string; description: string; providers: string[] }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const defaultProvider = providers[0];
  const [providerName, setProviderName] = useState(defaultProvider);
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [modelOrIdentifier, setModelOrIdentifier] = useState("");
  const [saving, setSaving] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  useEffect(() => {
    const load = async () => {
      const accessToken = await token(); if (!accessToken) return;
      const response = await fetch(`/api/v1/admin/providers/${kind}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) return;
      const payload = await response.json() as { data?: Status };
      if (!payload.data) return;
      setStatus(payload.data); setProviderName(payload.data.providerName || defaultProvider); setEnabled(payload.data.enabled);
      const config = payload.data.publicConfig || {};
      setModelOrIdentifier(String(config.model || config.merchant_id || config.sender_id || ""));
    };
    void load();
  }, [kind, defaultProvider]);

  const save = async () => {
    const accessToken = await token(); if (!accessToken) return;
    setSaving(true);
    try {
      const publicConfig = kind === "ai" ? { model: modelOrIdentifier } : kind === "payment" ? { merchant_id: modelOrIdentifier } : { sender_id: modelOrIdentifier };
      const response = await fetch(`/api/v1/admin/providers/${kind}`, {
        method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ providerName, enabled, publicConfig, ...(secret ? { secret } : {}) }),
      });
      const payload = await response.json() as { data?: Status; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Provider configuration was not saved.");
      setStatus(payload.data); setSecret("");
      toast({ title: `${title} saved`, description: "The secret was encrypted server-side and will not be shown again." });
    } catch (error) { toast({ variant: "destructive", title: `${title} not saved`, description: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSaving(false); }
  };

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
    <div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    <div className="flex items-center justify-between rounded-xl bg-white p-3"><span className="text-xs font-semibold text-slate-700">Enable integration</span><Switch checked={enabled} onCheckedChange={setEnabled} disabled={!status?.secretStorageReady && !status?.configured} /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-xs">Provider</Label><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={providerName} onChange={(event) => setProviderName(event.target.value)}>{providers.map((provider) => <option key={provider}>{provider}</option>)}</select></div><div className="space-y-1"><Label className="text-xs">{kind === "ai" ? "Model" : kind === "payment" ? "Merchant ID" : "Sender ID"}</Label><Input value={modelOrIdentifier} onChange={(event) => setModelOrIdentifier(event.target.value)} className="bg-white" /></div></div>
    <div className="space-y-1"><Label className="text-xs">{status?.configured ? "Replace secret (optional)" : "Provider secret"}</Label><Input type="password" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={status?.secretStorageReady ? "Stored securely; never displayed" : "Deployment secret storage is not configured"} disabled={!status?.secretStorageReady} /><p className="flex items-center gap-1 text-xs text-slate-500"><EyeOff className="h-3 w-3" />{status?.configured ? "A secret is configured and masked." : "No secret is configured."}</p></div>
    <Button onClick={save} disabled={saving || (!status?.secretStorageReady && !status?.configured)} size="sm" className="bg-[#071a3d] hover:bg-[#05132d]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save {title}</Button>
  </div>;
}
