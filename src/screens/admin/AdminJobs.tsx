import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Briefcase, Plus, Search, Building2, MapPin, Clock, Users, Eye, Pencil, Trash2,
  FileText, CheckCircle, XCircle, AlertCircle, DollarSign, Loader2, ExternalLink, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { generateJobDetails } from "@/lib/ai/ai-generator";
import { SEED_JOBS } from "@/lib/admin/admin-seed-fallbacks";

interface Job {
  id: string;
  title: string;
  description: string | null;
  company_id: string | null;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string[] | null;
  requirements: string[] | null;
  is_active: boolean | null;
  is_remote: boolean | null;
  external_link: string | null;
  application_deadline: string | null;
  created_at: string;
}

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    job_type: "full-time",
    experience_level: "entry",
    salary_min: "",
    salary_max: "",
    skills_required: "",
    requirements: "",
    is_active: true,
    is_remote: false,
    external_link: "",
    application_deadline: "",
  });

  const handleAIGenerate = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Job title required",
        description: "Please type the job title first before generating with AI.",
      });
      return;
    }

    setIsAiGenerating(true);
    try {
      const aiResult = await generateJobDetails(formData.title, formData.job_type, formData.location || "Kathmandu");
      setFormData((current) => ({
        ...current,
        description: current.description || aiResult.description,
        requirements: current.requirements || aiResult.requirements.join("\n"),
        skills_required: current.skills_required || aiResult.skills.join(", "),
      }));
      toast({
        title: "AI Generation Complete!",
        description: "Job description, requirements, and key skills generated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "AI Generation failed",
        description: "Unable to generate job details.",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      setJobs(data);
    } else {
      setJobs(SEED_JOBS as unknown as Job[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }

    setIsSubmitting(true);

    const jobData = {
      title: formData.title,
      description: formData.description || null,
      location: formData.location || null,
      job_type: formData.job_type,
      experience_level: formData.experience_level,
      salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
      salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
      skills_required: formData.skills_required ? formData.skills_required.split(",").map(s => s.trim()) : null,
      requirements: formData.requirements ? formData.requirements.split("\n").filter(r => r.trim()) : null,
      is_active: formData.is_active,
      is_remote: formData.is_remote,
      external_link: formData.external_link || null,
    };

    let error;
    if (editingJob) {
      const result = await supabase.from("jobs").update(jobData).eq("id", editingJob.id);
      error = result.error;
    } else {
      const result = await supabase.from("jobs").insert(jobData);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingJob ? "Job updated!" : "Job posted!" });
      resetForm();
      fetchJobs();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this job listing?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Job deleted" });
      fetchJobs();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean | null) => {
    const { error } = await supabase.from("jobs").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      toast({ title: currentStatus ? "Job deactivated" : "Job activated" });
      fetchJobs();
    }
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description || "",
      location: job.location || "",
      job_type: job.job_type || "full-time",
      experience_level: job.experience_level || "entry",
      salary_min: job.salary_min?.toString() || "",
      salary_max: job.salary_max?.toString() || "",
      skills_required: job.skills_required?.join(", ") || "",
      requirements: job.requirements?.join("\n") || "",
      is_active: job.is_active ?? true,
      is_remote: job.is_remote ?? false,
      external_link: job.external_link || "",
      application_deadline: job.application_deadline || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      job_type: "full-time",
      experience_level: "entry",
      salary_min: "",
      salary_max: "",
      skills_required: "",
      requirements: "",
      is_active: true,
      is_remote: false,
      external_link: "",
      application_deadline: "",
    });
    setEditingJob(null);
    setIsDialogOpen(false);
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    { label: "Active Jobs", value: jobs.filter(j => j.is_active).length, icon: Briefcase, color: "text-primary" },
    { label: "Total Posted", value: jobs.length, icon: FileText, color: "text-secondary" },
    { label: "Remote Jobs", value: jobs.filter(j => j.is_remote).length, icon: MapPin, color: "text-green-500" },
    { label: "Closed", value: jobs.filter(j => !j.is_active).length, icon: XCircle, color: "text-muted-foreground" },
  ];

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Job Board Management</h1>
          <p className="text-muted-foreground">Post and manage job listings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Job" : "Post New Job"}</DialogTitle>
              <DialogDescription>
                {editingJob ? "Update job details" : "Create a new job listing"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g., Senior Frontend Developer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-[#c2410c]/30 text-[#c2410c] hover:bg-[#fff5ed]"
                onClick={handleAIGenerate}
                disabled={isAiGenerating || !formData.title.trim()}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating job details with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Description, Requirements & Skills with AI
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Job description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Kathmandu, Nepal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>External Application Link</Label>
                  <Input
                    placeholder="https://company.com/apply"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={formData.job_type} onValueChange={(v) => setFormData({ ...formData, job_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Select value={formData.experience_level} onValueChange={(v) => setFormData({ ...formData, experience_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead/Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Min (NPR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max (NPR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100000"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Required Skills (comma-separated)</Label>
                <Input
                  placeholder="React, TypeScript, Node.js"
                  value={formData.skills_required}
                  onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Requirements (one per line)</Label>
                <Textarea
                  placeholder="3+ years experience&#10;Strong communication skills&#10;..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_remote}
                    onCheckedChange={(v) => setFormData({ ...formData, is_remote: v })}
                  />
                  <Label>Remote</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : (editingJob ? "Update Job" : "Post Job")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Jobs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{job.job_type}</Badge>
                      {job.is_remote && <Badge variant="secondary" className="text-xs">Remote</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {job.location || "-"}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{job.experience_level}</TableCell>
                <TableCell>
                  {job.salary_min && job.salary_max ? (
                    <span className="text-sm">
                      NPR {(job.salary_min / 1000).toFixed(0)}K - {(job.salary_max / 1000).toFixed(0)}K
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={job.is_active ? "default" : "secondary"}>
                    {job.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {job.external_link && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={job.external_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(job)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(job.id, job.is_active)}>
                      {job.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No jobs found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
};

export default AdminJobs;
