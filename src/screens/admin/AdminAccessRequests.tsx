import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ShieldCheck, CheckCircle2, XCircle, Clock, Loader2, UserCheck, Inbox } from "lucide-react";

interface AccessRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_modules: string[];
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminAccessRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("sub_admin_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    } else {
      setRequests([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (request: AccessRequest, newStatus: "approved" | "rejected") => {
    setUpdatingId(request.id);
    const db = supabase as any;

    // 1. Update sub_admin_requests status
    const { error } = await db
      .from("sub_admin_requests")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      toast({ variant: "destructive", title: "Action failed", description: error.message });
      setUpdatingId(null);
      return;
    }

    // 2. If approved, add role in user_roles table
    if (newStatus === "approved") {
      const roleName = "sub_admin";
      await db.from("user_roles").upsert(
        { user_id: request.user_id, role: roleName },
        { onConflict: "user_id,role" }
      );
    }

    toast({
      title: newStatus === "approved" ? "Request Approved!" : "Request Rejected",
      description: newStatus === "approved"
        ? `${request.user_name} has been granted Sub-Admin privileges.`
        : `Request for ${request.user_name} has been rejected.`,
    });

    setUpdatingId(null);
    fetchRequests();
  };

  return (
    <OperationsPage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Sub-Admin Access Requests</h1>
          <p className="text-muted-foreground text-sm">
            Review user access requests and grant module-specific sub-admin permissions.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs px-3 py-1 bg-slate-100 font-mono">
          Total Requests: {requests.length}
        </Badge>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#071a3d]" />
            Pending Authorization Requests
          </CardTitle>
          <CardDescription>
            Approving a request converts the user into a Sub-Admin and grants module management rights.
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
              <h3 className="font-semibold text-base">No Access Requests Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                When users request sub-admin access via /request-access, their submissions will appear here for review.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Email</TableHead>
                    <TableHead>Requested Modules</TableHead>
                    <TableHead>Reason & Justification</TableHead>
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
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {req.status === "approved" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>
                        ) : req.status === "rejected" ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            <Clock className="mr-1 h-3 w-3 inline" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 bg-[#071a3d] text-white hover:bg-[#05132d] text-xs"
                              onClick={() => handleUpdateStatus(req, "approved")}
                              disabled={updatingId === req.id}
                            >
                              {updatingId === req.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Approve Sub-Admin
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleUpdateStatus(req, "rejected")}
                              disabled={updatingId === req.id}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">Processed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </OperationsPage>
  );
}
