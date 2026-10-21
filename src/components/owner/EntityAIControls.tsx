import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ModuleKey = "jobs" | "mentor" | "events" | "college";

interface EntityAIControlsProps {
  module: ModuleKey;
  entityType: "company" | "job" | "mentor" | "event" | "college";
  entityId: string;
  title: string;
  context: string;
  onDraft: (draft: string) => void;
}

type AIStatus = { configured: boolean; enabled: boolean; providerName: string | null; secretStorageReady: boolean };

const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;
const isNeonStaging = isNeonClientRuntime();
const aiPath = (operation: "byok" | "generate") => isNeonStaging
  ? `/api/v1/neon-staging/ai/${operation}` : `/api/v1/ai/${operation}`;
const authHeaders = async (): Promise<Record<string, string>> => {
  if (isNeonStaging) return {};
  const token = await getToken();
  if (!token) throw new Error("Sign in again to use AI.");
  return { Authorization: `Bearer ${token}` };
};

/**
 * A workspace-scoped AI control.  It has no feature toggle: plan/grant
 * decisions remain Super Admin work.  Every read, BYOK mutation and draft
 * request includes the exact module entity and is re-authorized server-side.
 */
export default function EntityAIControls({ module, entityType, entityId, title, context, onDraft }: EntityAIControlsProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [keywords, setKeywords] = useState("");
  const [providerName, setProviderName] = useState("openai-compatible");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({ module, entity_type: entityType, entity_id: entityId });
      const response = await fetch(`${aiPath("byok")}?${params}`, { headers, credentials: "same-origin", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "AI is unavailable for this entity.");
      setStatus(payload.data);
    } catch (error) {
      setStatus(null);
      toast({ variant: "destructive", title: "AI unavailable", description: error instanceof Error ? error.message : "This entity does not have AI access." });
    } finally { setLoading(false); }
  }, [entityId, entityType, module, toast]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const generate = async () => {
    setGenerating(true);
    try {
      const headers = await authHeaders();
      const response = await fetch(aiPath("generate"), {
        method: "POST", credentials: "same-origin", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ module, entityType, entityId, title: title.trim() || "Untitled", keywords: keywords.trim(), context: context.slice(0, 4000) }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.data?.draft !== "string") throw new Error(payload.error?.message || "Draft generation failed.");
      onDraft(payload.data.draft);
      toast({ title: "Editable AI draft added", description: "Review and edit it before saving or submitting this record." });
    } catch (error) {
      toast({ variant: "destructive", title: "Draft not generated", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setGenerating(false); }
  };

  const saveByok = async () => {
    if (!secret.trim()) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const response = await fetch(aiPath("byok"), {
        method: "PUT", credentials: "same-origin", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ module, entityType, entityId, providerName: providerName.trim(), secret: secret.trim(), enabled: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "AI provider could not be saved.");
      setSecret(""); await loadStatus();
      toast({ title: "Entity AI provider saved", description: "The key is encrypted server-side and never returned to the browser." });
    } catch (error) {
      toast({ variant: "destructive", title: "Provider not saved", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Checking entity AI access…</p>;
  if (!status) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">AI is unavailable for this entity. An active assignment plus the AI feature in its plan or feature grant is required.</p>;

  return <section className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4" aria-label="Entity AI controls">
    <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-violet-700" /><div><p className="text-sm font-semibold text-slate-900">Entity AI controls</p><p className="text-xs text-slate-600">Scoped to this {entityType}; drafts stay editable and are never published automatically.</p></div></div>
    <div className="flex flex-col gap-2 sm:flex-row"><Input value={keywords} onChange={(event) => setKeywords(event.target.value)} maxLength={1000} placeholder="Optional keywords or tone" aria-label="AI draft keywords" /><Button type="button" variant="outline" disabled={generating} onClick={() => void generate()}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{generating ? "Generating…" : "Generate draft"}</Button></div>
    <details className="rounded-xl border border-violet-100 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Use this entity’s own provider key</summary><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"><div><Label htmlFor={`${entityId}-ai-provider`} className="sr-only">Provider name</Label><Input id={`${entityId}-ai-provider`} value={providerName} onChange={(event) => setProviderName(event.target.value)} maxLength={64} placeholder="Provider" /></div><div><Label htmlFor={`${entityId}-ai-secret`} className="sr-only">Provider API key</Label><Input id={`${entityId}-ai-secret`} type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="new-password" placeholder="Provider API key" /></div><Button type="button" disabled={saving || !secret.trim() || !status.secretStorageReady} onClick={() => void saveByok()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}<span className="sr-only">Save provider key</span></Button></div><p className="mt-2 text-xs text-slate-500">{status.configured && status.enabled ? `An encrypted ${status.providerName || "provider"} key is active for this entity.` : "No entity key is configured; the authorized platform provider is used when available."}</p></details>
  </section>;
}
