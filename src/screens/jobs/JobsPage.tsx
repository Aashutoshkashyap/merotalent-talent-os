import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Clock, DollarSign, Search, Building2, Users, ArrowRight } from "lucide-react";

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Internship", "Remote"];
const experienceLevels = ["All Levels", "Entry", "Mid", "Senior", "Lead"];

const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechNP Solutions",
    logo: "🏢",
    location: "Kathmandu, Nepal",
    type: "Full-time",
    salary: "NPR 1,50,000 - 2,00,000",
    experience: "Senior",
    postedAt: "2 days ago",
    applicants: 45,
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
  },
  {
    id: "2",
    title: "UI/UX Designer",
    company: "DigitalKraft Nepal",
    logo: "🎨",
    location: "Remote",
    type: "Remote",
    salary: "NPR 80,000 - 1,20,000",
    experience: "Mid",
    postedAt: "1 week ago",
    applicants: 78,
    skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
  },
  {
    id: "3",
    title: "Machine Learning Engineer",
    company: "AI Nepal Labs",
    logo: "🤖",
    location: "Lalitpur, Nepal",
    type: "Full-time",
    salary: "NPR 2,00,000 - 3,00,000",
    experience: "Senior",
    postedAt: "3 days ago",
    applicants: 23,
    skills: ["Python", "TensorFlow", "PyTorch", "MLOps"],
  },
  {
    id: "4",
    title: "Product Manager",
    company: "StartupNP",
    logo: "🚀",
    location: "Kathmandu, Nepal",
    type: "Full-time",
    salary: "NPR 1,80,000 - 2,50,000",
    experience: "Mid",
    postedAt: "5 days ago",
    applicants: 34,
    skills: ["Product Strategy", "Agile", "Data Analysis"],
  },
  {
    id: "5",
    title: "Backend Developer Intern",
    company: "CodeCraft Nepal",
    logo: "💻",
    location: "Pokhara, Nepal",
    type: "Internship",
    salary: "NPR 20,000 - 30,000",
    experience: "Entry",
    postedAt: "1 day ago",
    applicants: 156,
    skills: ["Node.js", "PostgreSQL", "REST APIs"],
  },
  {
    id: "6",
    title: "DevOps Engineer",
    company: "CloudNP",
    logo: "☁️",
    location: "Remote",
    type: "Contract",
    salary: "NPR 1,20,000 - 1,80,000",
    experience: "Mid",
    postedAt: "4 days ago",
    applicants: 28,
    skills: ["AWS", "Docker", "Kubernetes", "Terraform"],
  },
];

const JobsPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeType, setActiveType] = useState("All");
  const [activeExperience, setActiveExperience] = useState("All Levels");

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = activeType === "All" || job.type === activeType;
    const matchesExperience = activeExperience === "All Levels" || job.experience === activeExperience.replace(" Level", "");
    return matchesSearch && matchesType && matchesExperience;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pb-6 pt-[68px] sm:pb-8">
        {/* Hero Section */}
        <section className="w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_22px_56px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:p-7 lg:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
            <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-xs font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
              <Briefcase className="mr-1 h-3 w-3" />
              Job Board
            </Badge>
            <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
              Find work that values what you can <span className="text-[#c2410c]">actually do.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
              Discover opportunities from top companies in Nepal. Apply with your profile and stand out with verified skills.
            </p>
            
            {/* Search */}
            <div className="relative mt-7 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
              <Input
                placeholder="Search jobs, companies, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
              />
            </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["350+", "Open roles"],
                ["84%", "Avg. match"],
                ["42", "Hiring teams"],
              ].map(([value, label], index) => (
                <div key={label} className={`min-h-[112px] rounded-[18px] border p-4 ${index === 1 ? "border-[#d9eee6] bg-[#e8f7f1]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                  <p className={`text-xl font-black ${index === 1 ? "text-[#238366]" : "text-[#172039]"}`}>{value}</p>
                  <p className="mt-5 text-xs font-bold text-[#8e868e]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mt-3 w-full rounded-[22px] border border-[#eee7e2] bg-[#fffdfb] px-4 py-4 shadow-[0_14px_32px_rgba(99,55,29,0.05)] sm:px-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {jobTypes.map((type) => (
                  <Button
                    key={type}
                    variant={activeType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveType(type)}
                    className={`h-10 rounded-full border-[#ece3de] px-4 text-xs font-black ${activeType === type ? "bg-[#c2410c] hover:bg-[#9a3412]" : "bg-white text-[#746d75] hover:border-[#fdba74] hover:text-[#c2410c]"}`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <Select value={activeExperience} onValueChange={setActiveExperience}>
                <SelectTrigger className="h-10 w-44 rounded-xl border-[#ece3de] bg-[#faf7f5] text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Jobs Grid */}
        <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-3 shadow-[0_18px_46px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-5 lg:p-7">
          <div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              {filteredJobs.map((job) => (
                <Card key={job.id} className={`group rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)] ${job.id === "1" ? "md:col-span-2 lg:col-span-8" : "lg:col-span-4"}`}>
                  <CardHeader className="pb-3 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#fff0e7] text-xl">
                        {job.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="line-clamp-1 text-base font-black text-[#20273c] transition-colors group-hover:text-[#c2410c]">
                          {job.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#8f8790]">
                          <Building2 className="w-3 h-3" />
                          {job.company}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 px-5 pb-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-[#fed7aa] bg-[#fff7ed] text-xs font-black text-[#c2410c]">{job.type}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1 rounded-full border-[#e8e1dc] text-xs font-bold text-[#777078]">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#575362]">
                      <DollarSign className="h-3.5 w-3.5 text-[#238366]" />
                      {job.salary}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="rounded-lg bg-[#faf7f5] text-xs font-bold text-[#777078]">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between border-t border-[#f0e8e3] px-5 py-3">
                    <div className="flex items-center gap-4 text-xs text-[#989097]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.postedAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.applicants}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-10 rounded-lg text-xs font-black text-[#c2410c] hover:bg-[#fff0e7] hover:text-[#c2410c]" asChild>
                      <Link to={`/dashboard/jobs`}>
                        Apply
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="py-16 text-center">
                <Briefcase className="mx-auto mb-4 h-14 w-14 text-[#d9cfc9]" />
                <h3 className="mb-2 text-lg font-black text-[#20273c]">No jobs found</h3>
                <p className="text-sm text-[#8f8790]">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
