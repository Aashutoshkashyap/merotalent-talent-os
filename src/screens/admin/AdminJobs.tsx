import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Briefcase, Plus, Search, MapPin, Pencil, Trash2,
  FileText, CheckCircle, XCircle, Loader2, ExternalLink, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { generateJobDetails } from "@/lib/ai/ai-generator";
import {
  AdminClientError,
  createAdminResource,
  deleteAdminResource,
  listAdminResource,
  updateAdminResource,
} from "@/lib/admin/admin-client";

interface Job {
  id: string;
  title: string;
  description: string | null;
  company_id: string | null;
  owner_user_id: string | null;
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
  expires_at: string | null;
  status: "draft" | "pending_approval" | "published" | "rejected" | "closed" | "expired";
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
}

interface CompanyOption {
  id: string;
  user_id: string;
  name: string;
}

interface OwnerOption {
  user_id: string;
  full_name: string | null;
  email: string;
}

const adminErrorDescription = (error: unknown, fallback: string) => {
  if (error instanceof AdminClientError && error.fields) {
    const messages = Object.entries(error.fields)
      .flatMap(([field, details]) => details.map((detail) => `${field.replaceAll("_", " ")}: ${detail}`));
    if (messages.length > 0) return messages.join(" ");
  }
  return error instanceof Error ? error.message : fallback;
};

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    company_id: "",
    owner_user_id: "",
    description: "",
    location: "",
    job_type: "full-time",
    experience_level: "entry",
    salary_min: "",
    salary_max: "",
    skills_required: "",
    requirements: "",
    is_remote: false,
    external_link: "",
    application_deadline: "",
    status: "pending_approval" as Job["status"],
    rejection_reason: "",
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
    void Promise.all([fetchJobs(), fetchOwnershipOptions()]);
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await listAdminResource<Job>("jobs", {
        page_size: 100,
        sort_by: "created_at",
        sort_direction: "desc",
      });
      setJobs(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load jobs",
        description: error instanceof Error ? error.message : "The jobs could not be loaded.",
      });
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwnershipOptions = async () => {
    const [{ data: companyRows, error: companyError }, { data: profileRows, error: profileError }] =
      await Promise.all([
        (supabase as any)
          .from("companies")
          .select("id,user_id,name")
          .is("deleted_at", null)
          .order("name"),
        (supabase as any)
          .from("profiles")
          .select("user_id,full_name,email")
          .eq("account_status", "active")
          .is("deleted_at", null)
          .order("full_name"),
      ]);

    if (companyError || profileError) {
      toast({
        variant: "destructive",
        title: "Unable to load job owners",
        description: companyError?.message || profileError?.message,
      });
    }
    setCompanies((companyRows || []) as CompanyOption[]);
    setOwners((profileRows || []) as OwnerOption[]);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.owner_user_id) {
      toast({ variant: "destructive", title: "Title and owner are required" });
      return;
    }
    if (formData.status === "rejected" && !formData.rejection_reason.trim()) {
      toast({ variant: "destructive", title: "A rejection reason is required" });
      return;
    }
    const selectedCompany = companies.find((company) => company.id === formData.company_id);
    if (selectedCompany && selectedCompany.user_id !== formData.owner_user_id) {
      toast({ variant: "destructive", title: "The listing owner must match the selected company" });
      return;
    }

    setIsSubmitting(true);

    const jobData = {
      title: formData.title,
      company_id: formData.company_id || null,
      owner_user_id: formData.owner_user_id,
      description: formData.description || null,
      location: formData.location || null,
      job_type: formData.job_type,
      experience_level: formData.experience_level,
      salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
      salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
      skills_required: formData.skills_required ? formData.skills_required.split(",").map(s => s.trim()) : null,
      requirements: formData.requirements ? formData.requirements.split("\n").filter(r => r.trim()) : null,
      is_remote: formData.is_remote,
      external_link: formData.external_link || null,
      application_deadline: formData.application_deadline
        ? new Date(formData.application_deadline).toISOString()
        : null,
      expires_at: formData.application_deadline
        ? new Date(formData.application_deadline).toISOString()
        : null,
      status: formData.status,
      rejection_reason: formData.status === "rejected"
        ? formData.rejection_reason.trim() || null
        : null,
    };

    try {
      if (editingJob) {
        await updateAdminResource<Job>("jobs", editingJob.id, jobData);
      } else {
        await createAdminResource<Job>("jobs", jobData);
      }
      toast({ title: editingJob ? "Job updated!" : "Job posted!" });
      resetForm();
      await fetchJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to save job",
        description: adminErrorDescription(error, "The job could not be saved."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this job listing from active administration views?")) return;
    try {
      await deleteAdminResource("jobs", id);
      toast({ title: "Job removed" });
      await fetchJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to remove job",
        description: error instanceof Error ? error.message : "The job could not be removed.",
      });
    }
  };

  const updateJobStatus = async (job: Job, status: Job["status"]) => {
    let rejectionReason: string | null | undefined;
    if (status === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this job:", job.rejection_reason || "");
      if (rejectionReason === null) return;
      if (!rejectionReason.trim()) {
        toast({ variant: "destructive", title: "A rejection reason is required" });
        return;
      }
    }

    try {
      await updateAdminResource<Job>("jobs", job.id, {
        status,
        ...(status === "rejected" ? { rejection_reason: rejectionReason?.trim() } : {}),
      });
      toast({ title: status === "published" ? "Job approved and published" : `Job marked ${status.replace(/_/g, " ")}` });
      await fetchJobs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to update job status",
        description: error instanceof Error ? error.message : "The job status could not be changed.",
      });
    }
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company_id: job.company_id || "",
      owner_user_id: (job.company_id && companies.find((company) => company.id === job.company_id)?.user_id)
        || job.owner_user_id
        || "",
      description: job.description || "",
      location: job.location || "",
      job_type: job.job_type || "full-time",
      experience_level: job.experience_level || "entry",
      salary_min: job.salary_min?.toString() || "",
      salary_max: job.salary_max?.toString() || "",
      skills_required: job.skills_required?.join(", ") || "",
      requirements: job.requirements?.join("\n") || "",
      is_remote: job.is_remote ?? false,
      external_link: job.external_link || "",
      application_deadline: job.application_deadline ? job.application_deadline.slice(0, 16) : "",
      status: job.status,
      rejection_reason: job.rejection_reason || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      company_id: "",
      owner_user_id: "",
      description: "",
      location: "",
      job_type: "full-time",
      experience_level: "entry",
      salary_min: "",
      salary_max: "",
      skills_required: "",
      requirements: "",
      is_remote: false,
      external_link: "",
      application_deadline: "",
      status: "pending_approval",
      rejection_reason: "",
    });
    setEditingJob(null);
    setIsDialogOpen(false);
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(15);
  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * jobsPageSize;
    return filteredJobs.slice(start, start + jobsPageSize);
  }, [filteredJobs, jobsPage, jobsPageSize]);

  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const ownerNames = new Map(
    owners.map((owner) => [owner.user_id, owner.full_name || owner.email]),
  );

  const stats = [
    { label: "Published", value: jobs.filter(j => j.status === "published").length, icon: Briefcase, color: "text-primary" },
    { label: "Total Posted", value: jobs.length, icon: FileText, color: "text-secondary" },
    { label: "Remote Jobs", value: jobs.filter(j => j.is_remote).length, icon: MapPin, color: "text-green-500" },
    { label: "Awaiting Review", value: jobs.filter(j => j.status === "pending_approval").length, icon: XCircle, color: "text-muted-foreground" },
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select
                    value={formData.company_id || "unaffiliated"}
                    onValueChange={(value) => {
                      const company = companies.find((item) => item.id === value);
                      setFormData((current) => ({
                        ...current,
                        company_id: value === "unaffiliated" ? "" : value,
                        owner_user_id: company?.user_id || current.owner_user_id,
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unaffiliated">Independent / no company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Listing Owner *</Label>
                  <Select
                    value={formData.owner_user_id}
                    disabled={Boolean(formData.company_id)}
                    onValueChange={(owner_user_id) => setFormData({ ...formData, owner_user_id })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select an owner" /></SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner.user_id} value={owner.user_id}>
                          {owner.full_name || owner.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.status === "rejected" && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={formData.rejection_reason}
                    onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                    placeholder="Explain what the owner should correct."
                    rows={2}
                  />
                </div>
              )}

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
                  <Label>Application Deadline</Label>
                  <Input
                    type="datetime-local"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Workflow Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(status: Job["status"]) => setFormData({ ...formData, status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending approval</SelectItem>
                      <SelectItem value="published">Approve and publish</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
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

      <JobApplicantReview />
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
            {paginatedJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs font-semibold text-primary/80">
                      {(job.company_id && companyNames.get(job.company_id)) || (job.owner_user_id && ownerNames.get(job.owner_user_id)) || "Independent employer"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{job.job_type?.replace(/_/g, " ")}</Badge>
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
                  <Badge variant={job.status === "published" ? "default" : "secondary"} className="capitalize">
                    {job.status.replace(/_/g, " ")}
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
                    {job.status !== "published" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Approve and publish"
                        onClick={() => updateJobStatus(job, "published")}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {job.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reject"
                        onClick={() => updateJobStatus(job, "rejected")}
                      >
                        <XCircle className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No jobs found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t border-slate-100 px-4 bg-slate-50/50">
          <SystemPagination
            currentPage={jobsPage}
            totalPages={Math.ceil(filteredJobs.length / jobsPageSize)}
            totalItems={filteredJobs.length}
            pageSize={jobsPageSize}
            onPageChange={setJobsPage}
            onPageSizeChange={(size) => { setJobsPageSize(size); setJobsPage(1); }}
            itemLabel="jobs"
          />
        </div>
      </Card>
    </OperationsPage>
  );
};

export default AdminJobs;
import JobApplicantReview from "@/components/jobs/JobApplicantReview";
