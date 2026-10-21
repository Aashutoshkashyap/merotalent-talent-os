import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { listAdminResource, updateAdminResource } from "@/lib/admin/admin-client";
import {
  COLLEGE_APPLICATION_STATUSES,
  collegeApplicationStatusLabel,
  type CollegeApplicationStatus,
} from "@/lib/institutes/college-application-status";

interface CollegeApp {
  id: string;
  institute_id: string;
  applicant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp_number?: string | null;
  guest_email_verified_at?: string | null;
  guest_whatsapp_verified_at?: string | null;
  program_interest: string | null;
  intake: string | null;
  status: string;
  submitted_at: string;
  message: string | null;
  form_data: Record<string, unknown> | null;
  institutes?: { name: string } | { name: string }[] | null;
}

const collegeName = (application: CollegeApp) => {
  const relation = application.institutes;
  return (Array.isArray(relation) ? relation[0]?.name : relation?.name) || "Institution unavailable";
};

const readableField = (key: string) => key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const readableValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(readableValue).join(", ");
  return "—";
};

export default function AdminApplications() {
  const isNeonStaging = isNeonClientRuntime();
  const { toast } = useToast();
  const [applications, setApplications] = useState<CollegeApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<CollegeApp | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchApplications = useCallback(async () => {
    try {
      let apps: CollegeApp[] = [];
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/admin/college-applications", { credentials: "same-origin", cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load applications");
        apps = body.data as CollegeApp[];
      } else try {
        apps = await listAdminResource<CollegeApp>("college-applications");
      } catch {
        const { data, error } = await (supabase as any)
          .from("college_applications")
          .select("*, institutes(name)")
          .order("submitted_at", { ascending: false });

        if (error) {
          toast({ variant: "destructive", title: "Unable to load applications", description: error.message });
        }
        apps = (data || []) as CollegeApp[];
      }
      setApplications(apps);
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load applications", description: error instanceof Error ? error.message : "Please retry." });
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isNeonStaging, toast]);

  useEffect(() => { void fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (id: string, newStatus: CollegeApplicationStatus) => {
    try {
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/admin/college-applications", {
          method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to update application");
      } else {
        await updateAdminResource("college-applications", id, { status: newStatus });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Status update failed", description: error instanceof Error ? error.message : "Please retry." });
      return;
    }
    setSelectedApplication((current) => current?.id === id ? { ...current, status: newStatus } : current);
    toast({ title: `Application status updated to ${collegeApplicationStatusLabel(newStatus)}` });
    fetchApplications();
  };

  const filteredApps = applications.filter((a) =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.program_interest || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    collegeName(a).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">College Applications</h1>
          <p className="text-muted-foreground">Review student applications submitted to partnered colleges</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name, email, program, or college..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>College Target</TableHead>
              <TableHead>Intended Program</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedApps.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground">{app.email} {app.phone ? `• ${app.phone}` : ""}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{collegeName(app)}</span>
                  </div>
                </TableCell>
                <TableCell>{app.program_interest || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(app.submitted_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={app.status === "accepted" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedApplication(app)} aria-label={`View application from ${app.full_name}`}>
                    <Eye className="mr-1 h-4 w-4" /> Details
                  </Button>
                  <Select
                    value={app.status}
                    onValueChange={(val) => updateStatus(app.id, val as CollegeApplicationStatus)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLEGE_APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {collegeApplicationStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedApps.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading applications..." : "No applications found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t border-slate-100 px-4 bg-slate-50/50">
          <SystemPagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredApps.length / pageSize)}
            totalItems={filteredApps.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            itemLabel="applications"
          />
        </div>
      </Card>
      <Dialog open={selectedApplication !== null} onOpenChange={(open) => { if (!open) setSelectedApplication(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application details</DialogTitle>
            <DialogDescription>Private applicant information for Super Admin review.</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Applicant", selectedApplication.full_name],
                ["College", collegeName(selectedApplication)],
                ["Email", selectedApplication.email],
                [selectedApplication.whatsapp_number ? "Verified WhatsApp" : "Phone", selectedApplication.whatsapp_number || selectedApplication.phone || "—"],
                ...(selectedApplication.whatsapp_number ? [["Email verified", selectedApplication.guest_email_verified_at ? new Date(selectedApplication.guest_email_verified_at).toLocaleString() : "—"]] : []),
                ["Program", selectedApplication.program_interest || "—"],
                ["Intake", selectedApplication.intake || "—"],
                ["Status", collegeApplicationStatusLabel(selectedApplication.status as CollegeApplicationStatus)],
                ["Submitted", new Date(selectedApplication.submitted_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>
              ))}
              {selectedApplication.message && <div className="rounded-lg border p-3 sm:col-span-2"><p className="text-xs text-muted-foreground">Message</p><p className="mt-1 whitespace-pre-wrap">{selectedApplication.message}</p></div>}
              {selectedApplication.form_data && Object.entries(selectedApplication.form_data).length > 0 && (
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="mb-2 font-semibold">Additional application information</p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(selectedApplication.form_data).filter(([key]) => !/token|secret|password|internal/i.test(key)).map(([key, value]) => (
                      <div key={key}><dt className="text-xs text-muted-foreground">{readableField(key)}</dt><dd className="break-words">{readableValue(value)}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
