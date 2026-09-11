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
  const [query, setQuery] = useState(""); const [userId, setUserId] = useState(""); const [assignmentId, setAssignmentId] = useState("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [packageId, setPackageId] = useState(""); const [expiresAt, setExpiresAt] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false); const [trialModule, setTrialModule] = useState("college"); const [trialDays, setTrialDays] = useState("7"); const [trialEnabled, setTrialEnabled] = useState(true);
  const load = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token; if (!token) return;
    const response = await fetch("/api/v1/admin/access-matrix", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const payload = await response.json();
    if (response.ok) setMatrix(payload.data); else toast({ variant: "destructive", title: "Unable to load access", description: payload.error?.message });
  }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const users = useMemo(() => (matrix?.users || []).filter((item) => `${item.full_name || ""} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [matrix, query]);
  const selectedAssignments = useMemo(() => (matrix?.assignments || []).filter((item) => item.user_id === userId && item.status === "active"), [matrix, userId]);
  const assignment = selectedAssignments.find((item) => item.id === assignmentId);
  const capability = matrix?.capabilities.find((item) => item.id === assignment?.user_capability_id);
  const moduleKey = capability?.module_capabilities?.module_key as string | undefined;
  const matchingPackages = useMemo(() => (matrix?.packages || []).filter((item) => moduleKey && item.module_scope?.includes(moduleKey)), [matrix, moduleKey]);
  const toggleFeature = (feature: string) => setFeatures((current) => ({ ...current, [feature]: !current[feature] }));
  const saveTrialSettings = async () => request({ action: "trial_settings", module: trialModule, durationDays: Number(trialDays), enabled: trialEnabled, allowIndefiniteManual: false }, "Trial settings saved");
  const request = async (body: Record<string, unknown>, success: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token; if (!token) return;
    setBusy(true); try {
      const response = await fetch("/api/v1/admin/access-matrix", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Access update failed."); toast({ title: success }); await load();
    } catch (error) { toast({ variant: "destructive", title: "Access change failed", description: error instanceof Error ? error.message : "Please try again." }); } finally { setBusy(false); }
  };
  const scopePayload = () => assignment && moduleKey ? { userId, module: moduleKey, entityType: assignment.entity_type, entityId: assignment.entity_id, note } : null;
  const selectedPackage = (matrix?.packages || []).find((item) => item.id === packageId);
  const enroll = () => {
    const scope = scopePayload();
    const isFree = selectedPackage?.package_kind === "free";
    if (!scope || (!isFree && !expiresAt)) return;
    void request({ action: "enroll", ...scope, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, source: isFree ? "FREE" : packageId ? "SUPER_ADMIN_PACKAGE" : "ADMIN_MANUAL", packageId: packageId || null, features }, isFree ? "Free entitlement created and features granted" : "Manual enrollment created and features granted");
  };
  const trial = () => { const scope = scopePayload(); if (scope) void request({ action: "trial", ...scope }, "Trial started"); };
  const setFeature = (feature: string, active: boolean) => { const scope = scopePayload(); if (scope) void request({ action: "feature", ...scope, feature, active }, active ? "Feature granted" : "Feature revoked"); };
  const revokeEntitlement = (entitlementId: string) => void request({ action: "revoke_entitlement", entitlementId, note }, "Entitlement revoked");
  return <OperationsPage>
    <div><h1 className="text-2xl font-display font-bold">User & access matrix</h1><p className="text-sm text-muted-foreground">User → module → entity → features → entitlement. Server-side authorization and audit logs apply to every change.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Platform trial policy</CardTitle><CardDescription>Seven days by default. Approval alone does not start a trial.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><Select value={trialModule} onValueChange={setTrialModule}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["college", "jobs", "mentor", "events"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Input type="number" min="1" max="365" value={trialDays} onChange={(event) => setTrialDays(event.target.value)} aria-label="Trial duration in days" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={trialEnabled} onChange={(event) => setTrialEnabled(event.target.checked)} />Enabled</label><Button disabled={busy} onClick={() => void saveTrialSettings()}>Save policy</Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Select user and assigned scope</CardTitle><CardDescription>First grant the module and its exact entity in Access Requests/Role Management. Enrollment can only activate that existing scope.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user name or email" aria-label="Search users" /><Select value={userId} onValueChange={(value) => { setUserId(value); setAssignmentId(""); setPackageId(""); setFeatures({}); }}><SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger><SelectContent>{users.map((item) => <SelectItem key={item.user_id} value={item.user_id}>{item.full_name || item.email} · {item.account_status}</SelectItem>)}</SelectContent></Select><Select value={assignmentId} onValueChange={(value) => { const next = selectedAssignments.find((item) => item.id === value); const nextCapability = matrix?.capabilities.find((cap) => cap.id === next?.user_capability_id); setAssignmentId(value); setPackageId(""); setFeatures(defaultsForModule(nextCapability?.module_capabilities?.module_key)); }} disabled={!userId}><SelectTrigger><SelectValue placeholder="Choose module entity" /></SelectTrigger><SelectContent>{selectedAssignments.map((item) => <SelectItem key={item.id} value={item.id}>{matrix?.capabilities.find((cap) => cap.id === item.user_capability_id)?.module_capabilities?.module_key} · {item.entity_type} · {item.entity_id.slice(0, 8)}</SelectItem>)}</SelectContent></Select></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-3"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TimerReset className="h-4 w-4" />Start free trial</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Uses the Super Admin policy and blocks a duplicate trial for the same user, module and entity.</p><Button disabled={busy || !assignment} onClick={trial}>Start trial</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRoundPlus className="h-4 w-4" />Entitlement grant</CardTitle><CardDescription>Choose a Free package to create a real Freemium entitlement; manual/package grants create no payment record.</CardDescription></CardHeader><CardContent className="space-y-3"><Label htmlFor="package">Package / tier</Label><Select value={packageId || "manual"} onValueChange={(value) => { setPackageId(value === "manual" ? "" : value); setExpiresAt(""); }}><SelectTrigger id="package"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual access only</SelectItem>{matchingPackages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.package_kind === "free" ? "Free, no expiry" : `${item.duration_days} days`}</SelectItem>)}</SelectContent></Select>{selectedPackage?.package_kind === "free" ? <p className="text-sm text-muted-foreground">Free access is an active entitlement with no automatic expiry. It remains revocable by Super Admin.</p> : <><Label htmlFor="enrollment-expiry">Expiry</Label><Input id="enrollment-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></>}<Label htmlFor="enrollment-note">Reason</Label><Input id="enrollment-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Internal audit note" /><Button disabled={busy || !assignment || (selectedPackage?.package_kind !== "free" && !expiresAt)} onClick={enroll}>Grant access</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />Features</CardTitle><CardDescription>Selected features are materialized as auditable entity grants.</CardDescription></CardHeader><CardContent className="space-y-2">{FEATURES.map((feature) => <label key={feature} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(features[feature])} onChange={() => toggleFeature(feature)} />{pretty(feature)}</label>)}<div className="mt-3 flex flex-wrap gap-2">{FEATURES.map((feature) => <Button key={feature} size="sm" variant="outline" disabled={busy || !assignment} onClick={() => setFeature(feature, true)}>Grant {pretty(feature)}</Button>)}</div></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" />Effective access & AI activity</CardTitle><CardDescription>Separate ledger records preserve tier provenance, grants, and safe AI usage metadata—never provider secrets.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm">{!userId ? <p className="text-muted-foreground">Choose a user to inspect their entitlements, feature grants, and AI activity.</p> : <>{(matrix?.entitlements || []).filter((item) => item.user_id === userId).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span>{item.module_key} · {item.entity_type} · <b>{item.source}</b> · {item.status} · expires {item.expires_at ? new Date(item.expires_at).toLocaleString() : "indefinitely"}</span>{item.status === "active" && <Button size="sm" variant="outline" disabled={busy} onClick={() => revokeEntitlement(item.id)}>Revoke</Button>}</div>)}{(matrix?.featureGrants || []).filter((item) => item.user_id === userId).map((item) => <div key={item.id} className="rounded-xl border p-3">Feature {pretty(item.feature_key)} · {item.status}</div>)}{(matrix?.aiUsage || []).filter((item) => item.user_id === userId).map((item) => <div key={item.id} className="rounded-xl border p-3">AI · {item.module_key} · {item.status} · {new Date(item.created_at).toLocaleString()}</div>)}</>}</CardContent></Card>
  </OperationsPage>;
}
