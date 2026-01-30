import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Briefcase, Plus, Search, Building2, MapPin, Clock, Users, Eye, Pencil, Trash2,
  FileText, CheckCircle, XCircle, AlertCircle, DollarSign
} from "lucide-react";

const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120K - $150K",
    applications: 45,
    status: "active",
    posted: "2 days ago",
  },
  {
    id: "2",
    title: "Product Designer",
    company: "Design Studio",
    location: "Remote",
    type: "Full-time",
    salary: "$90K - $120K",
    applications: 32,
    status: "active",
    posted: "5 days ago",
  },
  {
    id: "3",
    title: "Data Analyst Intern",
    company: "Analytics Co.",
    location: "New York, NY",
    type: "Internship",
    salary: "$25/hr",
    applications: 78,
    status: "closed",
    posted: "2 weeks ago",
  },
];

const mockApplications = [
  {
    id: "1",
    candidate: "John Smith",
    job: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    status: "screening",
    matchScore: 92,
    applied: "1 day ago",
  },
  {
    id: "2",
    candidate: "Sarah Johnson",
    job: "Product Designer",
    company: "Design Studio",
    status: "interview",
    matchScore: 88,
    applied: "3 days ago",
  },
  {
    id: "3",
    candidate: "Mike Brown",
    job: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    status: "submitted",
    matchScore: 75,
    applied: "5 days ago",
  },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle }> = {
    submitted: { variant: "secondary", icon: FileText },
    screening: { variant: "outline", icon: AlertCircle },
    interview: { variant: "default", icon: CheckCircle },
    offered: { variant: "default", icon: CheckCircle },
    rejected: { variant: "destructive", icon: XCircle },
  };
  const style = styles[status] || styles.submitted;
  return (
    <Badge variant={style.variant} className="gap-1 capitalize">
      <style.icon className="w-3 h-3" />
      {status}
    </Badge>
  );
};

const AdminJobs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Job Board Management</h1>
          <p className="text-muted-foreground">Manage job listings and review applications</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post New Job</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Job posting form would go here with fields for title, description, requirements, etc.
            </p>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Jobs", value: "18", icon: Briefcase, color: "text-primary" },
          { label: "Total Applications", value: "324", icon: FileText, color: "text-secondary" },
          { label: "Interviews Scheduled", value: "12", icon: Users, color: "text-green-500" },
          { label: "Positions Filled", value: "8", icon: CheckCircle, color: "text-amber-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Job Listings
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="w-4 h-4" />
              Applications
            </TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="jobs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {job.type}
                          </Badge>
                          <span>{job.posted}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {job.company}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {job.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        {job.salary}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {job.applications}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.status === "active" ? "default" : "secondary"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Applied For</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.candidate}</TableCell>
                    <TableCell>{app.job}</TableCell>
                    <TableCell>{app.company}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${app.matchScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{app.matchScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{app.applied}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600">
                          Advance
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminJobs;
