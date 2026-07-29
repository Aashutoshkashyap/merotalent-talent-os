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
        return <Badge className="rounded-full bg-[#e8f7f1] text-xs font-black text-[#238366] hover:bg-[#e8f7f1]">Admissions Open</Badge>;
      case "limited":
        return <Badge className="rounded-full bg-[#fff7d8] text-xs font-black text-[#9a6500] hover:bg-[#fff7d8]">Limited Seats</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full text-xs font-black">Closed</Badge>;
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case "result": return <FileText className="w-4 h-4 text-blue-500" />;
      case "admission": return <GraduationCap className="w-4 h-4 text-green-500" />;
      case "scholarship": return <Users className="h-4 w-4 text-[#c2410c]" />;
      case "exam": return <Calendar className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pb-6 pt-[68px] sm:pb-8">
        {/* Hero Section */}
        <section className="w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_22px_56px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:p-7 lg:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
            <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-xs font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
              <GraduationCap className="mr-1 h-3 w-3" />
              Engineering Directory
            </Badge>
            <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
              Make a smarter choice about where you <span className="text-[#c2410c]">learn.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
              Track admissions, available seats, and latest notices from top engineering colleges across Nepal.
            </p>
            
            <div className="relative mt-7 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
              <Input
                placeholder="Search institutes or programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
              />
            </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["6", "Institutes"],
                ["232", "Seats open"],
                ["7", "Fresh notices"],
              ].map(([value, label], index) => (
                <div key={label} className={`min-h-[112px] rounded-[18px] border p-4 ${index === 1 ? "border-[#d9eee6] bg-[#e8f7f1]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                  <p className={`text-xl font-black ${index === 1 ? "text-[#238366]" : "text-[#172039]"}`}>{value}</p>
                  <p className="mt-5 text-xs font-bold text-[#8e868e]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-3 shadow-[0_18px_46px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-5 lg:p-7">
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="mx-auto w-full max-w-md rounded-[14px] border border-[#eee7e2] bg-[#faf7f5] p-1">
                <TabsTrigger value="institutes" className="flex-1 gap-2 rounded-[10px] text-xs font-black data-[state=active]:bg-[#c2410c] data-[state=active]:text-white">
                  <GraduationCap className="w-4 h-4" />
                  Institutes
                </TabsTrigger>
                <TabsTrigger value="notices" className="flex-1 gap-2 rounded-[10px] text-xs font-black data-[state=active]:bg-[#c2410c] data-[state=active]:text-white">
                  <Bell className="w-4 h-4" />
                  Notices
                </TabsTrigger>
              </TabsList>

              <TabsContent value="institutes">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredInstitutes.map((institute) => (
                    <Card key={institute.id} className="rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)]">
                      <CardHeader className="px-5 pb-3 pt-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#fff0e7] text-xl">
                            {institute.logo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="line-clamp-1 text-base font-black text-[#20273c]">{institute.shortName}</CardTitle>
                            <p className="mt-1 line-clamp-1 text-xs text-[#8f8790]">{institute.name}</p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 px-5 pb-5">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(institute.admissionStatus)}
                          <Badge variant="outline" className="rounded-full border-[#e8e1dc] text-xs font-bold">{institute.type}</Badge>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-[#8f8790]">
                          <MapPin className="w-4 h-4" />
                          {institute.location}
                        </div>

                        {/* Seats Info */}
                        <div className="rounded-[14px] bg-[#faf7f5] p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-[#8f8790]">Available Seats</span>
                            <span className="text-xs font-black text-[#20273c]">
                              {institute.availableSeats} / {institute.totalSeats}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eee7e2]">
                            <div
                              className="h-full rounded-full bg-[#c2410c]"
                              style={{ width: `${((institute.totalSeats - institute.availableSeats) / institute.totalSeats) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Programs */}
                        <div className="flex flex-wrap gap-1">
                          {institute.programs.slice(0, 4).map((program) => (
                            <Badge key={program} variant="secondary" className="rounded-lg bg-[#faf7f5] text-xs font-bold text-[#777078]">
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
                          <div className="flex items-center gap-2 text-xs text-[#716b73]">
                            <Calendar className="h-3.5 w-3.5 text-[#c2410c]" />
                            <span>Deadline: {new Date(institute.admissionDeadline).toLocaleDateString()}</span>
                          </div>
                        )}

                        <Button variant="outline" size="sm" className="h-10 w-full rounded-xl border-[#e9dfda] text-xs font-black text-[#c2410c] hover:border-[#fdba74] hover:bg-[#fff0e7]" asChild>
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
                <Card className="rounded-[22px] border-[#f0e8e3] shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg font-black text-[#20273c]">Latest Notices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allNotices.map((notice) => (
                        <div
                          key={notice.id}
                          className="flex items-start gap-4 rounded-[16px] border border-[#f0e8e3] p-4 transition-colors hover:bg-[#fffaf7]"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#faf7f5]">
                            {getNoticeIcon(notice.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black text-[#303649]">{notice.title}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-[#8f8790]">
                              <span>{notice.institute}</span>
                              <span>•</span>
                              <span>{new Date(notice.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full text-xs font-bold capitalize">{notice.type}</Badge>
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
