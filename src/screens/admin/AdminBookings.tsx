import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";
import { listAdminResource } from "@/lib/admin/admin-client";

interface MentorBooking {
  id: string;
  mentor_id: string;
  student_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  created_at: string;
  mentors?: { profiles?: { full_name: string | null } };
  students?: { email: string | null; full_name: string | null };
}

export default function AdminBookings() {
  const isNeonStaging = isNeonClientRuntime();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/admin/mentor-bookings", { credentials: "same-origin", cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load bookings");
        setBookings(body.data as MentorBooking[]);
      } catch (error) {
        toast({ variant: "destructive", title: "Unable to load bookings", description: error instanceof Error ? error.message : "Please retry." });
        setBookings([]);
      } finally { setIsLoading(false); }
      return;
    }
    let data: any[] = [];
    try {
      data = await listAdminResource<MentorBooking>("mentor-bookings");
    } catch {
      const { data: dbData, error } = await (supabase as any)
        .from("mentor_bookings")
        .select("*")
        .order("scheduled_start", { ascending: false });

      if (error) {
        toast({ variant: "destructive", title: "Unable to load bookings", description: error.message });
        setBookings([]);
        setIsLoading(false);
        return;
      }
      data = dbData || [];
    }
    try {
      const mentorIds = [...new Set((data || []).map((booking: MentorBooking) => booking.mentor_id))];
      const { data: mentors, error: mentorError } = mentorIds.length
        ? await (supabase as any).from("mentors").select("id,user_id").in("id", mentorIds)
        : { data: [], error: null };
      if (mentorError) throw mentorError;
      const mentorUserById = new Map<string, string>(
        (mentors || []).map((mentor: { id: string; user_id: string }) => [mentor.id, mentor.user_id]),
      );
      const profiles = await loadAdminProfiles([
        ...(data || []).map((booking: MentorBooking) => booking.student_id),
        ...[...mentorUserById.values()],
      ]);
      setBookings((data || []).map((booking: MentorBooking) => ({
        ...booking,
        students: profiles.get(booking.student_id),
        mentors: { profiles: profiles.get(mentorUserById.get(booking.mentor_id) || "") },
      })) as MentorBooking[]);
    } catch (profileError) {
      toast({ variant: "destructive", title: "Unable to load booking profiles", description: profileError instanceof Error ? profileError.message : "Profile lookup failed." });
      setBookings((data || []) as MentorBooking[]);
    }
    setIsLoading(false);
  }, [isNeonStaging, toast]);

  useEffect(() => { void fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/admin/mentor-bookings", {
          method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to update booking");
        toast({ title: `Booking status updated to ${newStatus}` });
        fetchBookings();
      } catch (error) {
        toast({ variant: "destructive", title: "Booking update failed", description: error instanceof Error ? error.message : "Please retry." });
      }
      return;
    }
    const { error } = await (supabase as any).from("mentor_bookings").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Booking status updated to ${newStatus}` });
      fetchBookings();
    }
  };

  const filteredBookings = bookings.filter((b) =>
    (b.students?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.students?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.mentors?.profiles?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Mentor Sessions & Bookings</h1>
          <p className="text-muted-foreground">Monitor scheduled 1-on-1 and group mentorship sessions</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student, mentor, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold">{b.students?.full_name || "Student"}</p>
                    <p className="text-xs text-muted-foreground">{b.students?.email || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>{b.mentors?.profiles?.full_name || "Mentor"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(b.scheduled_start).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell className="font-bold">
                  {b.amount === 0 ? "Free Trial" : `${b.currency} ${b.amount}`}
                </TableCell>
                <TableCell>
                  <Badge variant={b.payment_status === "success" || b.payment_status === "not_required" ? "default" : "secondary"}>
                    {b.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "declined" ? "destructive" : "secondary"}>
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={b.status} onValueChange={(val) => updateStatus(b.id, val)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending" disabled={isNeonStaging}>Pending</SelectItem>
                      <SelectItem value="confirmed" disabled={isNeonStaging}>Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredBookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading bookings..." : "No mentor bookings found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
