import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  MapPin,
  Search,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JobApplicationWizard from "@/components/jobs/JobApplicationWizard";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSearch,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";
import { useToast } from "@/hooks/use-toast";
import {
  getBookmarkedJobIds,
  toggleBookmarkJobId,
  logUserActivity,
} from "@/lib/activityLogger";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  description: string;
  skills: string[];
  requirements: string[];
}

const formatSalary = (minimum: unknown, maximum: unknown) => {
  const min = Number(minimum || 0);
  const max = Number(maximum || 0);
  if (min && max) return `NPR ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (max) return `Up to NPR ${max.toLocaleString()}`;
  if (min) return `From NPR ${min.toLocaleString()}`;
  return "Salary not disclosed";
};

const formatPostedAt = (value: unknown) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "Recently posted";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

const mapJob = (row: Record<string, any>): Job => ({
  id: String(row.id),
  title: String(row.title || "Untitled job"),
  company: String(row.companies?.name || "MeroTalent employer"),
  location: String(row.location || "Nepal"),
  type: String(row.job_type || "Job").replace(/_/g, " "),
  salary: formatSalary(row.salary_min, row.salary_max),
  postedAt: formatPostedAt(row.created_at),
  description: String(row.description || ""),
  skills: Array.isArray(row.skills_required) ? row.skills_required.map(String) : [],
  requirements: Array.isArray(row.requirements)
    ? row.requirements.map(String)
    : String(row.requirements || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
});

const Jobs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => new Set(getBookmarkedJobIds(user?.id)));

  useEffect(() => {
    setSavedJobs(new Set(getBookmarkedJobIds(user?.id)));
  }, [user?.id]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<Job | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      const jobsQuery = (supabase as any)
        .from("jobs")
        .select("*, companies(name, logo_url)")
        .eq("status", "published")
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      const applicationsQuery = user
        ? (supabase as any).from("job_applications").select("job_id").eq("user_id", user.id)
        : Promise.resolve({ data: [], error: null });
      const [jobsResult, applicationsResult] = await Promise.all([jobsQuery, applicationsQuery]);

      if (jobsResult.error) {
        setJobs([]);
        toast({ variant: "destructive", title: "Unable to load jobs", description: jobsResult.error.message });
      } else {
        setJobs((jobsResult.data || []).map(mapJob));
      }
      setAppliedJobIds(new Set((applicationsResult.data || []).map((item: { job_id: string }) => item.job_id)));
      setIsLoading(false);
    };

    void loadJobs();
  }, [toast, user]);

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return jobs.filter((job) =>
      !query ||
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.skills.some((skill) => skill.toLowerCase().includes(query)),
    );
  }, [jobs, searchQuery]);

  const savedJobsList = jobs.filter((job) => savedJobs.has(job.id));
  const appliedJobsList = jobs.filter((job) => appliedJobIds.has(job.id));
  const companyCount = new Set(jobs.map((job) => job.company)).size;

  const toggleSaveJob = (job: Job) => {
    const isNowSaved = toggleBookmarkJobId(job.id, user?.id);
    setSavedJobs((current) => {
      const next = new Set(current);
      if (isNowSaved) next.add(job.id);
      else next.delete(job.id);
      return next;
    });

    logUserActivity(
      {
        id: `job-${job.id}`,
        kind: "job",
        title: job.title,
        detail: job.company,
        status: isNowSaved ? "bookmarked" : "viewed",
        occurredAt: new Date().toISOString(),
        href: "/dashboard/jobs",
      },
      user?.id
    );

    toast({
      title: isNowSaved ? "Job Bookmarked!" : "Bookmark Removed",
      description: isNowSaved
        ? `${job.title} has been added to your bookmarks.`
        : `${job.title} removed from bookmarks.`,
    });
  };

  const renderJobCard = (job: Job) => (
    <Card key={job.id} className={dashboardInteractiveSurface}>
      <CardHeader className="px-5 pb-3 pt-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-blue-50 text-lg font-black text-blue-700 ring-4 ring-blue-50/60">
            {job.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-lg">{job.title}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {job.company}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleSaveJob(job)} aria-label="Save job">
                {savedJobs.has(job.id) ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <p className="line-clamp-2 text-sm text-muted-foreground">{job.description || "View this position for full details."}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">{job.type}</Badge>
          <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{job.location}</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{job.salary}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.postedAt}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => setSelectedDetailJob(job)}
          >
            View Details
          </Button>
          <Button
            variant="hero"
            size="sm"
            className={dashboardPrimaryButton}
            disabled={appliedJobIds.has(job.id)}
            onClick={() => { setSelectedJob(job); setIsWizardOpen(true); }}
          >
            <Zap className="mr-1 h-4 w-4" />{appliedJobIds.has(job.id) ? "Applied" : "Apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderJobGrid = (items: Job[]) => items.length > 0 ? (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{items.map((job) => renderJobCard(job))}</div>
  ) : (
    <div className="py-12 text-center text-muted-foreground"><Briefcase className="mx-auto mb-3 h-10 w-10 opacity-50" />No jobs to show.</div>
  );

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader eyebrow="Your next move" title="Job opportunities" description="Explore approved roles and keep every application organised." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { value: jobs.length, label: "Open positions", icon: Briefcase },
          { value: companyCount, label: "Companies hiring", icon: Building2 },
          { value: savedJobs.size, label: "Saved jobs", icon: BookmarkCheck },
          { value: appliedJobIds.size, label: "Applications sent", icon: Zap },
        ].map(({ value, label, icon: Icon }) => (
          <Card key={label} className={dashboardSurface}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50"><Icon className="h-5 w-5 text-blue-700" /></div>
              <div><p className="text-2xl font-bold">{isLoading ? "—" : String(value)}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="browse" className="space-y-6">
        <div className="flex flex-col justify-between gap-3 rounded-[22px] border bg-white p-3 sm:flex-row">
          <TabsList className={dashboardTabs}>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="saved">Saved ({savedJobs.size})</TabsTrigger>
            <TabsTrigger value="applied">Applied ({appliedJobIds.size})</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search jobs, companies, skills..." className={`${dashboardSearch} pl-10`} />
          </div>
        </div>
        <TabsContent value="browse">{renderJobGrid(filteredJobs)}</TabsContent>
        <TabsContent value="saved">{renderJobGrid(savedJobsList)}</TabsContent>
        <TabsContent value="applied">{renderJobGrid(appliedJobsList)}</TabsContent>
      </Tabs>

      {/* Individual Job Detail Modal Dialog */}
      <Dialog open={selectedDetailJob !== null} onOpenChange={(open) => { if (!open) setSelectedDetailJob(null); }}>
        <DialogContent className="max-w-xl rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          {selectedDetailJob && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge className="capitalize text-xs font-bold">{selectedDetailJob.type}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => toggleSaveJob(selectedDetailJob)}>
                    {savedJobs.has(selectedDetailJob.id) ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
                  </Button>
                </div>
                <DialogTitle className="text-xl font-black text-slate-900 mt-2">
                  {selectedDetailJob.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{selectedDetailJob.company}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500" />{selectedDetailJob.location}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs font-bold">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold block">Salary</span>
                  <span className="text-slate-900">{selectedDetailJob.salary}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold block">Posted Date</span>
                  <span className="text-slate-900">{selectedDetailJob.postedAt}</span>
                </div>
              </div>

              {selectedDetailJob.description && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-1">Position Overview</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedDetailJob.description}</p>
                </div>
              )}

              {selectedDetailJob.requirements.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">Key Requirements</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                    {selectedDetailJob.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDetailJob.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailJob.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-3">
                <Button
                  variant="hero"
                  className={dashboardPrimaryButton}
                  disabled={appliedJobIds.has(selectedDetailJob.id)}
                  onClick={() => {
                    const target = selectedDetailJob;
                    setSelectedDetailJob(null);
                    setSelectedJob(target);
                    setIsWizardOpen(true);
                  }}
                >
                  <Zap className="mr-1.5 h-4 w-4" />
                  {appliedJobIds.has(selectedDetailJob.id) ? "Already Applied" : "Apply For Position"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedJob && (
        <JobApplicationWizard
          isOpen={isWizardOpen}
          onClose={() => { setIsWizardOpen(false); setSelectedJob(null); }}
          onSubmitted={(jobId) => {
            setAppliedJobIds((current) => new Set(current).add(jobId));
          }}
          job={{ ...selectedJob }}
        />
      )}
    </div>
  );
};

export default Jobs;
