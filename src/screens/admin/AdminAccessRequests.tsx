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

interface AccessRequestDecision {
  id: string;
  user_id: string;
  status: "approved" | "rejected";
  requested_modules: string[];
  granted_permissions: string[];
  decided_at: string;
}

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
      toast({
        variant: "destructive",
        title: "Requests could not be loaded",
        description: error
          ? errorMessage(error)
          : "The access request list could not be loaded.",
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (request: AccessRequest, newStatus: "approved" | "rejected") => {
    setUpdatingId(request.id);
    try {
      const { data, error } = await (supabase as any).rpc(
        "admin_decide_sub_admin_request",
        {
          p_request_id: request.id,
          p_approve: newStatus === "approved",
          p_note: null,
        },
      );

      if (error) throw error;

      const decision = data as AccessRequestDecision | null;
      if (
        !decision ||
        decision.id !== request.id ||
        decision.user_id !== request.user_id ||
        decision.status !== newStatus
      ) {
        throw new Error("The database did not confirm the requested access decision.");
      }

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

  return (
    <OperationsPage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Access requests</h1>
          <p className="text-muted-foreground text-sm">
            Review requests for delegated module access.
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
            Request queue
          </CardTitle>
          <CardDescription>
            Approval grants only the requested module permissions, not full administrator access.
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
                              Grant access
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
