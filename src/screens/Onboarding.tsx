import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

const Onboarding = () => {
  const { user, profile, refreshProfile } = useAuth();
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

    setIsUploading(true);
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
    
    setIsLoading(true);

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
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <p className="text-muted-foreground text-sm">Tell us a bit about yourself</p>
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
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Kathmandu, Nepal"
                    className="pl-10"
                  />
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
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Professional Details</h2>
              <p className="text-muted-foreground text-sm">Help us match you with opportunities</p>
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
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm">{resumeFile.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
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
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          {isUploading ? "Uploading..." : "Click to upload PDF, DOC (max 5MB)"}
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
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Your Skills</h2>
              <p className="text-muted-foreground text-sm">Select skills that define you</p>
            </div>

            <div className="space-y-4">
              <Label>Select your skills (choose multiple)</Label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer py-2 px-3 transition-all hover:scale-105"
                    onClick={() => toggleSkill(skill)}
                  >
                    {selectedSkills.includes(skill) && <CheckCircle className="w-3 h-3 mr-1" />}
                    {skill}
                  </Badge>
                ))}
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <Card className="w-full max-w-lg relative z-10 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Merotalent</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex gap-3 pt-4">
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

          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={() => navigate("/dashboard")}
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
