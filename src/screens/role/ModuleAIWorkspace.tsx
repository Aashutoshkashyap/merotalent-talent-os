import { useEffect, useMemo, useState } from "react";
import { Bot, LockKeyhole } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EntityAIControls from "@/components/owner/EntityAIControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AIScope = { id: string; module: "jobs" | "mentor" | "events"; entityType: "company" | "job" | "mentor" | "event"; entityId: string };
const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
const label = (scope: AIScope) => `${({ jobs: "Jobs", mentor: "Mentor", events: "Events" }[scope.module])} · ${scope.entityType} · ${scope.entityId.slice(0, 8)}`;

/** A focused dashboard workspace for assigned module entities, not a global AI settings page. */
export default function ModuleAIWorkspace() {
  const { user } = useAuth();
  const [scopes, setScopes] = useState<AIScope[]>([]);
  const [scopeId, setScopeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      if (isNeonStaging) {
        try {
          const response = await fetch("/api/v1/neon-staging/ai/scopes", { credentials: "same-origin", cache: "no-store" });
          const payload = await response.json();
          if (!response.ok || !Array.isArray(payload.data)) throw new Error("Assigned entities unavailable.");
          if (mounted) {
            const next = payload.data as AIScope[];
            setScopes(next);
            setScopeId(current => current && next.some(item => item.id === current) ? current : next[0]?.id || "");
          }
        } catch { if (mounted) setScopes([]); }
        finally { if (mounted) setLoading(false); }
        return;
      }
      const { data, error } = await (supabase as any).from("entity_admin_assignments")
        .select("id,entity_type,entity_id,status,user_module_capabilities!inner(status,module_capabilities!inner(module_key,is_active))")
        .eq("user_id", user.id).eq("status", "active");
      if (!mounted) return;
      if (error) { setScopes([]); setLoading(false); return; }
      const next = (data ?? []).flatMap((row: any) => {
        const moduleKey = row.user_module_capabilities?.module_capabilities?.module_key;
        const active = row.user_module_capabilities?.status === "active" && row.user_module_capabilities?.module_capabilities?.is_active;
        const valid = (moduleKey === "jobs" && ["company", "job"].includes(row.entity_type)) || (moduleKey === "mentor" && row.entity_type === "mentor") || (moduleKey === "events" && row.entity_type === "event");
        return active && valid ? [{ id: row.id, module: moduleKey, entityType: row.entity_type, entityId: row.entity_id }] : [];
      }) as AIScope[];
      setScopes(next); setScopeId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || ""); setLoading(false);
    };
    void load(); return () => { mounted = false; };
  }, [user]);

  const selected = useMemo(() => scopes.find((scope) => scope.id === scopeId) ?? null, [scopeId, scopes]);
  return <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
    <header><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700"><Bot className="h-4 w-4" />Module AI workspace</p><h1 className="text-3xl font-black tracking-tight text-slate-900">AI for assigned entities</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Choose an entity you are assigned to manage. Your plan and feature grant are checked again on the server for every provider change and draft request.</p></header>
    <Card><CardHeader><CardTitle className="text-base">Managed entity</CardTitle><CardDescription>This list comes from your own active entity assignments; it is not an editable permission selector.</CardDescription></CardHeader><CardContent>{loading ? <p className="text-sm text-slate-500">Loading assigned entities…</p> : !scopes.length ? <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><LockKeyhole className="h-4 w-4 shrink-0" />No Jobs, Mentor, or Events entity is assigned to this account.</p> : <Select value={scopeId} onValueChange={(value) => { setScopeId(value); setDraft(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{scopes.map((scope) => <SelectItem key={scope.id} value={scope.id}>{label(scope)}</SelectItem>)}</SelectContent></Select>}</CardContent></Card>
    {selected ? <Card><CardHeader><CardTitle className="text-base">Generate an editable draft</CardTitle><CardDescription>AI text is not saved or published automatically. Review it, then use the matching module editor to save approved content.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="ai-workspace-title">Content title</Label><input id="ai-workspace-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="e.g. Senior designer role" /></div><div className="space-y-2"><Label htmlFor="ai-workspace-context">Public context</Label><input id="ai-workspace-context" value={context} onChange={(event) => setContext(event.target.value)} maxLength={1000} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="Public details only" /></div></div><EntityAIControls module={selected.module} entityType={selected.entityType} entityId={selected.entityId} title={title || `${selected.module} content`} context={context} onDraft={setDraft} /><div className="space-y-2"><Label htmlFor="ai-workspace-draft">Editable draft</Label><Textarea id="ai-workspace-draft" value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} placeholder="A generated draft appears here. You remain in control of what is saved." /></div></CardContent></Card> : null}
  </main>;
}
