import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

interface CollegeApp {
  id: string;
  institute_id: string;
  applicant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  program_interest: string | null;
  intake: string | null;
  status: string;
  submitted_at: string;
  institutes?: { name: string };
}

export default function AdminApplications() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<CollegeApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await (supabase as any)
      .from("college_applications")
      .select("*, institutes(name)")
      .order("submitted_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load applications", description: error.message });
    }
    setApplications((data || []) as CollegeApp[]);
    setIsLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("college_applications").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Application status updated to ${newStatus}` });
      fetchApplications();
    }
  };

  const filteredApps = applications.filter((a) =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.program_interest || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.institutes?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {filteredApps.map((app) => (
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
                    <span className="font-medium text-sm">{app.institutes?.name || "College"}</span>
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
                  <Select value={app.status} onValueChange={(val) => updateStatus(app.id, val)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredApps.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading applications..." : "No applications found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
