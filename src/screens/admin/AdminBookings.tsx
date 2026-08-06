import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

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
  mentors?: { title: string; profiles?: { full_name: string } };
  students?: { email: string; full_name: string };
}

export default function AdminBookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data } = await (supabase as any)
      .from("mentor_bookings")
      .select("*, mentors(title, profiles:user_id(full_name)), students:student_id(email, full_name)")
      .order("scheduled_start", { ascending: false });

    if (data) setBookings(data as MentorBooking[]);
    setIsLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
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
