import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Inbox, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

interface LeadItem {
  id: string;
  source_type: string;
  source_id: string;
  owner_user_id: string | null;
  organization_type: string | null;
  applicant_user_id: string | null;
  status: string;
  payload: any;
  created_at: string;
  profiles?: { email: string; full_name: string };
}

export default function AdminLeads() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data } = await (supabase as any)
      .from("leads")
      .select("*, profiles:applicant_user_id(email, full_name)")
      .order("created_at", { ascending: false });

    if (data) setLeads(data as LeadItem[]);
    setIsLoading(false);
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("leads").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Lead status updated to ${newStatus}` });
      fetchLeads();
    }
  };

  const filteredLeads = leads.filter((l) =>
    l.source_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Centralized Lead Management</h1>
          <p className="text-muted-foreground">Monitor every student application, booking, and registration submission</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by source type, applicant email, or lead ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead Source</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Organization Type</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div>
                    <Badge variant="outline" className="capitalize font-semibold">
                      {lead.source_type.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{lead.id.slice(0, 8)}...</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{lead.profiles?.full_name || lead.payload?.fullName || "Submission"}</p>
                    <p className="text-xs text-muted-foreground">{lead.profiles?.email || lead.payload?.email || "-"}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{lead.organization_type || "platform"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={lead.status} onValueChange={(val) => updateLeadStatus(lead.id, val)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading leads..." : "No leads recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
