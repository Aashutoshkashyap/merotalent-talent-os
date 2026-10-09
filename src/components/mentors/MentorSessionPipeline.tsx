"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface MentorBooking {
  id: string;
  student_id: string;
  mentor_service_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  notes: string | null;
  form_data: {
    fullName?: string;
    email?: string;
    phone?: string;
    topic?: string;
    serviceTitle?: string;
    meetingPreference?: string;
  } | null;
  created_at: string;
  mentor_services?: {
    title: string;
    session_type: string;
    duration_minutes: number;
  } | null;
}

export function MentorSessionPipeline() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Action Dialogs
  const [rescheduleBooking, setRescheduleBooking] = useState<MentorBooking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [cancelBooking, setCancelBooking] = useState<MentorBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [isCompleting, setIsCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [session?.access_token]);

  const fetchBookings = async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/mentors/bookings?mode=mentor", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setBookings(json.data);
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load mentor bookings." });
    } finally {
      setIsLoading(false);
    }
  };

  const now = Date.now();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todaySessions = useMemo(() => {
    return bookings.filter((b) => {
      const isToday = b.scheduled_start.startsWith(todayStr);
      return isToday && ["pending", "confirmed", "rescheduled"].includes(b.status);
    });
  }, [bookings, todayStr]);

  const upcomingSessions = useMemo(() => {
    return bookings.filter((b) => {
      const isFuture = new Date(b.scheduled_end).getTime() >= now;
      return isFuture && ["pending", "confirmed", "rescheduled"].includes(b.status);
    });
  }, [bookings, now]);

  const completedSessions = useMemo(() => {
    return bookings.filter((b) => b.status === "completed");
  }, [bookings]);

  const totalGrossEarnings = useMemo(() => {
    return completedSessions.reduce((sum, b) => sum + (b.payment_status === "success" ? Number(b.amount || 0) : 0), 0);
  }, [completedSessions]);

  const handleComplete = async (bookingId: string) => {
    if (!session?.access_token) return;
    setIsCompleting(bookingId);
    try {
      const res = await fetch("/api/v1/mentors/bookings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          action: "complete",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to mark session complete.");

      toast({ title: "Session Completed", description: "Mentorship session marked as completed and feedback prompt sent to student." });
      void fetchBookings();
    } catch (err) {
      toast({ variant: "destructive", title: "Action Failed", description: err instanceof Error ? err.message : "Could not complete session." });
    } finally {
      setIsCompleting(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !session?.access_token) return;
    if (!newDate || !newTime) {
      toast({ variant: "destructive", title: "Date and Time required", description: "Select new date and time slot." });
      return;
    }

    setIsRescheduling(true);
    try {
      const res = await fetch("/api/v1/mentors/bookings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: rescheduleBooking.id,
          action: "reschedule",
          newDate,
          newTime,
          reason: rescheduleReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reschedule session.");

      toast({ title: "Session Rescheduled", description: "Student has been notified of the new schedule." });
      setRescheduleBooking(null);
      setNewDate("");
      setNewTime("");
      setRescheduleReason("");
      void fetchBookings();
    } catch (err) {
      toast({ variant: "destructive", title: "Reschedule Failed", description: err instanceof Error ? err.message : "Error rescheduling." });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelBooking || !session?.access_token) return;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/v1/mentors/bookings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: cancelBooking.id,
          action: "cancel",
          reason: cancelReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to cancel session.");

      toast({ title: "Session Cancelled", description: "The session was cancelled and the slot released." });
      setCancelBooking(null);
      setCancelReason("");
      void fetchBookings();
    } catch (err) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: err instanceof Error ? err.message : "Error cancelling." });
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredList = (list: MentorBooking[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((b) =>
      [
        b.form_data?.fullName,
        b.form_data?.email,
        b.form_data?.topic,
        b.mentor_services?.title,
        b.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  };

  return (
    <section className="space-y-6 pt-6 border-t border-[#f0e3da]">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Mentorship Sessions & Pipeline</h2>
            <p className="text-sm text-slate-500 mt-1">Manage student bookings, adjust availability, complete sessions, and track earnings.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchBookings()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-none">
          <span className="text-[11px] font-bold uppercase text-slate-500">Today's Sessions</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{todaySessions.length}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-none">
          <span className="text-[11px] font-bold uppercase text-blue-600">Upcoming</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{upcomingSessions.length}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-none">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Completed</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{completedSessions.length}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-none">
          <span className="text-[11px] font-bold uppercase text-amber-600">Gross Earnings</span>
          <p className="text-2xl font-black text-amber-700 mt-1">NPR {totalGrossEarnings.toLocaleString()}</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search bookings by student name, topic..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-[#fff8f3] border-[#f0e3da] rounded-xl text-sm"
        />
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="upcoming" className="text-xs font-bold">Upcoming ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-bold">Completed ({completedSessions.length})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs font-bold">All Bookings ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {filteredList(upcomingSessions).length > 0 ? (
            filteredList(upcomingSessions).map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onReschedule={() => setRescheduleBooking(b)}
                onCancel={() => setCancelBooking(b)}
                onComplete={() => handleComplete(b.id)}
                isCompleting={isCompleting === b.id}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 rounded-2xl border border-dashed">
              No upcoming mentoring sessions found.
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {filteredList(completedSessions).length > 0 ? (
            filteredList(completedSessions).map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onReschedule={() => {}}
                onCancel={() => {}}
                onComplete={() => {}}
                isCompleting={false}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 rounded-2xl border border-dashed">
              No completed sessions yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {filteredList(bookings).length > 0 ? (
            filteredList(bookings).map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onReschedule={() => setRescheduleBooking(b)}
                onCancel={() => setCancelBooking(b)}
                onComplete={() => handleComplete(b.id)}
                isCompleting={isCompleting === b.id}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 rounded-2xl border border-dashed">
              No bookings recorded.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleBooking !== null} onOpenChange={(open) => { if (!open) setRescheduleBooking(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Reschedule Mentoring Session</DialogTitle>
            <DialogDescription>
              Select a new date and time for student {rescheduleBooking?.form_data?.fullName || "Student"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">New Date</Label>
              <Input
                type="date"
                value={newDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">New Time Slot (24-hour)</Label>
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reason (Optional)</Label>
              <Textarea
                placeholder="Reason for rescheduling..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleBooking(null)}>Cancel</Button>
            <Button
              className="bg-[#0073e6] hover:bg-[#0062c4] text-white"
              onClick={handleRescheduleSubmit}
              disabled={isRescheduling}
            >
              {isRescheduling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarClock className="h-4 w-4 mr-2" />}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelBooking !== null} onOpenChange={(open) => { if (!open) setCancelBooking(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Cancel Mentoring Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the session with {cancelBooking?.form_data?.fullName || "Student"}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold">Cancellation Reason</Label>
            <Textarea
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelBooking(null)}>Keep Session</Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BookingRow({
  booking,
  onReschedule,
  onCancel,
  onComplete,
  isCompleting,
}: {
  booking: MentorBooking;
  onReschedule: () => void;
  onCancel: () => void;
  onComplete: () => void;
  isCompleting: boolean;
}) {
  const canModify = ["pending", "confirmed", "rescheduled"].includes(booking.status);
  const isCompleted = booking.status === "completed";
  const studentName = booking.form_data?.fullName || "Student";
  const topic = booking.form_data?.topic || booking.mentor_services?.title || "Mentoring session";

  const startDate = new Date(booking.scheduled_start);
  const formattedDate = format(startDate, "MMM dd, yyyy");
  const formattedTime = format(startDate, "hh:mm a");

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-none transition hover:border-slate-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">{studentName}</h4>
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold capitalize ${
                  booking.status === "confirmed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : booking.status === "completed"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {booking.status}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {booking.amount > 0 ? `${booking.currency} ${booking.amount}` : "Free"}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium truncate">{topic}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formattedDate}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formattedTime}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canModify && (
            <>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                onClick={onComplete}
                disabled={isCompleting}
              >
                {isCompleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold"
                onClick={onReschedule}
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </>
          )}

          {isCompleted && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Finished
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
