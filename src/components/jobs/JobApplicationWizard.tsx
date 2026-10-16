import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  SignedMediaUploader,
  type SignedMediaAsset,
} from "@/components/media/SignedMediaUploader";
import {
  MapPin,
  Building2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { submitJobApplicationApi } from "@/lib/jobs/jobs-client";

interface JobApplicationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (jobId: string) => void;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    requirements: string[];
    skills: string[];
  };
}

const steps = [
  { id: 1, title: "Review Job", description: "Confirm job details" },
  { id: 2, title: "Your Profile & CV", description: "Review pre-filled contact & resume" },
  { id: 3, title: "Skills & Match", description: "Verify relevant technical skills" },
  { id: 4, title: "Education & Exp", description: "Review reusable education & experience" },
  { id: 5, title: "Cover Letter & Questions", description: "Final note and application answers" },
  { id: 6, title: "Submit", description: "Review immutable snapshot and submit" },
];

const parseSkills = (value: string) => [
  ...new Map(
    value
      .split(/[,\n]/)
      .map((skill) => skill.trim())
      .filter(Boolean)
      .map((skill) => [skill.toLowerCase(), skill] as const)
  ).values(),
];

export default function JobApplicationWizard({
  isOpen,
  onClose,
  onSubmitted,
  job,
}: JobApplicationWizardProps) {
  const { profile, session, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [experienceLetterUrl, setExperienceLetterUrl] = useState("");
  const [trainingDocumentUrl, setTrainingDocumentUrl] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState<"experience" | "training" | null>(null);

  // Reusable Education & Experience lists
  const [educationList, setEducationList] = useState<any[]>([]);
  const [experienceList, setExperienceList] = useState<any[]>([]);
  const [certificationsList, setCertificationsList] = useState<any[]>([]);

  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({
    availabilityNotice: "Immediately available",
    relocationInterest: "Yes, open to relocation",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const progress = (currentStep / steps.length) * 100;

  // Auto-populate from Student Profile upon open
  useEffect(() => {
    if (!isOpen) return;
    setFullName(profile?.full_name || "");
    setEmail(user?.email || profile?.email || "");
    setPhone(profile?.phone || "");
    setResumeUrl((profile as any)?.resume_url || "");
    setPortfolioUrl((profile as any)?.linkedin_url || "");

    const savedSkills = Array.isArray((profile as any)?.skills) ? (profile as any).skills.filter(Boolean) : [];
    if (savedSkills.length) {
      setSkillsText(savedSkills.join(", "));
    } else if (job.skills.length) {
      setSkillsText(job.skills.slice(0, 4).join(", "));
    }

    if (Array.isArray((profile as any)?.education_history)) {
      setEducationList((profile as any).education_history);
    }
    if (Array.isArray((profile as any)?.experience_history)) {
      setExperienceList((profile as any).experience_history);
    }
    if (Array.isArray((profile as any)?.certifications)) {
      setCertificationsList((profile as any).certifications);
    }
  }, [isOpen, profile, user?.email, job.skills]);

  useEffect(() => {
    setExperienceLetterUrl("");
    setTrainingDocumentUrl("");
  }, [job.id]);

  const uploadDocument = async (kind: "experience" | "training", file: File) => {
    setUploadingDocument(kind);
    try {
      const form = new FormData();
      form.set("jobId", job.id); form.set("kind", kind); form.set("file", file);
      const response = await fetch("/api/v1/neon-staging/jobs/documents", {
        method: "POST", credentials: "same-origin", body: form,
      });
      const result = await response.json();
      if (!response.ok || typeof result?.data?.path !== "string") throw new Error(result?.error || "Document upload failed.");
      const previous = kind === "experience" ? experienceLetterUrl : trainingDocumentUrl;
      if (kind === "experience") setExperienceLetterUrl(result.data.path);
      else setTrainingDocumentUrl(result.data.path);
      if (previous) void fetch("/api/v1/neon-staging/jobs/documents", {
        method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, path: previous }),
      });
      toast({ title: "Document attached", description: file.name });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setUploadingDocument(null); }
  };

  const handleResumeUploaded = (assets: SignedMediaAsset[]) => {
    const asset = assets[0];
    if (!asset) return;
    setResumeUrl(asset.path);
    toast({ title: "CV / Resume Attached", description: asset.fileName });
  };

  const typedSkills = parseSkills(skillsText);

  const handleNext = () => {
    if (currentStep === 2) {
      if (!fullName.trim() || !email.trim() || !phone.trim()) {
        toast({ variant: "destructive", title: "Contact info required", description: "Please enter your name, email and phone." });
        return;
      }
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const isStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
    if (!user || (!isStaging && !session?.access_token)) {
      toast({ variant: "destructive", title: "Login required", description: "Please sign in to submit your application." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        jobId: job.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        coverLetter: coverLetter.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
        skills: typedSkills,
        expectedSalary: expectedSalary.trim() ? Number(expectedSalary) : undefined,
        answers: customAnswers,
        education: educationList,
        experience: experienceList,
        certifications: certificationsList,
        experienceLetterUrl: experienceLetterUrl || undefined,
        trainingDocumentUrl: trainingDocumentUrl || undefined,
      };

      const result = await submitJobApplicationApi(payload, isStaging ? undefined : session?.access_token);
      setSubmissionResult(result);
      toast({
        title: "Application Submitted Successfully!",
        description: `Your profile snapshot was stored. Match score: ${result.matchScore}%.`,
      });
      onSubmitted?.(job.id);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message || "Failed to submit your application.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Job Application Form</span>
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">
            Applying for {job.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {job.company} • {job.location} • Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-1 my-2">
          <Progress value={progress} className="h-1.5 bg-slate-100" />
        </div>

        {/* Submission Success Screen */}
        {submissionResult ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Application Submitted!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your profile snapshot, education, skills, and CV have been securely delivered to the hiring team at {job.company}.
            </p>

            <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-4 max-w-sm mx-auto">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Candidate Match Score</span>
              <p className="text-3xl font-black text-[#0073e6] mt-1">{submissionResult.matchScore}%</p>
              {submissionResult.matchReasons && (
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  {submissionResult.matchReasons.map((r: string, idx: number) => (
                    <p key={idx}>✓ {r}</p>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={onClose} className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs mt-4">
              Done & View Applications
            </Button>
          </div>
        ) : (
          <>
            {/* STEP 1: Review Job */}
            {currentStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                  <h4 className="font-extrabold text-sm text-slate-900">{job.title}</h4>
                  <div className="flex flex-wrap gap-3 text-slate-600 font-medium">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-[#0073e6]" /> {job.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#0073e6]" /> {job.location}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-[#0073e6]" /> {job.salary}</span>
                  </div>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold uppercase text-slate-600">Required Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-white border border-slate-200">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.requirements && job.requirements.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold uppercase text-slate-600">Key Requirements</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                      {job.requirements.slice(0, 5).map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Profile & CV */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 text-[11px] text-blue-800">
                  Information is automatically pre-filled from your MeroTalent student profile. You can review or edit before submitting.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Phone Number *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Portfolio / LinkedIn URL</Label>
                    <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  {process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging" ? (
                    <div className="space-y-2">
                      <Label htmlFor="job-resume-upload">CV / Resume PDF</Label>
                      <Input id="job-resume-upload" type="file" accept=".pdf,application/pdf" disabled={isUploadingResume}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setIsUploadingResume(true);
                          try {
                            const form = new FormData(); form.set("file", file);
                            const response = await fetch("/api/v1/neon-staging/resume", {
                              method: "POST", credentials: "same-origin", body: form,
                            });
                            const result = await response.json();
                            if (!response.ok || !result?.data?.path) throw new Error("The PDF could not be attached.");
                            setResumeUrl(result.data.path);
                            await refreshProfile();
                            toast({ title: "Resume attached", description: file.name });
                          } catch (error) {
                            toast({ variant: "destructive", title: "Resume upload failed", description: error instanceof Error ? error.message : "Please try again." });
                          } finally { setIsUploadingResume(false); }
                        }} />
                    </div>
                  ) : (
                  <SignedMediaUploader
                    label="CV / Resume Document"
                    module="job_attachment"
                    resourceId={user?.id}
                    onUploaded={handleResumeUploaded}
                  />
                  )}
                  {resumeUrl && (
                    <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Resume attached: {resumeUrl.split("/").pop()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Skills */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Your Relevant Technical Skills</Label>
                  <Textarea
                    rows={3}
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="e.g. Python, React, MATLAB, AutoCAD, Project Management"
                  />
                  <p className="text-[11px] text-slate-400">Separate skills by comma or newline. These are matched with the job requirements.</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase text-slate-600">Parsed Skills Preview</span>
                  <div className="flex flex-wrap gap-1.5">
                    {typedSkills.map((s, idx) => (
                      <Badge key={idx} className="bg-[#0073e6] text-white text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <Label className="text-xs font-bold text-slate-700">Expected Monthly Salary (NPR, optional)</Label>
                  <Input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="e.g. 35000"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Education & Experience */}
            {currentStep === 4 && (
              <div className="space-y-5 text-xs">
                {/* Education Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-[#0073e6]" />
                      Education History ({educationList.length})
                    </span>
                  </div>
                  {educationList.length === 0 ? (
                    <p className="text-slate-400 text-xs">No education records saved in profile.</p>
                  ) : (
                    educationList.map((edu, idx) => (
                      <div key={idx} className="rounded-xl border p-3 bg-slate-50/50">
                        <p className="font-extrabold text-slate-900">{edu.degree} in {edu.field}</p>
                        <p className="text-slate-500">{edu.institution} ({edu.startYear} – {edu.endYear || "Present"})</p>
                      </div>
                    ))
                  )}
                </div>
                {process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging" && (
                  <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    {(["experience", "training"] as const).map((kind) => {
                      const path = kind === "experience" ? experienceLetterUrl : trainingDocumentUrl;
                      return <div key={kind} className="space-y-2">
                        <Label htmlFor={`job-${kind}-document`}>{kind === "experience" ? "Experience letter" : "Training document"} (optional, PDF)</Label>
                        <Input id={`job-${kind}-document`} type="file" accept=".pdf,application/pdf"
                          disabled={!!uploadingDocument} onChange={(event) => {
                            const file = event.target.files?.[0]; if (file) void uploadDocument(kind, file);
                          }} />
                        {path && <div className="flex items-center gap-2"><span className="min-w-0 truncate text-emerald-700">Attached: {path.split("/").pop()}</span>
                          <Button type="button" variant="ghost" size="sm" disabled={!!uploadingDocument} onClick={async () => {
                            const response = await fetch("/api/v1/neon-staging/jobs/documents", {
                              method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ jobId: job.id, path }),
                            });
                            if (response.ok) { if (kind === "experience") setExperienceLetterUrl(""); else setTrainingDocumentUrl(""); }
                            else toast({ variant: "destructive", title: "Could not remove document" });
                          }}>Remove</Button></div>}
                      </div>;
                    })}
                  </div>
                )}

                {/* Experience Section */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-[#0073e6]" />
                      Experience Records ({experienceList.length})
                    </span>
                  </div>
                  {experienceList.length === 0 ? (
                    <p className="text-slate-400 text-xs">No previous experience records (Fresher application).</p>
                  ) : (
                    experienceList.map((exp, idx) => (
                      <div key={idx} className="rounded-xl border p-3 bg-slate-50/50">
                        <p className="font-extrabold text-slate-900">{exp.role} at {exp.organization}</p>
                        <p className="text-slate-500">{exp.startDate} – {exp.endDate || "Present"}</p>
                        {exp.description && <p className="mt-1 text-slate-600">{exp.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Cover Letter & Questions */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Cover Letter / Note to Recruiter</Label>
                  <Textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Introduce yourself and explain why you're a great fit for this role..."
                  />
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold uppercase text-slate-600">Application Questions</span>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700">Notice Period / Availability</Label>
                      <Input
                        value={customAnswers.availabilityNotice}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, availabilityNotice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700">Are you willing to relocate or travel for work?</Label>
                      <Input
                        value={customAnswers.relocationInterest}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, relocationInterest: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Review & Final Submit */}
            {currentStep === 6 && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-600">Application Summary Snapshot</span>
                  <p><span className="text-slate-500">Candidate:</span> <span className="font-bold text-slate-900">{fullName}</span></p>
                  <p><span className="text-slate-500">Contact:</span> <span className="font-bold text-slate-900">{email} • {phone}</span></p>
                  <p><span className="text-slate-500">Skills ({typedSkills.length}):</span> <span className="font-bold text-slate-900">{typedSkills.join(", ") || "None"}</span></p>
                  <p><span className="text-slate-500">CV Attached:</span> <span className="font-bold text-slate-900">{resumeUrl ? "Yes" : "No"}</span></p>
                  {process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging" && <p><span className="text-slate-500">Supporting documents:</span> <span className="font-bold text-slate-900">{[experienceLetterUrl && "Experience letter", trainingDocumentUrl && "Training document"].filter(Boolean).join(", ") || "None"}</span></p>}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800">
                  Note: Submitting creates an immutable historical snapshot of your profile for this application. Any future profile updates will not alter this submission.
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className="text-xs text-slate-600"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>

              {currentStep < steps.length ? (
                <Button onClick={handleNext} className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs">
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
