import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  Video, 
  MessageCircle, 
  Star,
  CheckCircle,
  XCircle,
  PlayCircle,
  CalendarPlus,
  Users,
  ArrowRight
} from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

interface Session {
  id: string;
  mentorName: string;
  mentorAvatar?: string;
  mentorExpertise: string[];
  date: string;
  time: string;
  duration: string;
  status: "upcoming" | "completed" | "cancelled";
  type: "video" | "chat";
  topic: string;
  rating?: number;
  notes?: string;
}

const Sessions = () => {
  const [sessions] = useState<Session[]>([
    {
      id: "1",
      mentorName: "Dr. Aarav Sharma",
      mentorExpertise: ["Machine Learning", "Python"],
      date: "Feb 2, 2026",
      time: "10:00 AM",
      duration: "60 min",
      status: "upcoming",
      type: "video",
      topic: "Career Guidance in AI/ML",
    },
    {
      id: "2",
      mentorName: "Priya Thapa",
      mentorExpertise: ["UI/UX Design", "Figma"],
      date: "Feb 5, 2026",
      time: "2:00 PM",
      duration: "45 min",
      status: "upcoming",
      type: "video",
      topic: "Portfolio Review",
    },
    {
      id: "3",
      mentorName: "Bikash Gurung",
      mentorExpertise: ["Full Stack", "React"],
      date: "Jan 28, 2026",
      time: "11:00 AM",
      duration: "60 min",
      status: "completed",
      type: "video",
      topic: "React Best Practices",
      rating: 5,
      notes: "Great session! Learned about advanced patterns.",
    },
    {
      id: "4",
      mentorName: "Dr. Aarav Sharma",
      mentorExpertise: ["Machine Learning", "Python"],
      date: "Jan 25, 2026",
      time: "3:00 PM",
      duration: "45 min",
      status: "completed",
      type: "chat",
      topic: "ML Project Review",
      rating: 5,
    },
    {
      id: "5",
      mentorName: "Suman Maharjan",
      mentorExpertise: ["DevOps", "Cloud"],
      date: "Jan 20, 2026",
      time: "10:00 AM",
      duration: "30 min",
      status: "cancelled",
      type: "video",
      topic: "AWS Architecture Review",
    },
    {
      id: "6",
      mentorName: "Priya Thapa",
      mentorExpertise: ["UI/UX Design", "Figma"],
      date: "Jan 15, 2026",
      time: "4:00 PM",
      duration: "60 min",
      status: "completed",
      type: "video",
      topic: "Design System Creation",
      rating: 4,
    },
  ]);

  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const pastSessions = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-primary/10 text-primary border-primary/20";
      case "completed": return "bg-success/10 text-success border-success/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming": return <Clock className="w-3 h-3" />;
      case "completed": return <CheckCircle className="w-3 h-3" />;
      case "cancelled": return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const SessionCard = ({ session }: { session: Session }) => (
    <Card className={dashboardInteractiveSurface}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-2xl ring-4 ring-[#fff0e4]">
            <AvatarImage src={session.mentorAvatar} />
            <AvatarFallback className="rounded-2xl bg-[#c2410c] font-bold text-white">
              {session.mentorName.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{session.mentorName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {session.mentorExpertise.slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(session.status)}`}>
                {getStatusIcon(session.status)}
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </Badge>
            </div>

            <p className="text-sm font-medium mt-3">{session.topic}</p>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {session.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {session.time}
              </span>
              <span className="flex items-center gap-1">
                {session.type === "video" ? <Video className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                {session.duration}
              </span>
            </div>

            {session.rating && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < session.rating! ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            )}

            {session.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">"{session.notes}"</p>
            )}

            {session.status === "upcoming" && (
              <div className="flex gap-2 mt-4">
                <Button variant="hero" size="sm" className={dashboardPrimaryButton}>
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Join Session
                </Button>
                <Button variant="outline" size="sm">
                  Reschedule
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Plan the conversation"
        title="Mentorship sessions"
        description="Keep every 1:1, review and follow-up organised in one calm schedule."
        action={
          <Button variant="hero" className={dashboardPrimaryButton}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book new session
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className={dashboardSurface}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{upcomingSessions.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card className={dashboardSurface}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-2xl font-bold">{sessions.filter(s => s.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className={dashboardSurface}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold">12.5h</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card className={dashboardSurface}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-warning" />
            </div>
            <p className="text-2xl font-bold">4</p>
            <p className="text-xs text-muted-foreground">Mentors</p>
          </CardContent>
        </Card>
      </div>

      {upcomingSessions.length > 0 && (
        <Card className="overflow-hidden rounded-[24px] border-[#c2410c]/25 bg-[#fff4eb] shadow-[0_18px_55px_rgba(249,115,22,0.08)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-lg">Next Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-[20px] ring-4 ring-white">
                  <AvatarFallback className="rounded-[20px] bg-[#c2410c] text-lg font-bold text-white">
                    {upcomingSessions[0].mentorName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{upcomingSessions[0].topic}</h3>
                  <p className="text-muted-foreground">with {upcomingSessions[0].mentorName}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Calendar className="w-4 h-4" />
                      {upcomingSessions[0].date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {upcomingSessions[0].time}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="hero" size="lg" className={dashboardPrimaryButton}>
                <Video className="w-5 h-5 mr-2" />
                Join Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className={dashboardTabs}>
          <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="past">Past Sessions ({pastSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSessions.length > 0 ? (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No upcoming sessions. Book one with a mentor!</p>
              <Button variant="outline" className="mt-4">
                Browse Mentors
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sessions;
