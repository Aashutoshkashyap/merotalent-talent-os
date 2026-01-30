import { useState } from "react";
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
  Briefcase, MapPin, Building2, Clock, DollarSign, ChevronRight, ChevronLeft,
  Upload, FileText, Check, Star, Loader2, X
} from "lucide-react";

interface JobApplicationWizardProps {
  isOpen: boolean;
  onClose: () => void;
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

const JobApplicationWizard = ({ isOpen, onClose, job }: JobApplicationWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const progress = (currentStep / steps.length) * 100;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
        });
        return;
      }
      setResumeFile(file);
    }
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
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast({
      title: "Application submitted!",
      description: "Your application has been sent to the employer.",
    });
    
    setIsSubmitting(false);
    onClose();
    // Reset form
    setCurrentStep(1);
    setResumeFile(null);
    setCoverLetter("");
    setPortfolioUrl("");
    setSelectedSkills([]);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return !!resumeFile;
      case 3:
        return true; // Cover letter is optional
      case 4:
        return selectedSkills.length > 0;
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
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  resumeFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                {resumeFile ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{resumeFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(resumeFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResumeFile(null)}
                      className="text-destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="resume-upload" className="cursor-pointer block">
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-xl flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Upload your resume</p>
                        <p className="text-sm text-muted-foreground">
                          PDF, DOC, or DOCX (max 5MB)
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <span>Choose File</span>
                      </Button>
                    </div>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </Label>
                )}
              </div>

              <div className="space-y-2">
                <Label>Portfolio URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Cover Letter */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cover Letter (optional)</Label>
                <Textarea
                  placeholder="Tell the employer why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                />
              </div>

              {/* Cover Letter File Upload */}
              <div className="space-y-2">
                <Label>Or upload a cover letter file</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Label htmlFor="cover-letter-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload PDF, DOC, or DOCX (max 5MB)
                      </p>
                    </div>
                    <input
                      id="cover-letter-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file upload - for now just show toast
                          console.log("Cover letter file:", file.name);
                        }
                      }}
                    />
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  A personalized cover letter can significantly improve your chances.
                </p>
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
                    <span className="font-medium">{resumeFile?.name || "Not uploaded"}</span>
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
