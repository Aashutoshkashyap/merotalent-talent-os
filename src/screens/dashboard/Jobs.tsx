import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Search, 
  Building2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Users,
  Zap
} from "lucide-react";
import JobApplicationWizard from "@/components/jobs/JobApplicationWizard";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSearch,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship" | "Remote";
  salary: string;
  postedAt: string;
  description: string;
  skills: string[];
  requirements: string[];
  applicants: number;
  isSaved?: boolean;
  isApplied?: boolean;
}

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set(["1", "3"]));
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const jobs: Job[] = [
    {
      id: "1",
      title: "Senior Frontend Developer",
      company: "TechNP Solutions",
      companyLogo: "🏢",
      location: "Kathmandu, Nepal",
      type: "Full-time",
      salary: "NPR 1,50,000 - 2,00,000",
      postedAt: "2 days ago",
      description: "We're looking for a skilled frontend developer to join our team and build modern web applications using React and TypeScript.",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
      requirements: [
        "3+ years of experience with React",
        "Strong TypeScript skills",
        "Experience with state management",
        "Familiarity with testing frameworks"
      ],
      applicants: 45,
      isSaved: true,
    },
    {
      id: "2",
      title: "UI/UX Designer",
      company: "DigitalKraft Nepal",
      companyLogo: "🎨",
      location: "Remote",
      type: "Remote",
      salary: "NPR 80,000 - 1,20,000",
      postedAt: "1 week ago",
      description: "Join our design team to create beautiful and intuitive user experiences for our clients across various industries.",
      skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
      requirements: [
        "2+ years of UX design experience",
        "Strong portfolio showcasing design work",
        "Experience with design systems",
        "User research skills"
      ],
      applicants: 78,
    },
    {
      id: "3",
      title: "Machine Learning Engineer",
      company: "AI Nepal Labs",
      companyLogo: "🤖",
      location: "Lalitpur, Nepal",
      type: "Full-time",
      salary: "NPR 2,00,000 - 3,00,000",
      postedAt: "3 days ago",
      description: "Work on cutting-edge AI/ML projects and help build intelligent systems that solve real-world problems.",
      skills: ["Python", "TensorFlow", "PyTorch", "MLOps"],
      requirements: [
        "MS/PhD in Computer Science or related field",
        "Experience with deep learning frameworks",
        "Published research is a plus",
        "Strong mathematical foundations"
      ],
      applicants: 23,
      isSaved: true,
    },
    {
      id: "4",
      title: "Product Manager",
      company: "StartupNP",
      companyLogo: "🚀",
      location: "Kathmandu, Nepal",
      type: "Full-time",
      salary: "NPR 1,80,000 - 2,50,000",
      postedAt: "5 days ago",
      description: "Lead product strategy and development for our flagship SaaS platform serving businesses across South Asia.",
      skills: ["Product Strategy", "Agile", "Data Analysis", "Stakeholder Management"],
      requirements: [
        "3+ years of product management experience",
        "Experience with SaaS products",
        "Strong analytical skills",
        "Excellent communication skills"
      ],
      applicants: 34,
    },
    {
      id: "5",
      title: "Backend Developer Intern",
      company: "CodeCraft Nepal",
      companyLogo: "💻",
      location: "Pokhara, Nepal",
      type: "Internship",
      salary: "NPR 20,000 - 30,000",
      postedAt: "1 day ago",
      description: "Great opportunity for students to gain hands-on experience in backend development with Node.js and PostgreSQL.",
      skills: ["Node.js", "PostgreSQL", "REST APIs", "Git"],
      requirements: [
        "Currently pursuing CS degree",
        "Basic knowledge of JavaScript",
        "Eager to learn",
        "Available for 3+ months"
      ],
      applicants: 156,
    },
    {
      id: "6",
      title: "DevOps Engineer",
      company: "CloudNP",
      companyLogo: "☁️",
      location: "Remote",
      type: "Contract",
      salary: "NPR 1,20,000 - 1,80,000",
      postedAt: "4 days ago",
      description: "Help us build and maintain scalable cloud infrastructure using AWS and Kubernetes.",
      skills: ["AWS", "Docker", "Kubernetes", "Terraform"],
      requirements: [
        "Experience with AWS services",
        "Container orchestration knowledge",
        "CI/CD pipeline experience",
        "Infrastructure as code skills"
      ],
      applicants: 28,
    },
  ];

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsWizardOpen(true);
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const savedJobsList = jobs.filter((job) => savedJobs.has(job.id));

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Full-time": return "bg-success/10 text-success border-success/20";
      case "Part-time": return "bg-accent/10 text-accent border-accent/20";
      case "Contract": return "bg-warning/10 text-warning border-warning/20";
      case "Internship": return "bg-primary/10 text-primary border-primary/20";
      case "Remote": return "bg-secondary/10 text-secondary border-secondary/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const JobCard = ({ job }: { job: Job }) => (
    <Card className={dashboardInteractiveSurface}>
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] bg-[#fff0e4] text-2xl ring-4 ring-[#fff8f2]">
            {job.companyLogo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3" />
                  {job.company}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => toggleSaveJob(job.id)}
              >
                {savedJobs.has(job.id) ? (
                  <BookmarkCheck className="w-5 h-5 text-primary fill-primary" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5">
        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={getTypeColor(job.type)}>
            {job.type}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.location}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {job.skills.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{job.skills.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {job.salary}
            </span>
          </div>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {job.postedAt}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {job.applicants} applicants
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button variant="hero" size="sm" className={dashboardPrimaryButton} onClick={() => handleApply(job)}>
              <Zap className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Your next move"
        title="Job opportunities"
        description="Explore focused roles from verified employers and keep every application organised."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className={`${dashboardSurface} bg-[#fff5ed]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Open Positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#effbf7]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">42</p>
                <p className="text-xs text-muted-foreground">Companies Hiring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#f3f9ff]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <BookmarkCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{savedJobs.size}</p>
                <p className="text-xs text-muted-foreground">Saved Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#fff9e9]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-xs text-muted-foreground">Applications Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <div className="flex flex-col justify-between gap-3 rounded-[22px] border border-[#f0e2d7] bg-white p-3 shadow-[0_14px_40px_rgba(69,42,21,0.045)] sm:flex-row">
          <TabsList className={`${dashboardTabs} border-none bg-[#fff8f2] shadow-none`}>
            <TabsTrigger value="browse">Browse Jobs</TabsTrigger>
            <TabsTrigger value="saved">Saved ({savedJobs.size})</TabsTrigger>
            <TabsTrigger value="applied">Applied (5)</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99919a]" />
            <Input
              placeholder="Search jobs, companies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${dashboardSearch} pl-10`}
            />
          </div>
        </div>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No jobs found matching your search.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          {savedJobsList.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {savedJobsList.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No saved jobs yet. Bookmark jobs you're interested in!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="applied" className="space-y-6">
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Your job applications will appear here.</p>
            <Button variant="outline" className="mt-4">
              Browse Jobs
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Job Application Wizard */}
      {selectedJob && (
        <JobApplicationWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setSelectedJob(null);
          }}
          job={{
            id: selectedJob.id,
            title: selectedJob.title,
            company: selectedJob.company,
            location: selectedJob.location,
            salary: selectedJob.salary,
            requirements: selectedJob.requirements,
            skills: selectedJob.skills,
          }}
        />
      )}
    </div>
  );
};

export default Jobs;
