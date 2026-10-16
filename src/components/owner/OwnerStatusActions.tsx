import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { requestRoleWorkspace, useNeonRoleWorkspaces } from "@/lib/neon/role-workspaces-client";

type OwnerWorkflow =
  | "job_application"
  | "event_registration"
  | "mentor_booking"
  | "college_application";

interface OwnerStatusActionsProps {
  workflow: OwnerWorkflow;
  recordId: string;
  status: string;
  paymentStatus?: string | null;
  onSaved: () => void;
  readOnly?: boolean;
}

interface StatusAction {
  value: string;
  label: string;
  destructive?: boolean;
}

const tableByWorkflow: Record<OwnerWorkflow, string> = {
  job_application: "job_applications",
  event_registration: "event_registrations",
  mentor_booking: "mentor_bookings",
  college_application: "college_applications",
};

const getActions = (
  workflow: OwnerWorkflow,
  status: string,
  paymentStatus?: string | null,
): StatusAction[] => {
  if (workflow === "job_application") {
    if (status === "submitted") return [{ value: "screening", label: "Screen" }, { value: "rejected", label: "Reject", destructive: true }];
    if (status === "screening") return [{ value: "interview", label: "Interview" }, { value: "rejected", label: "Reject", destructive: true }];
    if (status === "interview") return [{ value: "offered", label: "Offer" }, { value: "rejected", label: "Reject", destructive: true }];
    return [];
  }

  if (workflow === "college_application") {
    if (status === "submitted") return [{ value: "reviewing", label: "Review" }, { value: "contacted", label: "Contacted" }, { value: "accepted", label: "Accept" }, { value: "rejected", label: "Reject", destructive: true }];
    if (status === "reviewing") return [{ value: "contacted", label: "Contacted" }, { value: "accepted", label: "Accept" }, { value: "rejected", label: "Reject", destructive: true }];
    if (status === "contacted") return [{ value: "accepted", label: "Accept" }, { value: "rejected", label: "Reject", destructive: true }];
    return [];
  }

  const canConfirm = paymentStatus === "success" || paymentStatus === "not_required";
  if (workflow === "event_registration") {
    if (status === "pending") {
      return [
        ...(canConfirm ? [{ value: "confirmed", label: "Confirm" }] : []),
        { value: "cancelled", label: "Cancel", destructive: true },
      ];
    }
    if (status === "confirmed") return [{ value: "attended", label: "Attended" }, { value: "cancelled", label: "Cancel", destructive: true }];
    return [];
  }

  if (status === "pending") {
    return [
      ...(canConfirm ? [{ value: "confirmed", label: "Confirm" }] : []),
      { value: "declined", label: "Decline", destructive: true },
      { value: "cancelled", label: "Cancel", destructive: true },
    ];
  }
  if (status === "confirmed") return [{ value: "completed", label: "Complete" }, { value: "no_show", label: "No show" }, { value: "cancelled", label: "Cancel", destructive: true }];
  return [];
};

const OwnerStatusActions = ({
  workflow,
  recordId,
  status,
  paymentStatus,
  onSaved,
  readOnly = false,
}: OwnerStatusActionsProps) => {
  const { toast } = useToast();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const actions = readOnly ? [] : getActions(workflow, status, paymentStatus);

  const transition = async (nextStatus: string) => {
    setPendingStatus(nextStatus);
    let error: { message: string } | null = null;
    if (useNeonRoleWorkspaces) {
      try {
        if (workflow !== "mentor_booking" && workflow !== "event_registration") throw new Error("Use the module's application review panel to update this record.");
        await requestRoleWorkspace("/api/v1/neon-staging/role-workspaces", { method: "PATCH",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow, id: recordId, status: nextStatus }) });
      } catch (cause) { error = { message: cause instanceof Error ? cause.message : "The status was not changed." }; }
    } else ({ error } = await (supabase as any)
      .from(tableByWorkflow[workflow])
      .update({ status: nextStatus })
      .eq("id", recordId));
    setPendingStatus(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Status was not changed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Status updated", description: `The record is now ${nextStatus.replaceAll("_", " ")}.` });
    onSaved();
  };

  if (actions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <Button
          key={action.value}
          type="button"
          size="sm"
          variant="outline"
          disabled={pendingStatus !== null}
          className={
            action.destructive
              ? "h-7 rounded-lg border-rose-200 px-2 text-[11px] text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              : "h-7 rounded-lg border-[#eadfd7] px-2 text-[11px] text-[#c2410c] hover:border-[#fdba74] hover:bg-[#fff8f3]"
          }
          onClick={() => void transition(action.value)}
        >
          {pendingStatus === action.value && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default OwnerStatusActions;
