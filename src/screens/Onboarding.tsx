import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, Loader2, User, MapPin, Briefcase, GraduationCap, 
  Linkedin, FileText, X, CheckCircle, ArrowRight, ArrowLeft 
} from "lucide-react";

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++",
  "Machine Learning", "Data Science", "UI/UX Design", "Product Management",
  "DevOps", "Cloud Computing", "Mobile Development", "Blockchain"
];

const EXPERIENCE_LEVELS = [
  { value: "student", label: "Student / Fresher" },
  { value: "0-1", label: "0-1 years" },
  { value: "1-3", label: "1-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5+", label: "5+ years" },
];

const ONBOARDING_STEPS = [
  { title: "About you", detail: "Basic information", icon: User },
  { title: "Your journey", detail: "Education and work", icon: Briefcase },
  { title: "Your strengths", detail: "Skills and interests", icon: CheckCircle },
];

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
  const isNeonStaging = isNeonClientRuntime();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [education, setEducation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setPhone(profile.phone || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setEducation(profile.education || "");
      setExperienceLevel(profile.experience_level || "");
      setSelectedSkills(profile.skills || []);
      setResumeUrl(profile.resume_url || "");
    }
  }, [profile]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Resume must be less than 5MB",
      });
      return;
    }

    if (isNeonStaging && (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf"))) {
      toast({ variant: "destructive", title: "PDF required", description: "Please upload a PDF résumé." });
      return;
    }
    setIsUploading(true);
    if (isNeonStaging) {
      try {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/v1/neon-staging/resume", {
          method: "POST", body: form, credentials: "same-origin", cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || typeof payload?.data?.path !== "string") {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Resume upload failed.");
        }
        setResumeFile(file);
        setResumeUrl(payload.data.path);
        toast({ title: "Resume uploaded!", description: "Your resume has been saved." });
      } catch (error) {
        toast({ variant: "destructive", title: "Upload failed", description: error instanceof Error ? error.message : "Please try again." });
      } finally { setIsUploading(false); }
      return;
    }
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/resume.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: uploadError.message,
      });
    } else {
      setResumeFile(file);
      setResumeUrl(filePath);
      toast({
        title: "Resume uploaded!",
        description: "Your resume has been saved.",
      });
    }
    setIsUploading(false);
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Full name required", description: "Please enter your full name." });
      return;
    }
    setIsLoading(true);

    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/profile", {
          method: "PATCH", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(), bio: bio.trim() || null,
            location: location.trim() || null, phone: phone.trim() || null,
            linkedin_url: linkedinUrl.trim() || null, education: education.trim() || null,
            experience_level: experienceLevel || null, skills: selectedSkills,
            onboarding_completed: true,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Profile update failed.");
        await refreshProfile();
        toast({ title: "Profile complete! 🎉", description: "Welcome to Merotalent!" });
        navigate("/dashboard");
      } catch (error) {
        toast({ variant: "destructive", title: "Update failed", description: error instanceof Error ? error.message : "Please try again." });
      } finally { setIsLoading(false); }
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
        location,
        phone,
        linkedin_url: linkedinUrl,
        education,
        experience_level: experienceLevel,
        skills: selectedSkills,
        resume_url: resumeUrl,
        onboarding_completed: true,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      await refreshProfile();
      toast({
        title: "Profile complete! 🎉",
        description: "Welcome to Merotalent!",
      });
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="mb-7 flex items-center gap-4">
              <div className="workspace-icon h-12 w-12 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#18162f]">Basic information</h2>
                <p className="mt-1 text-xs text-muted-foreground">Tell us a little about yourself.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977 9800000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Kathmandu, Nepal"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself, your interests, and goals..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="mb-7 flex items-center gap-4">
              <div className="workspace-icon h-12 w-12 shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#18162f]">Professional details</h2>
                <p className="mt-1 text-xs text-muted-foreground">Help us create sharper opportunity matches.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g., B.Tech in Computer Science"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resume / CV</Label>
                <div className="rounded-[18px] border border-dashed border-[#dfd1c8] bg-[#fbf9f7] p-5 text-center transition-colors hover:border-primary/40">
                  {resumeFile || resumeUrl ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm">{resumeFile?.name || "Saved résumé"}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          if (isNeonStaging) {
                            try {
                              const response = await fetch("/api/v1/neon-staging/resume", {
                                method: "DELETE", credentials: "same-origin", cache: "no-store",
                              });
                              if (!response.ok) throw new Error("Could not remove your résumé.");
                            } catch (error) {
                              toast({ variant: "destructive", title: "Remove failed", description: error instanceof Error ? error.message : "Please try again." });
                              return;
                            }
                          }
                          setResumeFile(null);
                          setResumeUrl("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept={isNeonStaging ? ".pdf,application/pdf" : ".pdf,.doc,.docx"}
                        onChange={handleResumeUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          {isUploading ? "Uploading..." : isNeonStaging ? "Click to upload PDF (max 5MB)" : "Click to upload PDF, DOC (max 5MB)"}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="mb-7 flex items-center gap-4">
              <div className="workspace-icon h-12 w-12 shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#18162f]">Your strengths</h2>
                <p className="mt-1 text-xs text-muted-foreground">Select the skills that best define you.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Select your skills (choose multiple)</Label>
              <div className="flex flex-wrap gap-2 rounded-[20px] border border-[#eee7e1] bg-[#fbf9f7] p-4">
                {SKILL_OPTIONS.map((skill) => {
                  const selected = selectedSkills.includes(skill);

                  return (
                    <button
                      key={skill}
                      type="button"
                      aria-pressed={selected}
                      className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-bold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-[#eadfd7] bg-white text-[#68616d] hover:border-primary/40"
                      }`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {selected ? <CheckCircle className="mr-1 h-3 w-3" /> : null}
                      {skill}
                    </button>
                  );
                })}
              </div>
              {selectedSkills.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="grid min-h-screen w-full overflow-hidden lg:grid-cols-[minmax(320px,0.36fr)_minmax(0,0.64fr)]">
        <aside className="relative overflow-hidden bg-primary px-5 py-5 text-white sm:px-8 sm:py-7 lg:px-9 lg:py-10">
          <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full border-[42px] border-white/10" />
          <div className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full border-[42px] border-white/10" />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white text-primary shadow-lg shadow-orange-950/10">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Merotalent</span>
          </div>

          <div className="relative mt-8 hidden lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Set up your workspace</p>
            <h1 className="mt-3 max-w-[240px] font-display text-3xl font-bold leading-[1.12]">
              Give your ambition a home.
            </h1>
            <p className="mt-3 max-w-[240px] text-xs leading-5 text-white/65">
              A sharper profile creates better matches, recommendations and conversations.
            </p>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2 lg:mt-12 lg:grid-cols-1 lg:gap-3">
            {ONBOARDING_STEPS.map((item, index) => {
              const ItemIcon = item.icon;
              const itemStep = index + 1;
              const isActive = step === itemStep;
              const isDone = step > itemStep;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => itemStep < step && setStep(itemStep)}
                  disabled={itemStep > step}
                  className={`flex min-w-0 items-center gap-3 rounded-[16px] p-2.5 text-left transition-colors lg:p-3 ${
                    isActive ? "bg-white text-[#17162e]" : "text-white"
                  } ${itemStep < step ? "cursor-pointer hover:bg-white/10" : ""}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    isActive ? "bg-[#fff1e8] text-primary" : "bg-white/12 text-white"
                  }`}>
                    {isDone ? <CheckCircle className="h-4 w-4" /> : <ItemIcon className="h-4 w-4" />}
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    <span className="block text-xs font-bold">{item.title}</span>
                    <span className={`mt-0.5 block text-xs ${isActive ? "text-[#9a939b]" : "text-white/50"}`}>
                      {item.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-5 lg:absolute lg:bottom-10 lg:left-9 lg:right-9">
            <div className="flex items-center justify-between text-xs font-bold text-white/70">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-1.5 bg-white/20 [&>div]:bg-white" />
          </div>
        </aside>

        <main className="flex min-h-0 flex-col items-center bg-white px-5 py-7 sm:px-10 sm:py-10 lg:px-14">
          <div className="mb-7 flex w-full max-w-3xl items-center justify-between">
            <div>
              <div className="workspace-kicker">
                <span className="workspace-dot" />
                Profile setup
              </div>
              <p className="mt-2 text-xs text-[#9b949c]">You can edit everything later.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-full border border-[#eee5df] px-3 py-1.5 text-xs font-bold text-[#8c858e] transition-colors hover:border-primary/40 hover:text-primary"
            >
              Skip setup
            </button>
          </div>

          <div className="min-h-0 w-full max-w-3xl flex-1 overflow-y-auto pr-1">
            {renderStep()}
          </div>

          <div className="mt-7 flex w-full max-w-3xl gap-3 border-t border-[#f0e9e4] pt-5">
            {step > 1 && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep(s => s - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button 
                variant="hero" 
                className="flex-1"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !fullName}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                variant="hero" 
                className="flex-1"
                onClick={handleComplete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Onboarding;
