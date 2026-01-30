import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { GraduationCap, MapPin, Users, Calendar, ExternalLink, Search, Bell, FileText } from "lucide-react";

const institutes = [
  {
    id: "1",
    name: "Institute of Engineering, Pulchowk Campus",
    shortName: "IOE Pulchowk",
    type: "Government",
    location: "Lalitpur, Nepal",
    logo: "🏛️",
    totalSeats: 384,
    availableSeats: 0,
    admissionStatus: "closed",
    admissionDeadline: null,
    programs: ["Civil", "Computer", "Electronics", "Electrical", "Mechanical", "Architecture"],
    website: "https://pcampus.edu.np",
    notices: [
      { id: "n1", title: "BE/BArch Entrance Result Published", date: "2025-01-25", type: "result" },
      { id: "n2", title: "Admission Notice for Academic Year 2082", date: "2025-01-20", type: "admission" },
    ],
  },
  {
    id: "2",
    name: "Kathmandu University",
    shortName: "KU",
    type: "Private",
    location: "Dhulikhel, Kavre",
    logo: "🎓",
    totalSeats: 240,
    availableSeats: 45,
    admissionStatus: "open",
    admissionDeadline: "2025-02-15",
    programs: ["Computer Science", "Civil", "Electrical", "Mechanical", "Geomatics"],
    website: "https://ku.edu.np",
    notices: [
      { id: "n3", title: "Scholarship Applications Open", date: "2025-01-28", type: "scholarship" },
      { id: "n4", title: "Entrance Exam Schedule", date: "2025-01-22", type: "exam" },
    ],
  },
  {
    id: "3",
    name: "Tribhuvan University, Thapathali Campus",
    shortName: "TU Thapathali",
    type: "Government",
    location: "Kathmandu, Nepal",
    logo: "🏫",
    totalSeats: 192,
    availableSeats: 12,
    admissionStatus: "limited",
    admissionDeadline: "2025-02-01",
    programs: ["Civil", "Electronics", "Computer", "Electrical"],
    website: "https://tcioe.edu.np",
    notices: [
      { id: "n5", title: "Second Merit List Published", date: "2025-01-27", type: "result" },
    ],
  },
  {
    id: "4",
    name: "Pokhara University, School of Engineering",
    shortName: "PU Engineering",
    type: "Private",
    location: "Pokhara, Nepal",
    logo: "🏔️",
    totalSeats: 180,
    availableSeats: 60,
    admissionStatus: "open",
    admissionDeadline: "2025-02-20",
    programs: ["Civil", "Computer", "Electronics", "Architecture"],
    website: "https://pu.edu.np",
    notices: [
      { id: "n6", title: "Online Application Form Available", date: "2025-01-26", type: "admission" },
    ],
  },
  {
    id: "5",
    name: "Nepal Engineering College",
    shortName: "NEC",
    type: "Private",
    location: "Bhaktapur, Nepal",
    logo: "⚙️",
    totalSeats: 240,
    availableSeats: 80,
    admissionStatus: "open",
    admissionDeadline: "2025-02-28",
    programs: ["Civil", "Computer", "Electronics", "Electrical", "IT"],
    website: "https://nec.edu.np",
    notices: [],
  },
  {
    id: "6",
    name: "Advanced College of Engineering",
    shortName: "ACE",
    type: "Private",
    location: "Lalitpur, Nepal",
    logo: "🔧",
    totalSeats: 144,
    availableSeats: 35,
    admissionStatus: "open",
    admissionDeadline: "2025-02-10",
    programs: ["Civil", "Computer", "Electronics"],
    website: "https://ace.edu.np",
    notices: [
      { id: "n7", title: "Merit Scholarship Announcement", date: "2025-01-24", type: "scholarship" },
    ],
  },
];

const allNotices = institutes.flatMap((i) =>
  i.notices.map((n) => ({ ...n, institute: i.shortName }))
).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const InstitutesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("institutes");

  const filteredInstitutes = institutes.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.programs.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">Admissions Open</Badge>;
      case "limited":
        return <Badge className="bg-amber-500">Limited Seats</Badge>;
      default:
        return <Badge variant="secondary">Closed</Badge>;
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case "result": return <FileText className="w-4 h-4 text-blue-500" />;
      case "admission": return <GraduationCap className="w-4 h-4 text-green-500" />;
      case "scholarship": return <Users className="w-4 h-4 text-purple-500" />;
      case "exam": return <Calendar className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              <GraduationCap className="w-3 h-3 mr-1" />
              Engineering Directory
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Engineering <span className="text-primary">Institutes</span> in Nepal
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Track admissions, available seats, and latest notices from top engineering colleges across Nepal.
            </p>
            
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search institutes or programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="w-full max-w-md mx-auto">
                <TabsTrigger value="institutes" className="flex-1 gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Institutes
                </TabsTrigger>
                <TabsTrigger value="notices" className="flex-1 gap-2">
                  <Bell className="w-4 h-4" />
                  Notices
                </TabsTrigger>
              </TabsList>

              <TabsContent value="institutes">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInstitutes.map((institute) => (
                    <Card key={institute.id} className="hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-2xl">
                            {institute.logo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg line-clamp-1">{institute.shortName}</CardTitle>
                            <p className="text-sm text-muted-foreground line-clamp-1">{institute.name}</p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(institute.admissionStatus)}
                          <Badge variant="outline">{institute.type}</Badge>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {institute.location}
                        </div>

                        {/* Seats Info */}
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Available Seats</span>
                            <span className="font-semibold">
                              {institute.availableSeats} / {institute.totalSeats}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${((institute.totalSeats - institute.availableSeats) / institute.totalSeats) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Programs */}
                        <div className="flex flex-wrap gap-1">
                          {institute.programs.slice(0, 4).map((program) => (
                            <Badge key={program} variant="secondary" className="text-xs">
                              {program}
                            </Badge>
                          ))}
                          {institute.programs.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{institute.programs.length - 4}
                            </Badge>
                          )}
                        </div>

                        {institute.admissionDeadline && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>Deadline: {new Date(institute.admissionDeadline).toLocaleDateString()}</span>
                          </div>
                        )}

                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={institute.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Visit Website
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="notices">
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Notices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allNotices.map((notice) => (
                        <div
                          key={notice.id}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {getNoticeIcon(notice.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{notice.title}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>{notice.institute}</span>
                              <span>•</span>
                              <span>{new Date(notice.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">{notice.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default InstitutesPage;
