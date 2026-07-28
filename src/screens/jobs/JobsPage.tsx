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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              <Briefcase className="w-3 h-3 mr-1" />
              Job Board
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Find Your Dream <span className="text-primary">Job</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Discover opportunities from top companies in Nepal. Apply with your profile and stand out with verified skills.
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {jobTypes.map((type) => (
                  <Button
                    key={type}
                    variant={activeType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveType(type)}
                    className="rounded-full"
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <Select value={activeExperience} onValueChange={setActiveExperience}>
                <SelectTrigger className="w-40">
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
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-2xl">
                        {job.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {job.company}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{job.type}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      {job.salary}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
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

                  <CardFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.postedAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.applicants}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
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
              <div className="text-center py-16">
                <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query</p>
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
