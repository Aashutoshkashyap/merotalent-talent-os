import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  SignedMediaUploader,
  type SignedMediaAsset,
} from "@/components/media/SignedMediaUploader";
import {
  ModuleFormClientError,
  submitAuthenticatedModuleForm,
} from "@/lib/forms/module-form-client";
import {
  MapPin, Building2, DollarSign, ChevronRight, ChevronLeft,
  Check, Star, Loader2
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
  { id: 3, title: "Cover Letter", description: "Add a cover letter" },
  { id: 4, title: "Skills Match", description: "Confirm your skills" },
  { id: 5, title: "Submit", description: "Review and apply" },
];

const JobApplicationWizard = ({ isOpen, onClose, onSubmitted, job }: JobApplicationWizardProps) => {
  const { profile, session, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeUrl, setResumeUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const progress = (currentStep / steps.length) * 100;

  useEffect(() => {
    if (!isOpen) return;
    setFullName((current) => current || profile?.full_name || "");
    setEmail((current) => current || profile?.email || user?.email || "");
    setPhone((current) => current || profile?.phone || "");
  }, [isOpen, profile?.email, profile?.full_name, profile?.phone, user?.email]);

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

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const calculateMatchScore = () => {
    if (job.skills.length === 0) return 0;
    return Math.round((selectedSkills.length / job.skills.length) * 100);
  };

  const handleSubmit = async () => {
    if (!user || !session) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please login to submit your application.",
      });
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
          skills: selectedSkills,
        },
      });

      toast({
        title: "Application submitted!",
        description: "Your application is stored in MeroTalent for the hiring team.",
      });

      onSubmitted?.(job.id);
      onClose();
      setCurrentStep(1);
      setResumeUrl("");
      setCoverLetter("");
      setPortfolioUrl("");
      setSelectedSkills([]);
    } catch (error) {
      if (error instanceof ModuleFormClientError) {
        setFieldErrors(error.fields);
        const keys = Object.keys(error.fields);
        if (keys.includes("resumeUrl") || keys.includes("portfolioUrl")) {
          setCurrentStep(2);
        } else if (keys.some((key) => ["fullName", "email", "phone", "coverLetter"].includes(key))) {
          setCurrentStep(3);
        } else if (keys.includes("skills")) {
          setCurrentStep(4);
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
        return fullName.trim().length >= 2 && !!email.trim() && !!phone.trim();
      case 4:
        return job.skills.length === 0 || selectedSkills.length > 0;
      case 5:
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
                <Label>Portfolio URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
                {fieldErrors.portfolioUrl?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.portfolioUrl[0]}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Cover Letter */}
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
                    placeholder="+977 98XXXXXXXX"
                    required
                  />
                  {fieldErrors.phone?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.phone[0]}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Letter (optional)</Label>
                <Textarea
                  placeholder="Tell the employer why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                />
                {fieldErrors.coverLetter?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.coverLetter[0]}</p>}
              </div>
            </div>
          )}

          {/* Step 4: Skills Match */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * calculateMatchScore()) / 100}
                      className="text-primary transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{calculateMatchScore()}%</span>
                  </div>
                </div>
                <h3 className="font-semibold">Skills Match Score</h3>
                <p className="text-sm text-muted-foreground">
                  Select the skills you have from the job requirements
                </p>
              </div>

              <div className="space-y-3">
                <Label>Select Your Matching Skills</Label>
                <div className="grid gap-2">
                  {job.skills.map((skill) => (
                    <div
                      key={skill}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSkills.includes(skill)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleSkill(skill)}
                    >
                      <Checkbox checked={selectedSkills.includes(skill)} />
                      <span className="font-medium">{skill}</span>
                      {selectedSkills.includes(skill) && (
                        <Star className="w-4 h-4 text-amber-500 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
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
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Skills Match</span>
                    <Badge variant="secondary">{calculateMatchScore()}%</Badge>
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
            disabled={currentStep === 1}
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
            <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
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
