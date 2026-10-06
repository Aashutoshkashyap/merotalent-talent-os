"use client";

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";

import { useStudentActivity, type StudentMentorBooking } from "@/hooks/useStudentActivity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      return "bg-primary/10 text-primary border-primary/20";
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "cancelled":
    case "declined":
    case "no_show":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle className="h-3 w-3" />;
  if (["cancelled", "declined", "no_show"].includes(status)) return <XCircle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
};

const SessionCard = ({ booking }: { booking: StudentMentorBooking }) => {
  const minutes = durationMinutes(booking);
  const isPaid = booking.paymentStatus === "success";
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
                <span className="text-muted-foreground">to {booking.mentorName}</span>
                <span className="text-muted-foreground">· {minutes > 0 ? `${minutes} min session` : ""}</span>
              </div>
              <Link to={`/mentorship/${booking.mentorId}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                <ArrowRight className="h-3 w-3" />View Mentor
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Sessions = () => {
  const { error, isLoading, mentorBookings, refresh } = useStudentActivity();
  const now = Date.now();
  const upcomingSessions = mentorBookings
    .filter((booking) => new Date(booking.scheduledEnd).getTime() >= now && ["pending", "confirmed"].includes(booking.status))
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime());
  const pastSessions = mentorBookings
    .filter((booking) => !upcomingSessions.some((upcoming) => upcoming.id === booking.id))
    .sort((left, right) => new Date(right.scheduledStart).getTime() - new Date(left.scheduledStart).getTime());
  const completedCount = mentorBookings.filter((booking) => booking.status === "completed").length;
  const bookedMinutes = mentorBookings.reduce((total, booking) => total + durationMinutes(booking), 0);
  const uniqueMentors = new Set(mentorBookings.map((booking) => booking.mentorId)).size;
  const nextSession = upcomingSessions[0];

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
        description="Review the mentor bookings stored for your account."
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
          {upcomingSessions.length > 0 ? upcomingSessions.map((booking) => <SessionCard key={booking.id} booking={booking} />) : (
            <div className="py-12 text-center"><Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" /><p className="text-muted-foreground">No upcoming mentor bookings.</p><Button asChild variant="outline" className="mt-4"><Link to="/dashboard/mentors">Browse mentors <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastSessions.length > 0 ? pastSessions.map((booking) => <SessionCard key={booking.id} booking={booking} />) : (
            <div className="py-12 text-center text-sm text-muted-foreground">No past mentor bookings.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sessions;
