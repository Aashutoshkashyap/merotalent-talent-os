"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Users,
  XCircle,
} from "lucide-react";

import { useStudentActivity, type StudentMentorBooking } from "@/hooks/useStudentActivity";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

const formatDate = (value: string, options: Intl.DateTimeFormatOptions) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-NP", options).format(parsed);
};

const formatStatus = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const durationMinutes = (booking: StudentMentorBooking) => {
  const start = new Date(booking.scheduledStart).getTime();
  const end = new Date(booking.scheduledEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
};

const statusTone = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "rescheduled":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "cancelled":
    case "declined":
    case "no_show":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle className="h-3 w-3" />;
  if (status === "rescheduled") return <CalendarClock className="h-3 w-3" />;
  if (["cancelled", "declined", "no_show"].includes(status)) return <XCircle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
};

interface SessionCardProps {
  booking: StudentMentorBooking;
  onReschedule: (booking: StudentMentorBooking) => void;
  onCancel: (booking: StudentMentorBooking) => void;
  onReview: (booking: StudentMentorBooking) => void;
}

const SessionCard = ({ booking, onReschedule, onCancel, onReview }: SessionCardProps) => {
  const minutes = durationMinutes(booking);
  const isPaid = booking.paymentStatus === "success";
  const canModify = ["pending", "confirmed", "rescheduled"].includes(booking.status);
  const isCompleted = booking.status === "completed";

  return (
    <Card className={dashboardInteractiveSurface}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-2xl ring-4 ring-[#fff0e4]">
            <AvatarImage src={booking.mentorAvatar || undefined} alt="" />
            <AvatarFallback className="rounded-2xl bg-[#c2410c] font-bold text-white">
              {booking.mentorName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2) || "M"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/mentorship/${booking.mentorId}`} className="truncate font-semibold text-foreground hover:text-primary hover:underline">
                  {booking.mentorName}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1">
                  {booking.mentorExpertise.slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                  {booking.mentorExpertise.length === 0 && booking.serviceTitle && (
                    <Badge variant="secondary" className="text-xs">{booking.serviceTitle}</Badge>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`flex items-center gap-1 ${statusTone(booking.status)}`}>
                <StatusIcon status={booking.status} />
                {formatStatus(booking.status)}
              </Badge>
            </div>

            <p className="mt-3 text-sm font-medium">
              {booking.topic || booking.serviceTitle || "Mentor session"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(booking.scheduledStart, { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDate(booking.scheduledStart, { hour: "numeric", minute: "2-digit" })}</span>
              <span>{minutes > 0 ? `${minutes} min` : "Duration unavailable"}</span>
            </div>

            {booking.notes && <p className="mt-2 text-sm italic text-muted-foreground">{booking.notes}</p>}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle className="h-3 w-3" />Payment Confirmed</span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">Payment: {formatStatus(booking.paymentStatus)}</span>
                )}
                <span className="font-bold text-foreground">
                  {booking.amount > 0 ? `${booking.currency} ${booking.amount.toLocaleString()}` : "Free session"}
                </span>
                <span className="text-muted-foreground">with {booking.mentorName}</span>
              </div>

              <div className="flex items-center gap-2">
                {canModify && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold"
                      onClick={() => onReschedule(booking)}
                    >
                      <CalendarClock className="h-3.5 w-3.5 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => onCancel(booking)}
                    >
                      Cancel
                    </Button>
                  </>
                )}

                {isCompleted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    onClick={() => onReview(booking)}
                  >
                    <Star className="h-3.5 w-3.5 mr-1 fill-amber-500 text-amber-500" />
                    Review Session
                  </Button>
                )}

                <Link to={`/mentorship/${booking.mentorId}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                  <ArrowRight className="h-3 w-3" />Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Sessions = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const { error, isLoading, mentorBookings, refresh } = useStudentActivity();

  // Action Dialog States
  const [rescheduleBooking, setRescheduleBooking] = useState<StudentMentorBooking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [cancelBooking, setCancelBooking] = useState<StudentMentorBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [reviewBooking, setReviewBooking] = useState<StudentMentorBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const now = Date.now();
  const upcomingSessions = mentorBookings
    .filter((booking) => new Date(booking.scheduledEnd).getTime() >= now && ["pending", "confirmed", "rescheduled"].includes(booking.status))
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime());
  const pastSessions = mentorBookings
    .filter((booking) => !upcomingSessions.some((upcoming) => upcoming.id === booking.id))
    .sort((left, right) => new Date(right.scheduledStart).getTime() - new Date(left.scheduledStart).getTime());
  const completedCount = mentorBookings.filter((booking) => booking.status === "completed").length;
  const bookedMinutes = mentorBookings.reduce((total, booking) => total + durationMinutes(booking), 0);
  const uniqueMentors = new Set(mentorBookings.map((booking) => booking.mentorId)).size;
  const nextSession = upcomingSessions[0];

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !session) return;
    if (!newDate || !newTime) {
      toast({ variant: "destructive", title: "Date and Time required", description: "Please choose your new date and time slot." });
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

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error?.message || "Failed to reschedule session.");
      }

      toast({ title: "Session Rescheduled", description: "Your mentoring session has been updated and the mentor notified." });
      setRescheduleBooking(null);
      setNewDate("");
      setNewTime("");
      setRescheduleReason("");
      void refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Reschedule Failed", description: err instanceof Error ? err.message : "Error rescheduling." });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelBooking || !session) return;
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

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error?.message || "Failed to cancel session.");
      }

      toast({ title: "Session Cancelled", description: "The session has been cancelled and any slot released." });
      setCancelBooking(null);
      setCancelReason("");
      void refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: err instanceof Error ? err.message : "Error cancelling." });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewBooking || !session) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch("/api/v1/mentors/reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: reviewBooking.id,
          rating,
          feedback,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error?.message || "Failed to submit review.");
      }

      toast({ title: "Review Submitted", description: "Thank you for rating your mentor session!" });
      setReviewBooking(null);
      setRating(5);
      setFeedback("");
      void refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Review Failed", description: err instanceof Error ? err.message : "Error submitting review." });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={dashboardSurface}>
        <CardContent className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#c2410c]" />Loading mentor bookings…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={dashboardSurface}>
        <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <XCircle className="h-9 w-9 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Sessions could not be loaded</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void refresh()} variant="outline" className="mt-5"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Plan the conversation"
        title="Mentorship sessions"
        description="Review the mentor bookings stored for your account, manage upcoming schedules, and provide session feedback."
        action={
          <Button asChild variant="hero" className={dashboardPrimaryButton}>
            <Link to="/dashboard/mentors"><CalendarPlus className="mr-2 h-4 w-4" />Book new session</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Calendar, value: upcomingSessions.length, label: "Upcoming", tone: "bg-primary/10 text-primary" },
          { icon: CheckCircle, value: completedCount, label: "Completed", tone: "bg-success/10 text-success" },
          { icon: Clock, value: `${(bookedMinutes / 60).toFixed(bookedMinutes % 60 === 0 ? 0 : 1)}h`, label: "Booked hours", tone: "bg-accent/10 text-accent" },
          { icon: Users, value: uniqueMentors, label: "Mentors", tone: "bg-warning/10 text-warning" },
        ].map((metric) => (
          <Card key={metric.label} className={dashboardSurface}>
            <CardContent className="p-4 text-center">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${metric.tone}`}><metric.icon className="h-5 w-5" /></div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {nextSession && (
        <Card className="overflow-hidden rounded-[24px] border-[#c2410c]/25 bg-[#fff4eb] shadow-[0_18px_55px_rgba(249,115,22,0.08)]">
          <CardHeader><div className="flex items-center gap-2"><div className="h-2 w-2 animate-pulse rounded-full bg-primary" /><CardTitle className="text-lg">Next Session</CardTitle></div></CardHeader>
          <CardContent>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-[20px] ring-4 ring-white">
                  <AvatarImage src={nextSession.mentorAvatar || undefined} alt="" />
                  <AvatarFallback className="rounded-[20px] bg-[#c2410c] text-lg font-bold text-white">{nextSession.mentorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div><h3 className="text-lg font-semibold">{nextSession.topic || nextSession.serviceTitle || "Mentor session"}</h3><p className="text-muted-foreground">with {nextSession.mentorName}</p><div className="mt-1 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-1 font-medium text-primary"><Calendar className="h-4 w-4" />{formatDate(nextSession.scheduledStart, { day: "numeric", month: "short", year: "numeric" })}</span><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDate(nextSession.scheduledStart, { hour: "numeric", minute: "2-digit" })}</span></div></div>
              </div>
              <div className="flex items-center gap-2"><Badge variant="outline" className={statusTone(nextSession.status)}>{formatStatus(nextSession.status)}</Badge><Badge variant="secondary">Payment: {formatStatus(nextSession.paymentStatus)}</Badge></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className={dashboardTabs}>
          <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map((booking) => (
              <SessionCard
                key={booking.id}
                booking={booking}
                onReschedule={(b) => setRescheduleBooking(b)}
                onCancel={(b) => setCancelBooking(b)}
                onReview={(b) => setReviewBooking(b)}
              />
            ))
          ) : (
            <div className="py-12 text-center"><Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" /><p className="text-muted-foreground">No upcoming mentor bookings.</p><Button asChild variant="outline" className="mt-4"><Link to="/dashboard/mentors">Browse mentors <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastSessions.length > 0 ? (
            pastSessions.map((booking) => (
              <SessionCard
                key={booking.id}
                booking={booking}
                onReschedule={(b) => setRescheduleBooking(b)}
                onCancel={(b) => setCancelBooking(b)}
                onReview={(b) => setReviewBooking(b)}
              />
            ))
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">No past mentor bookings.</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Modal Dialog */}
      <Dialog open={rescheduleBooking !== null} onOpenChange={(open) => { if (!open) setRescheduleBooking(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Reschedule Mentoring Session</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your session with {rescheduleBooking?.mentorName}.
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
              <Label className="text-xs font-bold">Reason for Rescheduling (Optional)</Label>
              <Textarea
                placeholder="Let the mentor know why you need to reschedule..."
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelBooking !== null} onOpenChange={(open) => { if (!open) setCancelBooking(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Cancel Mentoring Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your session with {cancelBooking?.mentorName}? This will release the booked time slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold">Reason for Cancellation</Label>
            <Textarea
              placeholder="Provide a brief explanation..."
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

      {/* Leave Review Dialog */}
      <Dialog open={reviewBooking !== null} onOpenChange={(open) => { if (!open) setReviewBooking(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Rate & Review Your Session</DialogTitle>
            <DialogDescription>
              Share your experience with {reviewBooking?.mentorName} to help other students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2 text-center">
              <Label className="text-xs font-bold">Your Rating</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 rounded-lg transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-500"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Written Feedback</Label>
              <Textarea
                placeholder="What did you learn? How helpful was the mentor?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBooking(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handleReviewSubmit}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
