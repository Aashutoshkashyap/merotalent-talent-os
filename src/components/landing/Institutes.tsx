import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, GraduationCap, Bell, Calendar, Users, MapPin, ExternalLink,
  Clock, CheckCircle, AlertCircle, BookOpen, Award
} from "lucide-react";

const admissions = [
  {
    id: "1",
    institute: "Pulchowk Campus (IOE)",
    program: "BE Computer Engineering",
    seats: 48,
    available: 12,
    deadline: "2026-02-15",
    status: "open",
    location: "Lalitpur",
  },
  {
    id: "2",
    institute: "Thapathali Campus (IOE)",
    program: "BE Electronics Engineering",
    seats: 48,
    available: 8,
    deadline: "2026-02-15",
    status: "open",
    location: "Kathmandu",
  },
  {
    id: "3",
    institute: "Kathmandu University",
    program: "BE in AI & Data Science",
    seats: 40,
    available: 5,
    deadline: "2026-02-10",
    status: "closing_soon",
    location: "Dhulikhel",
  },
  {
    id: "4",
    institute: "Tribhuvan University (WRC)",
    program: "BE Civil Engineering",
    seats: 72,
    available: 24,
    deadline: "2026-02-20",
    status: "open",
    location: "Pokhara",
  },
  {
    id: "5",
    institute: "Nepal Engineering College",
    program: "BE Software Engineering",
    seats: 48,
    available: 0,
    deadline: "2026-01-30",
    status: "closed",
    location: "Bhaktapur",
  },
  {
    id: "6",
    institute: "Kantipur Engineering College",
    program: "BE Information Technology",
    seats: 48,
    available: 15,
    deadline: "2026-02-18",
    status: "open",
    location: "Lalitpur",
  },
];

const notices = [
  {
    id: "1",
    title: "IOE Entrance Exam 2082 Results Published",
    institute: "Institute of Engineering",
    date: "2026-01-28",
    type: "result",
    priority: "high",
  },
  {
    id: "2",
    title: "Scholarship Application Open for BE Students",
    institute: "Kathmandu University",
    date: "2026-01-27",
    type: "scholarship",
    priority: "high",
  },
  {
    id: "3",
    title: "New Semester Registration Deadline Extended",
    institute: "Pulchowk Campus",
    date: "2026-01-26",
    type: "academic",
    priority: "medium",
  },
  {
    id: "4",
    title: "Inter-College Hackathon 2026 Announcement",
    institute: "Nepal Engineering College",
    date: "2026-01-25",
    type: "event",
    priority: "medium",
  },
  {
    id: "5",
    title: "Practical Exam Schedule Released",
    institute: "Thapathali Campus",
    date: "2026-01-24",
    type: "exam",
    priority: "high",
  },
  {
    id: "6",
    title: "Industry Visit to Tech Companies",
    institute: "Advanced College of Engineering",
    date: "2026-01-23",
    type: "event",
    priority: "low",
  },
];

const featuredInstitutes = [
  {
    name: "Institute of Engineering (IOE)",
    location: "Pulchowk, Lalitpur",
    programs: 12,
    students: 5000,
    image: "🏛️",
  },
  {
    name: "Kathmandu University",
    location: "Dhulikhel, Kavre",
    programs: 8,
    students: 3000,
    image: "🎓",
  },
  {
    name: "Pokhara University",
    location: "Pokhara, Kaski",
    programs: 6,
    students: 2500,
    image: "🏫",
  },
  {
    name: "Nepal Engineering College",
    location: "Changunarayan, Bhaktapur",
    programs: 5,
    students: 1200,
    image: "🏢",
  },
];

const getStatusBadge = (status: string, available: number) => {
  if (status === "closed" || available === 0) {
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Closed</Badge>;
  }
  if (status === "closing_soon" || available < 10) {
    return <Badge className="bg-amber-500 gap-1"><Clock className="w-3 h-3" />Closing Soon</Badge>;
  }
  return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Open</Badge>;
};

const getNoticeTypeBadge = (type: string) => {
  const styles: Record<string, string> = {
    result: "bg-green-500",
    scholarship: "bg-primary",
    academic: "bg-secondary",
    event: "bg-accent",
    exam: "bg-amber-500",
  };
  return <Badge className={styles[type] || "bg-muted"}>{type}</Badge>;
};

const Institutes = () => {
  const [activeTab, setActiveTab] = useState("admissions");

  return (
    <section id="institutes" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Building2 className="w-3 h-3 mr-1" />
            Engineering Institutes
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Nepal's Top <span className="text-primary">Engineering Colleges</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay updated with admissions, available seats, and latest notices from premier 
            engineering institutes across Nepal.
          </p>
        </div>

        {/* Featured Institutes */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {featuredInstitutes.map((inst) => (
            <Card key={inst.name} className="border-border/50 hover:shadow-lg hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {inst.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1">{inst.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {inst.location}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {inst.programs} Programs
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {inst.students.toLocaleString()}+
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="admissions" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Admissions
            </TabsTrigger>
            <TabsTrigger value="notices" className="gap-2">
              <Bell className="w-4 h-4" />
              Notices
            </TabsTrigger>
          </TabsList>

          {/* Admissions Tab */}
          <TabsContent value="admissions">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {admissions.map((admission) => (
                <Card key={admission.id} className="border-border/50 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{admission.program}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          {admission.institute}
                        </CardDescription>
                      </div>
                      {getStatusBadge(admission.status, admission.available)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {admission.location}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(admission.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    
                    {/* Seats Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Seats</span>
                        <span className="font-medium">{admission.available} / {admission.seats}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            admission.available === 0 ? "bg-destructive" :
                            admission.available < 10 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${((admission.seats - admission.available) / admission.seats) * 100}%` }}
                        />
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" disabled={admission.available === 0}>
                      {admission.available > 0 ? "Apply Now" : "Admissions Closed"}
                      {admission.available > 0 && <ExternalLink className="w-3.5 h-3.5 ml-2" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Notices Tab */}
          <TabsContent value="notices">
            <div className="space-y-3 max-w-3xl mx-auto">
              {notices.map((notice) => (
                <Card key={notice.id} className="border-border/50 hover:shadow-md hover:border-primary/30 transition-all">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      notice.priority === "high" ? "bg-destructive/10 text-destructive" :
                      notice.priority === "medium" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {notice.type === "result" ? <Award className="w-6 h-6" /> :
                       notice.type === "scholarship" ? <GraduationCap className="w-6 h-6" /> :
                       notice.type === "exam" ? <BookOpen className="w-6 h-6" /> :
                       <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNoticeTypeBadge(notice.type)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(notice.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <h3 className="font-medium line-clamp-1">{notice.title}</h3>
                      <p className="text-sm text-muted-foreground">{notice.institute}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button variant="hero" size="lg">
            <Building2 className="w-4 h-4 mr-2" />
            View All Institutes
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Institutes;
