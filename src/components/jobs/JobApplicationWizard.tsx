import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  SignedMediaUploader,
  type SignedMediaAsset,
} from "@/components/media/SignedMediaUploader";
import {
  ModuleFormClientError,
  submitAuthenticatedModuleForm,
} from "@/lib/forms/module-form-client";
import { StudentProfileRequirement } from "@/components/forms/StudentProfileRequirement";
import { missingStudentProfileFields } from "@/lib/student/profile-readiness";
import {
  MapPin, Building2, DollarSign, ChevronRight, ChevronLeft,
  Check, Loader2
} from "lucide-react";

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
  { id: 2, title: "Resume", description: "Upload your resume" },
  { id: 3, title: "Your Details", description: "Contact, salary and cover letter" },
  { id: 4, title: "Skills", description: "Type your relevant skills" },
  { id: 5, title: "Experience", description: "Add experience if any" },
  { id: 6, title: "Training", description: "Add training if any" },
  { id: 7, title: "Submit", description: "Review and apply" },
];

const parseSkills = (value: string) => [...new Map(
  value.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean).map((skill) => [skill.toLowerCase(), skill] as const),
).values()];

const JobApplicationWizard = ({ isOpen, onClose, onSubmitted, job }: JobApplicationWizardProps) => {
  const { profile, session, user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeUrl, setResumeUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [experienceLetterUrl, setExperienceLetterUrl] = useState("");
  const [trainingSummary, setTrainingSummary] = useState("");
  const [trainingDocumentUrl, setTrainingDocumentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const progress = (currentStep / steps.length) * 100;

  useEffect(() => {
    if (!isOpen) return;
    setFullName(profile?.full_name || "");
    setEmail(user?.email || profile?.email || "");
    setPhone(profile?.phone || "");
    const savedSkills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
    if (savedSkills.length) setSkillsText(savedSkills.join(", "));
    const experience = Array.isArray(profile?.experience_history) ? profile.experience_history : [];
    if (experience.length) {
      setExperienceSummary(experience.map((entry) => [entry.role, entry.organization, entry.startDate && entry.endDate ? `${entry.startDate}–${entry.endDate}` : "", entry.description].filter(Boolean).join(" · ")).join("\n"));
    }
  }, [isOpen, profile?.email, profile?.experience_history, profile?.full_name, profile?.phone, profile?.skills, user?.email]);

  const handleResumeUploaded = (assets: SignedMediaAsset[]) => {
    const asset = assets[0];
    if (!asset) return;
    setResumeUrl(asset.path);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.resumeUrl;
      return next;
    });
  };

  const typedSkills = parseSkills(skillsText);

  const handleSubmit = async () => {
    if (!user || !session) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please login to submit your application.",
      });
      return;
    }
    if (missingStudentProfileFields("job_application", profile, user.email).length) {
      toast({ variant: "destructive", title: "Complete your profile", description: "Add the missing profile details before applying." });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await submitAuthenticatedModuleForm({
        accessToken: session.access_token,
        module: "job_application",
        values: {
          jobId: job.id,
          fullName,
          email,
          phone,
          resumeUrl,
          coverLetter,
          portfolioUrl,
          skills: typedSkills,
          ...(expectedSalary.trim() ? { expectedSalary: Number(expectedSalary) } : {}),
          ...(experienceSummary.trim() ? { experienceSummary: experienceSummary.trim() } : {}),
          ...(experienceLetterUrl ? { experienceLetterUrl } : {}),
          ...(trainingSummary.trim() ? { trainingSummary: trainingSummary.trim() } : {}),
          ...(trainingDocumentUrl ? { trainingDocumentUrl } : {}),
        },
      });

      // Log to local activity tracker so it immediately reflects in My Activity & Dashboard counters
      const { logUserActivity } = await import("@/lib/activityLogger");
      logUserActivity({
        id: `job-app-${job.id}-${Date.now()}`,
        kind: "job",
        title: job.title,
        detail: job.company,
        status: "applied",
        occurredAt: new Date().toISOString(),
        href: "/dashboard/jobs",
      });

      toast({
        title: "Application submitted successfully!",
        description: `Your application for ${job.title} at ${job.company} has been recorded.`,
      });

      onSubmitted?.(job.id);
      onClose();
      setCurrentStep(1);
      setResumeUrl("");
      setCoverLetter("");
      setPortfolioUrl("");
      setSkillsText("");
      setExpectedSalary("");
      setExperienceSummary("");
      setExperienceLetterUrl("");
      setTrainingSummary("");
      setTrainingDocumentUrl("");
    } catch (error) {
      if (error instanceof ModuleFormClientError) {
        setFieldErrors(error.fields);
        const keys = Object.keys(error.fields);
        if (keys.includes("resumeUrl") || keys.includes("portfolioUrl")) {
          setCurrentStep(2);
        } else if (keys.some((key) => ["fullName", "email", "phone", "coverLetter", "expectedSalary"].includes(key))) {
          setCurrentStep(3);
        } else if (keys.includes("skills")) {
          setCurrentStep(4);
        } else if (keys.some((key) => ["experienceSummary", "experienceLetterUrl"].includes(key))) {
          setCurrentStep(5);
        } else if (keys.some((key) => ["trainingSummary", "trainingDocumentUrl"].includes(key))) {
          setCurrentStep(6);
        }
      }
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error instanceof Error ? error.message : "The application could not be submitted.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return !!resumeUrl;
      case 3:
        return fullName.trim().length >= 2 && !!email.trim() && !!phone.trim()
          && (!expectedSalary.trim() || (/^\d{1,9}$/.test(expectedSalary.trim()) && Number(expectedSalary) <= 100_000_000));
      case 4:
        return typedSkills.length > 0 && typedSkills.length <= 30 && typedSkills.every((skill) => skill.length <= 100);
      case 5:
        return experienceSummary.trim().length <= 2_000;
      case 6:
        return trainingSummary.trim().length <= 2_000;
      case 7:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for Position</DialogTitle>
          <DialogDescription>
            {job.title} at {job.company}
          </DialogDescription>
        </DialogHeader>
        {session && <StudentProfileRequirement module="job_application" profile={profile} email={user?.email} onRefresh={refreshProfile} />}

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <span className="font-medium">{steps[currentStep - 1].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "border-2 border-primary text-primary"
                      : "border-2 border-muted text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-6">
          {/* Step 1: Review Job */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {job.salary}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Requirements</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Resume Upload */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <SignedMediaUploader
                label="Resume"
                module="job_attachment"
                resourceId={job.id}
                onUploaded={handleResumeUploaded}
              />
              {resumeUrl && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  Resume securely uploaded and linked to this job.
                </div>
              )}
              {fieldErrors.resumeUrl?.[0] && (
                <p className="text-xs font-semibold text-destructive">{fieldErrors.resumeUrl[0]}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="job-portfolio">Portfolio URL (optional)</Label>
                <Input
                  id="job-portfolio"
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
                {fieldErrors.portfolioUrl?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.portfolioUrl[0]}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Applicant details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="job-applicant-name">Full name</Label>
                  <Input
                    id="job-applicant-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    readOnly={Boolean(session)}
                    required
                  />
                  {fieldErrors.fullName?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.fullName[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-applicant-email">Email</Label>
                  <Input
                    id="job-applicant-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    readOnly={Boolean(session)}
                    required
                  />
                  {fieldErrors.email?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.email[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-applicant-phone">Phone</Label>
                  <Input
                    id="job-applicant-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    readOnly={Boolean(session)}
                    placeholder="+977 98XXXXXXXX"
                    required
                  />
                  {fieldErrors.phone?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.phone[0]}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-cover-letter">Cover Letter (optional)</Label>
                <Textarea
                  id="job-cover-letter"
                  placeholder="Tell the employer why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  maxLength={5_000}
                />
                {fieldErrors.coverLetter?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.coverLetter[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-expected-salary">Expected salary in NPR (optional)</Label>
                <Input
                  id="job-expected-salary"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100_000_000}
                  step={1}
                  placeholder="Enter a whole amount, if you have one"
                  value={expectedSalary}
                  onChange={(event) => setExpectedSalary(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave this blank if you prefer to discuss salary with the employer.</p>
                {fieldErrors.expectedSalary?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.expectedSalary[0]}</p>}
              </div>
            </div>
          )}

          {/* Step 4: Typed skills */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-typed-skills">Your relevant skills *</Label>
                <Textarea
                  id="job-typed-skills"
                  value={skillsText}
                  onChange={(event) => setSkillsText(event.target.value)}
                  placeholder="Type your skills, separated by commas. For example: React, customer service, project planning"
                  rows={4}
                  maxLength={3_100}
                  aria-invalid={Boolean(fieldErrors.skills?.length) || typedSkills.length > 30 || typedSkills.some((skill) => skill.length > 100)}
                />
                <p className="text-xs text-muted-foreground">Add your own skills, even if they are not listed in the job. Use commas or new lines between skills (up to 30).</p>
                {fieldErrors.skills?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.skills[0]}</p>}
                {(typedSkills.length > 30 || typedSkills.some((skill) => skill.length > 100)) && <p className="text-xs font-semibold text-destructive">Use no more than 30 skills, each under 100 characters.</p>}
              </div>
            </div>
          )}

          {/* Step 5: Optional experience */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Experience is optional. If you have relevant work experience, describe it and add a letter if available.</p>
              <div className="space-y-2">
                <Label htmlFor="job-experience-summary">Work experience (optional)</Label>
                <Textarea id="job-experience-summary" value={experienceSummary} onChange={(event) => setExperienceSummary(event.target.value)} placeholder="Role, employer, dates and what you did" rows={5} maxLength={2_000} />
                {fieldErrors.experienceSummary?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.experienceSummary[0]}</p>}
              </div>
              <SignedMediaUploader label="Experience letter (optional)" module="job_attachment" resourceId={job.id} onUploaded={(assets) => setExperienceLetterUrl(assets[0]?.path || "")} />
              {experienceLetterUrl && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Experience letter uploaded</p>}
              {fieldErrors.experienceLetterUrl?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.experienceLetterUrl[0]}</p>}
            </div>
          )}

          {/* Step 6: Optional training */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Training is optional. Include courses, workshops or certifications relevant to this position.</p>
              <div className="space-y-2">
                <Label htmlFor="job-training-summary">Training (optional)</Label>
                <Textarea id="job-training-summary" value={trainingSummary} onChange={(event) => setTrainingSummary(event.target.value)} placeholder="Training title, provider, dates and what you learned" rows={5} maxLength={2_000} />
                {fieldErrors.trainingSummary?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.trainingSummary[0]}</p>}
              </div>
              <SignedMediaUploader label="Training document (optional)" module="job_attachment" resourceId={job.id} onUploaded={(assets) => setTrainingDocumentUrl(assets[0]?.path || "")} />
              {trainingDocumentUrl && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Training document uploaded</p>}
              {fieldErrors.trainingDocumentUrl?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.trainingDocumentUrl[0]}</p>}
            </div>
          )}

          {/* Step 7: Review & Submit */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Position</span>
                    <span className="font-medium">{job.title}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">{job.company}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Resume</span>
                    <span className="font-medium">{resumeUrl ? "Securely uploaded" : "Not uploaded"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Cover Letter</span>
                    <span className="font-medium">{coverLetter ? "Added" : "Not added"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Skills</span>
                    <span className="max-w-[65%] text-right font-medium">{typedSkills.join(", ")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Expected salary</span>
                    <span className="font-medium">{expectedSalary.trim() ? `NPR ${Number(expectedSalary).toLocaleString()}` : "Not provided"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="text-right font-medium">{experienceSummary.trim() ? "Added" : "Not added"}{experienceLetterUrl ? " · Letter uploaded" : ""}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Training</span>
                    <span className="text-right font-medium">{trainingSummary.trim() ? "Added" : "Not added"}{trainingDocumentUrl ? " · Document uploaded" : ""}</span>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground text-center">
                By submitting this application, you agree to share your information with {job.company}.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <DialogFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button
              variant="hero"
              onClick={() => setCurrentStep((prev) => Math.min(steps.length, prev + 1))}
              disabled={!canProceed()}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting || !resumeUrl || !fullName.trim() || !email.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationWizard;
