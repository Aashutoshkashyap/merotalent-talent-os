import { Label as InputFieldLabel } from "@/components/ui/label";
import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { listAdminResource } from "@/lib/admin/admin-client";
import { ShieldCheck, Clock, Loader2, UserCheck, Inbox } from "lucide-react";
import { paymentErrorMessage } from "@/lib/payments/browser-checkout";
const isNeonStaging = isNeonClientRuntime();
async function stagingRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const payload = await response.json();
  if (!response.ok) throw new Error(paymentErrorMessage(payload, "The request failed."));
  return payload.data;
}

interface AccessRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_modules: string[];
  assigned_capabilities?: string[];
  organization?: string | null;
  decision_note?: string | null;
  college_name?: string;
  payment_status?: string;
  amount_due?: number; amount_paid?: number; currency?: string; payment_provider?: string;
  transaction_reference?: string; activated_at?: string; expires_at?: string; paid_at?: string;
  applicant_phone?: string | null;
  requested_entity_scopes?: Array<{ module_key: string; proof?: { fileName: string } }>;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
}

interface EntityScopeRequest {
  id: string;
  user_id: string;
  module_key: string;
  entity_type: string;
  entity_id: string | null;
  request_kind: "claim" | "create";
  request_data: { name?: string; location?: string; email?: string; phone?: string };
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  payment_status: "not_started" | "pending" | "success" | "failed" | "cancelled" | "expired";
  college_name?: string;
  applicant_name?: string;
  applicant_email?: string;
  decision_note: string | null;
  created_at: string;
}

const canonicalModuleKey = (moduleKey: string) => ({
  institution: "college", institutions: "college", colleges: "college",
  mentors: "mentor", company: "jobs", companies: "jobs", job: "jobs",
  event: "events", competitions: "events", competition: "events", course: "courses", lms: "courses",
}[moduleKey] || moduleKey);

const scopeSource = (moduleKey: string) => {
  switch (canonicalModuleKey(moduleKey)) {
    case "college": return { table: "institutes", entityType: "college", labelColumn: "name" };
    case "mentor": return { table: "mentors", entityType: "mentor", labelColumn: "headline" };
    case "jobs": return { table: "companies", entityType: "company", labelColumn: "name" };
    case "events": return { table: "events", entityType: "event", labelColumn: "title" };
    case "courses": return { table: "courses", entityType: "course", labelColumn: "title" };
    default: return null;
  }
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "The request decision could not be completed.";
};

export default function AdminAccessRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [entityScopeRequests, setEntityScopeRequests] = useState<EntityScopeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [scopeRequest, setScopeRequest] = useState<AccessRequest | null>(null);
  const [scopeModule, setScopeModule] = useState("");
  const [scopeEntityId, setScopeEntityId] = useState("");
  const [scopeEntities, setScopeEntities] = useState<Array<{ id: string; label: string }>>([]);
  const [isLoadingScopes, setIsLoadingScopes] = useState(false);
  const [isAssigningScope, setIsAssigningScope] = useState(false);
  const [assignments, setAssignments] = useState<Array<{ id: string; applicant_name: string; applicant_email: string; college_name: string }>>([]);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isNeonStaging) {
        const [scopeRows, assignmentRows, moduleRows] = await Promise.all([
          stagingRequest("/api/v1/neon-staging/college-scopes?admin=true"),
          stagingRequest("/api/v1/neon-staging/college-scopes/assignments"),
          stagingRequest("/api/v1/neon-staging/module-access?admin=true"),
        ]);
        setRequests(moduleRows.requests);
        setEntityScopeRequests(scopeRows as EntityScopeRequest[]);
        setAssignments(assignmentRows);
        setIsLoading(false);
        return;
      }
      const data = await listAdminResource<AccessRequest>("access-requests");
      setRequests(data);
      const { data: scopeRequests, error: scopeError } = await (supabase as any)
        .from("entity_scope_requests")
        .select("id,user_id,module_key,entity_type,entity_id,request_kind,request_data,reason,status,payment_status,decision_note,created_at")
        .order("created_at", { ascending: false });
      if (scopeError) throw scopeError;
      const rows = (scopeRequests || []) as EntityScopeRequest[];
      const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
      const collegeIds = [...new Set(rows.map((row) => row.entity_id).filter((id): id is string => Boolean(id)))];
      const [{ data: profiles }, { data: colleges }] = await Promise.all([
        userIds.length
          ? (supabase as any).from("profiles").select("user_id,full_name,email").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
        collegeIds.length
          ? (supabase as any).from("institutes").select("id,name").in("id", collegeIds)
          : Promise.resolve({ data: [] }),
      ]);
      const profileByUser = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
      const collegeById = new Map((colleges || []).map((college: any) => [college.id, college.name]));
      setEntityScopeRequests(rows.map((row) => {
        const profile = profileByUser.get(row.user_id) as any;
        return {
          ...row,
          college_name: (row.request_data?.name || (row.entity_id ? (collegeById.get(row.entity_id) as string | undefined) : undefined) || "College name unavailable") as string,
          applicant_name: profile?.full_name || "Applicant",
          applicant_email: profile?.email || row.request_data?.email || "Email unavailable",
        };
      }));
    } catch (error) {
      setRequests([]);
      setEntityScopeRequests([]);
      toast({
        variant: "destructive",
        title: "Requests could not be loaded",
        description: errorMessage(error),
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const source = scopeSource(scopeModule);
    if (!scopeRequest || !source) return;
    let active = true;
    setScopeEntityId("");
    setScopeEntities([]);
    setIsLoadingScopes(true);
    void (async () => {
      if (isNeonStaging) {
        try {
          const entities = await stagingRequest(`/api/v1/neon-staging/admin/access?mode=entities&module=${encodeURIComponent(canonicalModuleKey(scopeModule))}`) as Array<{ id: string; label: string }>;
          if (active) setScopeEntities(entities);
        } catch (error) {
          if (active) toast({ variant: "destructive", title: "Colleges unavailable", description: errorMessage(error) });
        } finally { if (active) setIsLoadingScopes(false); }
        return;
      }
      const { data, error } = await (supabase as any)
        .from(source.table)
        .select(`id,${source.labelColumn}`)
        .is("deleted_at", null)
        .order(source.labelColumn)
        .limit(300);
      if (active && !error) {
        setScopeEntities((data || []).map((item: Record<string, unknown>) => ({
          id: String(item.id),
          label: String(item[source.labelColumn] || "Untitled entity"),
        })));
      }
      if (active) setIsLoadingScopes(false);
    })();
    return () => { active = false; };
  }, [scopeModule, scopeRequest, toast]);

  const handleUpdateStatus = async (request: AccessRequest, newStatus: "approved" | "rejected") => {
    setUpdatingId(request.id);
    try {
      if (isNeonStaging) {
        await stagingRequest("/api/v1/neon-staging/module-access", { method: "PATCH",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.id, approve: newStatus === "approved" }) });
        toast({ title: newStatus === "approved" ? "Request approved" : "Request rejected" });
        await fetchRequests(); return;
      }
      // The trusted RPC grants only the requested permissions and records the
      // audit event. A rejected delegated-access request must not deactivate
      // the person's regular MeroTalent account.
      const { error } = await (supabase as any).rpc(
        "admin_decide_sub_admin_request",
        { p_request_id: request.id, p_approve: newStatus === "approved", p_note: null },
      );

      if (error) throw error;

      toast({
        title: newStatus === "approved" ? "Request Approved!" : "Request Rejected",
        description: newStatus === "approved"
          ? `${request.user_name} has been granted module management access.`
          : `Request for ${request.user_name} has been rejected.`,
      });

      await fetchRequests();
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed", description: errorMessage(error) });
    } finally {
      setUpdatingId(null);
    }
  };

  const decideEntityScopeRequest = async (request: EntityScopeRequest, approve: boolean) => {
    setUpdatingId(request.id);
    try {
      if (isNeonStaging) {
        await stagingRequest("/api/v1/neon-staging/college-scopes", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: request.id, approve }),
        });
        toast({ title: approve ? "College scope approved" : "College scope rejected" });
        await fetchRequests();
        return;
      }
      const { error } = await (supabase as any).rpc("admin_decide_entity_scope_request", {
        p_request_id: request.id,
        p_approve: approve,
        p_note: null,
      });
      if (error) throw error;
      toast({ title: approve ? "College scope approved" : "College scope rejected" });
      await fetchRequests();
    } catch (error) {
      toast({ variant: "destructive", title: "Entity scope decision failed", description: errorMessage(error) });
    } finally {
      setUpdatingId(null);
    }
  };

  const grantComplimentary = async (request: EntityScopeRequest, kind: "free" | "trial") => {
    setUpdatingId(request.id);
    try {
      const result = await stagingRequest("/api/v1/neon-staging/college-scopes/complimentary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, kind }),
      });
      toast({ title: result.duplicate ? "College access already active" : `${kind === "trial" ? "Trial" : "Free plan"} activated` });
      await fetchRequests();
    } catch (error) {
      toast({ variant: "destructive", title: "College access was not activated", description: errorMessage(error) });
    } finally { setUpdatingId(null); }
  };

  const openScopeAssignment = (request: AccessRequest) => {
    const firstModule = canonicalModuleKey(request.assigned_capabilities?.[0] || request.requested_modules[0] || "");
    setScopeRequest(request);
    setScopeModule(firstModule);
  };

  const assignScope = async () => {
    const source = scopeSource(scopeModule);
    if (!scopeRequest || !scopeEntityId || !source) return;
    setIsAssigningScope(true);
    try {
      if (isNeonStaging) {
        await stagingRequest("/api/v1/neon-staging/module-access/scopes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: scopeRequest.id, module: canonicalModuleKey(scopeModule), entityId: scopeEntityId }),
        });
        toast({ title: "Entity scope assigned" });
        setScopeRequest(null); await fetchRequests();
        return;
      }
      const { error } = await (supabase as any).rpc("admin_assign_entity_scope", {
        p_user_id: scopeRequest.user_id,
        p_module_key: scopeModule,
        p_entity_type: source.entityType,
        p_entity_id: scopeEntityId,
        p_source_request_id: scopeRequest.id,
        p_scopes: {},
      });
      if (error) throw error;
      toast({ title: "Entity scope assigned", description: `${scopeRequest.user_name} can now manage the selected entity when its subscription permits access.` });
      setScopeRequest(null);
      await fetchRequests();
    } catch (error) {
      toast({ variant: "destructive", title: "Scope assignment failed", description: errorMessage(error) });
    } finally {
      setIsAssigningScope(false);
    }
  };

  return (
    <OperationsPage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Access requests</h1>
          <p className="text-muted-foreground text-sm">
            Review requests for delegated module access.
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#071a3d]" />
            Request queue
          </CardTitle>
          <CardDescription>
            Approval grants actual module capabilities. Use entity assignments to scope an approved person to each college, mentor, company, event, job, or course they may manage.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-base">No access requests yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Requests for delegated module access will appear here for review.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Requested Modules</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="font-bold text-sm text-[#0f172a]">{req.user_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{req.user_email}</p>
                          {req.applicant_phone && <p className="text-xs text-muted-foreground">{req.applicant_phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.requested_modules.map((mod) => (
                            <Badge key={mod} variant="secondary" className="capitalize text-[10px] bg-slate-100">
                              {mod}
                            </Badge>
                          ))}
                        </div>
                        {req.assigned_capabilities && req.assigned_capabilities.length > 0 && (
                          <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                            Granted: {req.assigned_capabilities.join(", ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.organization && <p className="mt-1 text-[10px] text-muted-foreground">{req.organization}</p>}
                        {req.college_name && <p className="mt-1 text-xs font-semibold">College: {req.college_name}</p>}
                        {isNeonStaging && <p className="mt-1 text-xs">Payment: {req.payment_status?.replaceAll("_", " ") || "not started"}</p>}
                        {isNeonStaging && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">Request and payment preview</summary>
                          <p className="mt-2 break-all">Request: {req.id} · Account: {req.user_id}</p>
                          <p>Requested role: delegated module administrator</p><p>Approval: {req.status}</p>
                          <p>Amount due: {req.currency || "NPR"} {Number(req.amount_due || 0).toLocaleString()} · Paid: {req.currency || "NPR"} {req.payment_status === "success" ? Number(req.amount_paid || 0).toLocaleString() : "0"}</p>
                          <p>Provider: {req.payment_provider || "not started"} · Reference: {req.transaction_reference || "not assigned"}</p>
                          <p>Paid: {req.paid_at ? new Date(req.paid_at).toLocaleString() : "not confirmed"}</p>
                          <p>Activation: {req.activated_at ? new Date(req.activated_at).toLocaleString() : "awaiting payment, approval or scope"}</p>
                          <p>Expiry: {req.expires_at ? new Date(req.expires_at).toLocaleString() : "not activated"}</p>
                          <p className="whitespace-pre-wrap">{req.reason}</p>
                        </details>}
                        {isNeonStaging && req.requested_entity_scopes?.filter(scope => scope.proof).map(scope => (
                          <button key={scope.module_key} type="button" className="mt-1 block text-xs underline" onClick={() => {
                            void stagingRequest(`/api/v1/neon-staging/module-access/proofs?requestId=${req.id}&module=${scope.module_key}`)
                              .then(result => window.open(result.signedUrl, "_blank", "noopener,noreferrer"))
                              .catch(error => toast({ variant: "destructive", title: "Document unavailable", description: errorMessage(error) }));
                          }}>View {scope.module_key} proof: {scope.proof?.fileName}</button>
                        ))}
                        {req.decision_note && <p className="mt-1 text-[10px] text-muted-foreground">Decision: {req.decision_note}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {req.status === "approved" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>
                        ) : req.status === "rejected" ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : req.status === "cancelled" ? (
                          <Badge variant="outline" className="text-slate-500">Cancelled</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            <Clock className="mr-1 h-3 w-3 inline" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {req.status === "pending" && (
                            <Button
                              size="sm"
                              className="h-7 bg-[#071a3d] text-white hover:bg-[#05132d] text-[10px]"
                              onClick={() => handleUpdateStatus(req, "approved")}
                              disabled={updatingId === req.id}
                            >
                              {updatingId === req.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserCheck className="mr-1 h-3 w-3" />
                              )}
                              Approve
                            </Button>
                          )}
                          {req.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() => openScopeAssignment(req)}
                            >
                              Assign entity
                            </Button>
                          )}
                          {req.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] text-destructive hover:text-destructive"
                              onClick={() => handleUpdateStatus(req, "rejected")}
                              disabled={updatingId === req.id}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isNeonStaging && <Card className="border-border/50">
        <CardHeader><CardTitle className="text-lg">Active College assignments</CardTitle>
          <CardDescription>One administrator may manage multiple colleges. Removing a scope does not remove their account or payment history.</CardDescription></CardHeader>
        <CardContent>{assignments.length === 0 ? <p className="text-sm text-muted-foreground">No active College assignments.</p> :
          <div className="table-responsive"><Table><TableHeader><TableRow><TableHead>Administrator</TableHead><TableHead>College</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
            {assignments.map(item => <TableRow key={item.id}><TableCell>{item.applicant_name}<p className="text-xs text-muted-foreground">{item.applicant_email}</p></TableCell>
              <TableCell>{item.college_name}</TableCell><TableCell><Button variant="outline" size="sm" disabled={updatingId === item.id} onClick={async () => {
                if (!window.confirm(`Remove ${item.applicant_name} from ${item.college_name}?`)) return;
                setUpdatingId(item.id);
                try { await stagingRequest("/api/v1/neon-staging/college-scopes/assignments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId: item.id }) }); await fetchRequests(); }
                catch (error) { toast({ variant: "destructive", title: "Scope removal failed", description: errorMessage(error) }); }
                finally { setUpdatingId(null); }
              }}>Remove scope</Button></TableCell></TableRow>)}
          </TableBody></Table></div>}</CardContent>
      </Card>}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">College claim & addition requests</CardTitle>
          <CardDescription>
            Approving a claim assigns the requester to that college. Approving an addition creates a pending, non-public college profile and assigns the requester; publication remains a separate Super Admin decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {entityScopeRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No college claim or addition requests.</p>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader><TableRow><TableHead>College requested</TableHead><TableHead>Applicant</TableHead><TableHead>Request details</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {entityScopeRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{request.college_name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{request.request_kind === "claim" ? "Claim existing college" : "Add new college"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-800">{request.applicant_name}</p>
                        <p className="text-xs text-muted-foreground">{request.applicant_email}</p>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs">
                        <p className="line-clamp-2" title={request.reason}>{request.reason}</p>
                        {request.request_data?.phone && <p className="mt-1 text-muted-foreground">Phone: {request.request_data.phone}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{request.payment_status?.replace("_", " ") || "Not started"}</Badge></TableCell>
                      <TableCell><Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "outline"} className="capitalize">{request.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" && <div className="flex justify-end gap-2">
                          <Button size="sm" className="h-7 text-[10px] bg-[#071a3d]" disabled={updatingId === request.id} onClick={() => decideEntityScopeRequest(request, true)}>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive" disabled={updatingId === request.id} onClick={() => decideEntityScopeRequest(request, false)}>Reject</Button>
                        </div>}
                        {isNeonStaging && request.status === "approved" && <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={updatingId === request.id}
                            onClick={() => void grantComplimentary(request, "trial")}>Start trial</Button>
                          <Button size="sm" variant="outline" disabled={updatingId === request.id}
                            onClick={() => void grantComplimentary(request, "free")}>Activate free plan</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                          setScopeRequest({ id: request.id, user_id: request.user_id,
                            user_name: request.applicant_name || "Administrator", user_email: request.applicant_email || "",
                            requested_modules: ["college"], assigned_capabilities: ["college"], reason: request.reason,
                            status: "approved", created_at: request.created_at });
                          setScopeModule("college");
                        }}>Assign another college</Button></div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(scopeRequest)} onOpenChange={(open) => !open && setScopeRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign entity scope</DialogTitle>
            <DialogDescription>
              Capability approval alone does not expose private records. Assign one entity at a time; repeat this for every college or organization the administrator manages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <InputFieldLabel className="text-sm font-semibold">Capability</InputFieldLabel>
              <Select value={scopeModule} onValueChange={setScopeModule}>
                <SelectTrigger><SelectValue placeholder="Select capability" /></SelectTrigger>
                <SelectContent>
                  {[...new Set((scopeRequest?.assigned_capabilities || scopeRequest?.requested_modules || []).map(canonicalModuleKey))].map((moduleKey) => (
                    <SelectItem key={moduleKey} value={moduleKey}>{moduleKey}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <InputFieldLabel className="text-sm font-semibold">Entity</InputFieldLabel>
              <Select value={scopeEntityId} onValueChange={setScopeEntityId} disabled={isLoadingScopes || !scopeSource(scopeModule)}>
                <SelectTrigger><SelectValue placeholder={isLoadingScopes ? "Loading entities…" : "Select an entity"} /></SelectTrigger>
                <SelectContent>
                  {scopeEntities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeRequest(null)}>Cancel</Button>
            <Button className="bg-[#071a3d] text-white hover:bg-[#05132d]" disabled={!scopeEntityId || isAssigningScope} onClick={assignScope}>
              {isAssigningScope && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Assign scope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
