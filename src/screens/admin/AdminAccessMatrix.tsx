import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sparkles, TimerReset, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OperationsPage } from "./OperationsUI";

type Matrix = { users: any[]; capabilities: any[]; assignments: any[]; entitlements: any[]; featureGrants: any[]; trialSettings: any[]; packages: any[]; aiUsage: any[] };
const FEATURES = ["profile_editing", "media_management", "job_management", "session_management", "event_management", "lead_viewing", "job_applications", "mentor_bookings", "event_registrations", "college_applications", "ai.description.generate", "application_management", "registration_management"];
const pretty = (value: string) => value.replaceAll("_", " ").replaceAll(".", " · ");
const defaultsForModule = (moduleKey?: string): Record<string, boolean> => {
  if (moduleKey === "college") return { profile_editing: true };
  if (moduleKey === "jobs") return { job_management: true };
  if (moduleKey === "mentor") return { profile_editing: true, session_management: true };
  if (moduleKey === "events") return { event_management: true };
  return {};
};

export default function AdminAccessMatrix() {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [packageId, setPackageId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [trialModule, setTrialModule] = useState("college");
  const [trialDays, setTrialDays] = useState("7");
  const [trialEnabled, setTrialEnabled] = useState(true);

  const load = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/v1/admin/access-matrix", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setMatrix(payload.data);
    else toast({ variant: "destructive", title: "Unable to load access", description: payload.error?.message });
  }, [toast]);
  useEffect(() => { void load(); }, [load]);

  const request = async (body: Record<string, unknown>, success: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch("/api/v1/admin/access-matrix", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Access update failed.");
      toast({ title: success });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Access change failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  };

  const users = useMemo(() => (matrix?.users || []).filter((item) => `${item.full_name || ""} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [matrix, query]);
  const selectedUser = matrix?.users.find((item) => item.user_id === userId);
  const selectedAssignments = useMemo(() => (matrix?.assignments || []).filter((item) => item.user_id === userId && item.status === "active"), [matrix, userId]);
  const assignment = selectedAssignments.find((item) => item.id === assignmentId);
  const capability = matrix?.capabilities.find((item) => item.id === assignment?.user_capability_id);
  const moduleKey = capability?.module_capabilities?.module_key as string | undefined;
  const matchingPackages = useMemo(() => (matrix?.packages || []).filter((item) => moduleKey && item.module_scope?.includes(moduleKey)), [matrix, moduleKey]);
  const selectedPackage = (matrix?.packages || []).find((item) => item.id === packageId);
  const selectedEntitlements = (matrix?.entitlements || []).filter((item) => item.user_id === userId);
  const selectedGrants = (matrix?.featureGrants || []).filter((item) => item.user_id === userId);
  const selectedAIUsage = (matrix?.aiUsage || []).filter((item) => item.user_id === userId);
  const scopePayload = () => assignment && moduleKey ? { userId, module: moduleKey, entityType: assignment.entity_type, entityId: assignment.entity_id, note } : null;

  const selectAssignment = (value: string) => {
    const next = selectedAssignments.find((item) => item.id === value);
    const nextCapability = matrix?.capabilities.find((item) => item.id === next?.user_capability_id);
    setAssignmentId(value); setPackageId(""); setExpiresAt(""); setFeatures(defaultsForModule(nextCapability?.module_capabilities?.module_key));
  };
  const grant = () => {
    const scope = scopePayload(); const isFree = selectedPackage?.package_kind === "free";
    if (!scope || (!isFree && !expiresAt)) return;
    void request({ action: "enroll", ...scope, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, source: isFree ? "FREE" : packageId ? "SUPER_ADMIN_PACKAGE" : "ADMIN_MANUAL", packageId: packageId || null, features }, isFree ? "Free access granted" : "Access granted");
  };
  const startTrial = () => { const scope = scopePayload(); if (scope) void request({ action: "trial", ...scope }, "Trial started"); };
  const toggleFeature = (feature: string) => setFeatures((current) => ({ ...current, [feature]: !current[feature] }));
  const setFeature = (feature: string, active: boolean) => { const scope = scopePayload(); if (scope) void request({ action: "feature", ...scope, feature, active }, active ? "Feature granted" : "Feature revoked"); };

  return <OperationsPage>
    <div><h1 className="text-2xl font-display font-bold">Module access</h1><p className="mt-1 text-sm text-muted-foreground">Give an already-assigned administrator Free, Trial, or paid access. The system checks the assignment and entitlement automatically.</p></div>

    <Card><CardHeader><CardTitle className="text-base">1. Choose the person and module</CardTitle><CardDescription>Only modules and entities already assigned to the selected person appear here.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" aria-label="Search users" /><Select value={userId} onValueChange={(value) => { setUserId(value); setAssignmentId(""); setPackageId(""); setFeatures({}); }}><SelectTrigger><SelectValue placeholder="Choose a person" /></SelectTrigger><SelectContent>{users.map((item) => <SelectItem key={item.user_id} value={item.user_id}>{item.full_name || item.email}</SelectItem>)}</SelectContent></Select><Select value={assignmentId} onValueChange={selectAssignment} disabled={!userId}><SelectTrigger><SelectValue placeholder="Choose their module" /></SelectTrigger><SelectContent>{selectedAssignments.map((item) => { const itemCapability = matrix?.capabilities.find((cap) => cap.id === item.user_capability_id); return <SelectItem key={item.id} value={item.id}>{itemCapability?.module_capabilities?.module_key} · {item.entity_type}</SelectItem>; })}</SelectContent></Select></CardContent>{selectedUser && <CardContent className="pt-0 text-sm text-muted-foreground">Selected: {selectedUser.full_name || selectedUser.email}{moduleKey ? ` · ${moduleKey}` : ""}</CardContent>}</Card>

    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRoundPlus className="h-4 w-4" />2. Grant access</CardTitle><CardDescription>Free includes basic features. A paid or manual grant needs an expiry date.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Label htmlFor="package">Access type</Label><Select value={packageId || "manual"} onValueChange={(value) => { setPackageId(value === "manual" ? "" : value); setExpiresAt(""); }} disabled={!assignment}><SelectTrigger id="package"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual access</SelectItem>{matchingPackages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.package_kind === "free" ? " · Free" : ` · ${item.duration_days} days`}</SelectItem>)}</SelectContent></Select></div>{selectedPackage?.package_kind === "free" ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Free access has no automatic expiry. You can revoke it below at any time.</p> : <div className="space-y-2"><Label htmlFor="expiry">Expiry date</Label><Input id="expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={!assignment} /></div>}<div className="space-y-2"><Label htmlFor="note">Internal note <span className="text-muted-foreground">(optional)</span></Label><Input id="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Why is this access being granted?" disabled={!assignment} /></div><div className="flex flex-wrap gap-2"><Button disabled={busy || !assignment || (selectedPackage?.package_kind !== "free" && !expiresAt)} onClick={grant}>Grant access</Button><Button variant="outline" disabled={busy || !assignment} onClick={startTrial}><TimerReset className="mr-2 h-4 w-4" />Start trial</Button></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />3. Current access</CardTitle><CardDescription>Revoke an entitlement to immediately remove protected module access.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm">{!userId && <p className="text-muted-foreground">Choose a person to view their current access.</p>}{userId && selectedEntitlements.length === 0 && <p className="text-muted-foreground">No module access has been granted yet.</p>}{selectedEntitlements.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span><b>{item.module_key}</b> · {item.source} · {item.status}{item.expires_at ? ` · expires ${new Date(item.expires_at).toLocaleDateString()}` : ""}</span>{item.status === "active" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void request({ action: "revoke_entitlement", entitlementId: item.id, note }, "Access revoked")}>Revoke</Button>}</div>)}</CardContent></Card></div>

    <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-medium">Advanced controls</summary><div className="mt-4 grid gap-6 lg:grid-cols-2"><div><p className="mb-3 text-sm text-muted-foreground">Use feature overrides only when the standard Free, Trial, or package features are not enough.</p><div className="grid gap-2 sm:grid-cols-2">{FEATURES.map((feature) => <label key={feature} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(features[feature])} onChange={() => toggleFeature(feature)} disabled={!assignment} />{pretty(feature)}</label>)}</div><div className="mt-4 flex flex-wrap gap-2">{FEATURES.map((feature) => <Button key={feature} size="sm" variant="outline" disabled={busy || !assignment} onClick={() => setFeature(feature, true)}>Grant {pretty(feature)}</Button>)}</div>{selectedGrants.length > 0 && <div className="mt-4 space-y-2 text-sm">{selectedGrants.map((grant) => <div key={grant.id} className="flex items-center justify-between rounded-lg border p-2"><span>{pretty(grant.feature_key)} · {grant.status}</span>{grant.status === "active" && <Button size="sm" variant="ghost" disabled={busy || !assignment} onClick={() => setFeature(grant.feature_key, false)}>Revoke</Button>}</div>)}</div>}</div><div className="space-y-4"><div><p className="mb-3 text-sm text-muted-foreground">AI activity is metadata only; prompts, outputs, and provider secrets are never shown here.</p>{selectedAIUsage.slice(0, 10).map((item) => <div key={item.id} className="mb-2 rounded-lg border p-2 text-sm">{item.module_key} · {item.status} · {new Date(item.created_at).toLocaleString()}</div>)}{userId && selectedAIUsage.length === 0 && <p className="text-sm text-muted-foreground">No AI activity for this person.</p>}</div><div className="border-t pt-4"><p className="mb-3 text-sm font-medium">Trial policy</p><div className="grid gap-3 sm:grid-cols-4"><Select value={trialModule} onValueChange={setTrialModule}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["college", "jobs", "mentor", "events"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Input type="number" min="1" max="365" value={trialDays} onChange={(event) => setTrialDays(event.target.value)} aria-label="Trial duration in days" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={trialEnabled} onChange={(event) => setTrialEnabled(event.target.checked)} />Enabled</label><Button variant="outline" disabled={busy} onClick={() => void request({ action: "trial_settings", module: trialModule, durationDays: Number(trialDays), enabled: trialEnabled, allowIndefiniteManual: false }, "Trial policy saved")}>Save policy</Button></div></div></div></div></details>
  </OperationsPage>;
}
