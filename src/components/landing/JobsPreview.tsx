import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Briefcase, MapPin, Clock, DollarSign, Building2, ArrowRight, Users, Zap
} from "lucide-react";

const featuredJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechNP Solutions",
    logo: "🏢",
    location: "Kathmandu",
    type: "Full-time",
    salary: "NPR 1.5L - 2L",
    postedAt: "2 days ago",
    applicants: 45,
    skills: ["React", "TypeScript", "Tailwind"],
  },
  {
    id: "2",
    title: "UI/UX Designer",
    company: "DigitalKraft Nepal",
    logo: "🎨",
    location: "Remote",
    type: "Remote",
    salary: "NPR 80K - 1.2L",
    postedAt: "1 week ago",
    applicants: 78,
    skills: ["Figma", "Adobe XD", "Prototyping"],
  },
  {
    id: "3",
    title: "Machine Learning Engineer",
    company: "AI Nepal Labs",
    logo: "🤖",
    location: "Lalitpur",
    type: "Full-time",
    salary: "NPR 2L - 3L",
    postedAt: "3 days ago",
    applicants: 23,
    skills: ["Python", "TensorFlow", "MLOps"],
  },
  {
    id: "4",
    title: "Backend Developer Intern",
    company: "CodeCraft Nepal",
    logo: "💻",
    location: "Pokhara",
    type: "Internship",
    salary: "NPR 20K - 30K",
    postedAt: "1 day ago",
    applicants: 156,
    skills: ["Node.js", "PostgreSQL", "APIs"],
  },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case "Full-time": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Remote": return "bg-primary/10 text-primary border-primary/20";
    case "Internship": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const JobsPreview = () => {
  return (
    <section id="jobs" className="w-full bg-white py-20 md:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Briefcase className="w-3 h-3 mr-1" />
            Job Opportunities
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Land Your <span className="text-primary">Dream Job</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover opportunities from top companies in Nepal. Apply with your 
            performance-based profile and stand out from the crowd.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Open Positions", value: "250+", icon: Briefcase },
            { label: "Companies Hiring", value: "80+", icon: Building2 },
            { label: "Applications", value: "5K+", icon: Users },
            { label: "Placements", value: "1.2K+", icon: Zap },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 text-center">
              <CardContent className="p-4">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {featuredJobs.map((job) => (
            <Card key={job.id} className="border-border/50 hover:shadow-lg hover:border-primary/30 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-2xl">
                    {job.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {job.company}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={getTypeColor(job.type)}>
                    {job.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salary}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {job.postedAt}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {job.applicants} applicants
                  </span>
                  <Button variant="hero" size="sm">
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup">
              Explore All Jobs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JobsPreview;
