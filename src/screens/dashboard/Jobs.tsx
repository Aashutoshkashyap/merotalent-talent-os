import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Search,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
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
  fetchMatchingJobs,
  fetchStudentApplications,
  fetchStudentInterviews,
  fetchSavedJobsList,
  saveJobApi,
  unsaveJobApi,
  fetchJobPreferences,
  updateJobPreferences,
  type StudentJobApplication,
  type ScheduledInterview,
} from "@/lib/jobs/jobs-client";
import type { JobPreferences } from "@/lib/jobs/job-matching";

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
  matchScore?: number;
  matchReasons?: string[];
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
  company: String(row.companies?.name || row.company?.name || row.company_name || "MeroTalent Employer"),
  location: String(row.location || "Nepal"),
  type: String(row.job_type || "Job").replace(/_/g, " "),
  salary: formatSalary(row.salary_min, row.salary_max),
  postedAt: formatPostedAt(row.created_at),
  description: String(row.description || ""),
  skills: Array.isArray(row.skills_required) ? row.skills_required.map(String) : Array.isArray(row.skills) ? row.skills.map(String) : [],
  requirements: Array.isArray(row.requirements)
    ? row.requirements.map(String)
    : String(row.requirements || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
  matchScore: typeof row.matchScore === "number" ? row.matchScore : undefined,
  matchReasons: Array.isArray(row.matchReasons) ? row.matchReasons : undefined,
});

export default function Jobs() {
  const { user, session } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("matching");
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [matchingJobs, setMatchingJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<StudentJobApplication[]>([]);
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<Job | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Preferences Form
  const [preferences, setPreferences] = useState<JobPreferences>({
    preferred_categories: [],
    preferred_industries: [],
    preferred_job_titles: [],
    preferred_locations: [],
    preferred_job_levels: [],
    preferred_job_types: [],
    min_salary: null,
    max_salary: null,
    is_salary_negotiable: true,
  });
  const [prefSaving, setPrefSaving] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [session?.access_token]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch All Published Jobs
      const res = await fetch("/api/v1/jobs");
      const json = await res.json().catch(() => ({}));
      const jobsData = Array.isArray(json?.data) ? json.data : [];

      setAllJobs(jobsData.map(mapJob));

      if (session?.access_token) {
        const [matchingRes, appsRes, interviewsRes, savedRes, prefsRes] = await Promise.all([
          fetchMatchingJobs(session.access_token).catch(() => []),
          fetchStudentApplications(session.access_token).catch(() => []),
          fetchStudentInterviews(session.access_token).catch(() => []),
          fetchSavedJobsList(session.access_token).catch(() => []),
          fetchJobPreferences(session.access_token).catch(() => ({})),
        ]);

        setMatchingJobs((matchingRes || []).map(mapJob));
        setApplications(appsRes || []);
        setInterviews(interviewsRes || []);
        setSavedJobs((savedRes || []).map(mapJob));
        setSavedJobIds(new Set((savedRes || []).map((j: any) => j.id)));
        setPreferences(prefsRes || {});
      }
    } catch (err: any) {
      console.error("Failed to load jobs data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBookmark = async (job: Job) => {
    if (!session?.access_token) {
      toast({ variant: "destructive", title: "Sign in required to save jobs." });
      return;
    }
    const isSaved = savedJobIds.has(job.id);
    try {
      if (isSaved) {
        await unsaveJobApi(job.id, session.access_token);
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        setSavedJobs((prev) => prev.filter((j) => j.id !== job.id));
        toast({ title: "Job removed from saved list." });
      } else {
        await saveJobApi(job.id, session.access_token);
        setSavedJobIds((prev) => new Set(prev).add(job.id));
        setSavedJobs((prev) => [job, ...prev]);
        toast({ title: "Job saved successfully!" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    }
  };

  const handleSavePreferences = async () => {
    if (!session?.access_token) return;
    setPrefSaving(true);
    try {
      await updateJobPreferences(preferences, session.access_token);
      toast({ title: "Preferences Saved", description: "Job matching recommendations updated." });
      void loadAllData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setPrefSaving(false);
    }
  };

  // Metrics calculations from real application and saved records
  const metrics = useMemo(() => {
    const totalApplied = applications.length;
    const screening = applications.filter((a) => a.status === "screening").length;
    const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
    const interviewCount = applications.filter((a) => a.status === "interview" || a.interview_at).length;
    const selected = applications.filter((a) => ["selected", "offered", "confirmed"].includes(a.status)).length;
    const totalSaved = savedJobIds.size;

    return { totalApplied, screening, shortlisted, interviewCount, selected, totalSaved };
  }, [applications, savedJobIds]);

  const filteredJobs = useMemo(() => {
    const list = activeTab === "matching" ? matchingJobs : allJobs;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((j) =>
      [j.title, j.company, j.location, j.type, ...j.skills].join(" ").toLowerCase().includes(q)
    );
  }, [activeTab, matchingJobs, allJobs, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <DashboardPageHeader
        eyebrow="Career Portal"
        title="Jobs & Career Center"
        description="Discover engineering and technical job openings tailored to your student profile, track application stages, and manage interview schedules."
      />

      {/* Top Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Applied</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalApplied}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-blue-600 uppercase">Screening</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{metrics.screening}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-purple-600 uppercase">Shortlisted</span>
          <p className="text-2xl font-black text-purple-700 mt-1">{metrics.shortlisted}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Interviews</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{metrics.interviewCount}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Selected</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.selected}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-none bg-white p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Saved Jobs</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalSaved}</p>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="rounded-2xl bg-slate-100 p-1 flex flex-wrap gap-1">
          <TabsTrigger value="matching" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Recommended ({matchingJobs.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <Briefcase className="h-3.5 w-3.5" />
            Browse All ({allJobs.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <FileText className="h-3.5 w-3.5" />
            My Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="interviews" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            Interviews ({interviews.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <Bookmark className="h-3.5 w-3.5" />
            Saved ({savedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0073e6] data-[state=active]:shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Job Preferences
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 & 2: Matching / All Jobs Listing */}
        {(activeTab === "matching" || activeTab === "all") && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs by title, company, or skill..."
                className="pl-9 text-xs rounded-xl"
              />
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading available positions...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <p className="text-sm font-extrabold text-slate-800">No matching jobs found</p>
                <p className="text-xs text-slate-500 mt-1">Try updating your job preferences or search keywords.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map((job) => {
                  const isSaved = savedJobIds.has(job.id);
                  const hasApplied = applications.some((a) => a.job_id === job.id);

                  return (
                    <Card key={job.id} className="rounded-3xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-all p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900 truncate">{job.title}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{job.type}</Badge>
                            {typeof job.matchScore === "number" && (
                              <Badge className="bg-blue-50 text-[#0073e6] border-blue-200 text-[10px] font-extrabold">
                                <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                                {job.matchScore}% Match
                              </Badge>
                            )}
                            {hasApplied && (
                              <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Applied</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-[#0073e6]" /> {job.company}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#0073e6]" /> {job.location}</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-[#0073e6]" /> {job.salary}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {job.postedAt}</span>
                          </div>

                          {job.matchReasons && job.matchReasons.length > 0 && (
                            <p className="text-[11px] text-blue-700 font-medium mt-1">
                              Why it matches: {job.matchReasons.join(" • ")}
                            </p>
                          )}

                          {job.skills && job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {job.skills.slice(0, 5).map((s, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">{s}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBookmark(job)}
                            className="rounded-xl h-9 w-9 p-0"
                          >
                            {isSaved ? <BookmarkCheck className="h-4 w-4 text-[#0073e6]" /> : <Bookmark className="h-4 w-4 text-slate-400" />}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDetailJob(job)}
                            className="text-xs font-bold rounded-xl"
                          >
                            Details
                          </Button>

                          <Button
                            size="sm"
                            disabled={hasApplied}
                            onClick={() => {
                              setSelectedJobForApply(job);
                              setIsWizardOpen(true);
                            }}
                            className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold rounded-xl"
                          >
                            {hasApplied ? "Applied" : "Apply Now"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: My Applications with Timeline */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <p className="text-sm font-extrabold text-slate-800">No applications submitted yet</p>
                <p className="text-xs text-slate-500 mt-1">Browse open job postings and apply in one click with your profile.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((app) => (
                  <Card key={app.id} className="rounded-3xl border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">{app.job?.title || "Job Position"}</span>
                          <Badge
                            className={`text-[10px] font-extrabold capitalize ${
                              app.status === "interview"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : app.status === "selected" || app.status === "offered"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : app.status === "shortlisted"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : app.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {app.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {app.job?.company?.name} • Applied on {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>

                      {typeof app.skills_match_score === "number" && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Match Score</span>
                          <p className="text-lg font-black text-[#0073e6]">{app.skills_match_score}%</p>
                        </div>
                      )}
                    </div>

                    {/* Interview Alert Box */}
                    {app.interview_at && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 text-xs">
                        <Video className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-extrabold text-amber-900">Scheduled Interview</span>
                          <p className="text-amber-800">
                            Date: {new Date(app.interview_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
                          </p>
                          <p className="text-amber-800">
                            Location / Meeting: <span className="font-semibold">{app.interview_location || "Online"}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Timeline Stepper */}
                    {app.timeline && app.timeline.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-bold uppercase text-slate-400">Recruitment Timeline</span>
                        <div className="mt-2 space-y-2">
                          {app.timeline.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-bold text-slate-800 capitalize">{item.status}</span>
                              <span className="text-slate-400">— {new Date(item.timestamp).toLocaleDateString()}</span>
                              {item.note && <span className="text-slate-500 italic">({item.note})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Scheduled Interviews (Calendar Integration) */}
        {activeTab === "interviews" && (
          <div className="space-y-4">
            {interviews.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-extrabold text-slate-800">No scheduled interviews right now</p>
                <p className="text-xs text-slate-500 mt-1">When an employer schedules an interview, it will appear here and in your calendar.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {interviews.map((iv) => (
                  <Card key={iv.id} className="rounded-3xl border-slate-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-extrabold text-[10px]">
                        Interview Scheduled
                      </Badge>
                      <span className="text-xs text-slate-400">{iv.interview_duration_minutes || 30} mins</span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900">{iv.job?.title}</h3>
                    <p className="text-xs text-slate-500">{iv.job?.company?.name}</p>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600 font-medium">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#0073e6]" />
                        <span>{new Date(iv.interview_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#0073e6]" />
                        <span>{iv.interview_location || "Online"}</span>
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Saved Jobs */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {savedJobs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Bookmark className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-extrabold text-slate-800">No saved jobs</p>
                <p className="text-xs text-slate-500 mt-1">Bookmark jobs you want to review or apply to later.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedJobs.map((job) => (
                  <Card key={job.id} className="rounded-3xl border-slate-200 bg-white p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="font-extrabold text-sm text-slate-900">{job.title}</span>
                      <p className="text-xs text-slate-500">{job.company} • {job.location} • {job.salary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleToggleBookmark(job)} className="rounded-xl text-xs">
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedJobForApply(job);
                          setIsWizardOpen(true);
                        }}
                        className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs rounded-xl"
                      >
                        Apply
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Job Preferences */}
        {activeTab === "preferences" && (
          <Card className="rounded-3xl border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Career & Matching Preferences</h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize your career goals to receive high-accuracy job recommendations.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Preferred Job Titles (comma separated)</Label>
                <Input
                  value={(preferences.preferred_job_titles || []).join(", ")}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      preferred_job_titles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. Electrical Engineer, Software Engineer"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Preferred Industries (comma separated)</Label>
                <Input
                  value={(preferences.preferred_industries || []).join(", ")}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      preferred_industries: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. Hydropower, IT, Construction, Banking"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Preferred Locations</Label>
                <Input
                  value={(preferences.preferred_locations || []).join(", ")}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      preferred_locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. Kathmandu, Lalitpur, Remote"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Minimum Expected Salary (NPR/month)</Label>
                <Input
                  type="number"
                  value={preferences.min_salary || ""}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      min_salary: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="e.g. 40000"
                />
              </div>
            </div>

            <Button
              onClick={handleSavePreferences}
              disabled={prefSaving}
              className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs"
            >
              {prefSaving ? "Saving Preferences..." : "Save Job Preferences"}
            </Button>
          </Card>
        )}
      </Tabs>

      {/* Application Wizard */}
      {selectedJobForApply && (
        <JobApplicationWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setSelectedJobForApply(null);
          }}
          onSubmitted={() => {
            void loadAllData();
          }}
          job={selectedJobForApply}
        />
      )}

      {/* Detail Modal */}
      {selectedDetailJob && (
        <Dialog open={Boolean(selectedDetailJob)} onOpenChange={() => setSelectedDetailJob(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">{selectedDetailJob.title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {selectedDetailJob.company} • {selectedDetailJob.location} • {selectedDetailJob.type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3 text-xs leading-relaxed text-slate-600">
              <div>
                <span className="font-bold uppercase text-slate-700">Description</span>
                <p className="mt-1 whitespace-pre-wrap">{selectedDetailJob.description}</p>
              </div>

              {selectedDetailJob.requirements.length > 0 && (
                <div>
                  <span className="font-bold uppercase text-slate-700">Requirements</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    {selectedDetailJob.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedDetailJob(null)} className="text-xs">
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedJobForApply(selectedDetailJob);
                  setSelectedDetailJob(null);
                  setIsWizardOpen(true);
                }}
                className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs"
              >
                Apply for Position
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
