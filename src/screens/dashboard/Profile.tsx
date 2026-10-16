import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Mail, Phone, MapPin, Loader2, Save,
  Linkedin, GraduationCap, Briefcase, FileText, Link2, X, CheckCircle 
} from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardPrimaryButton,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

interface Skill {
  id: string;
  name: string;
  category: string;
}

const EXPERIENCE_LEVELS = [
  { value: "student", label: "Student / Fresher" },
  { value: "0-1", label: "0-1 years" },
  { value: "1-3", label: "1-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5+", label: "5+ years" },
];

type EducationEntry = { institution: string; degree: string; field: string; startYear: string; endYear: string };
type ExperienceEntry = { organization: string; role: string; startDate: string; endDate: string; description: string };
type CertificationEntry = { name: string; issuer: string; issuedDate: string };

const emptyEducation = (): EducationEntry => ({ institution: "", degree: "", field: "", startYear: "", endYear: "" });
const emptyExperience = (): ExperienceEntry => ({ organization: "", role: "", startDate: "", endDate: "", description: "" });
const emptyCertification = (): CertificationEntry => ({ name: "", issuer: "", issuedDate: "" });

const isValidLinkedInProfileUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)linkedin\.com$/i.test(url.hostname) && /^\/in\/[A-Za-z0-9_%.-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
};

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const isStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [skillsText, setSkillsText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [educationHistory, setEducationHistory] = useState<EducationEntry[]>([]);
  const [experienceHistory, setExperienceHistory] = useState<ExperienceEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location: "",
    linkedin_url: "",
    education: "",
    experience_level: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        location: profile.location || "",
        linkedin_url: (profile as any).linkedin_url || "",
        education: (profile as any).education || "",
        experience_level: (profile as any).experience_level || "",
      });
      setEducationHistory(Array.isArray(profile.education_history) ? profile.education_history as EducationEntry[] : []);
      setExperienceHistory(Array.isArray(profile.experience_history) ? profile.experience_history as ExperienceEntry[] : []);
      setCertifications(Array.isArray(profile.certifications) ? profile.certifications as CertificationEntry[] : []);
      if (isStaging) setSkillsText(Array.isArray(profile.skills) ? profile.skills.join(", ") : "");
    }
    fetchSkills();
    fetchUserSkills();
  }, [profile]);

  const fetchSkills = async () => {
    if (isStaging) return;
    const { data } = await supabase.from("skills").select("*");
    if (data) setSkills(data);
  };

  const fetchUserSkills = async () => {
    if (isStaging) return;
    if (!profile?.user_id) return;
    const { data } = await supabase
      .from("user_skills")
      .select("skill_id")
      .eq("user_id", profile.user_id);
    if (data) setUserSkills(data.map((s) => s.skill_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = user?.id || profile?.user_id;
    if (!targetUserId) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to update your profile.",
      });
      return;
    }

    setIsLoading(true);
    if (isStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/profile", {
          method: "PATCH", credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...formData,
            linkedin_url: formData.linkedin_url.trim() || null,
            education: formData.education.trim() || [educationHistory[0]?.degree, educationHistory[0]?.field].filter(Boolean).join(" in ") || null,
            education_history: educationHistory.filter((item) => item.institution.trim() || item.degree.trim()),
            experience_history: experienceHistory.filter((item) => item.organization.trim() || item.role.trim()),
            certifications: certifications.filter((item) => item.name.trim() || item.issuer.trim()),
            skills: [...new Set(skillsText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))],
          }),
        });
        if (!response.ok) throw new Error(`Profile save failed (${response.status}).`);
        await refreshProfile();
        toast({ title: "Profile updated!" });
      } catch (error) {
        toast({ variant: "destructive", title: "Update failed", description: error instanceof Error ? error.message : "Please try again." });
      } finally { setIsLoading(false); }
      return;
    }
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert({
        user_id: targetUserId,
        email: user?.email || profile?.email || "",
        ...formData,
        education: formData.education.trim() || [educationHistory[0]?.degree, educationHistory[0]?.field].filter(Boolean).join(" in ") || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        education_history: educationHistory.filter((item) => item.institution.trim() || item.degree.trim()),
        experience_history: experienceHistory.filter((item) => item.organization.trim() || item.role.trim()),
        certifications: certifications.filter((item) => item.name.trim() || item.issuer.trim()),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      await refreshProfile();
    }
    setIsLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetUserId = user?.id || profile?.user_id;
    if (!file || !targetUserId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Avatar image must be less than 5MB",
      });
      return;
    }

    setIsUploading(true);
    try {
      if (isStaging) {
        const form = new FormData(); form.set("file", file);
        const response = await fetch("/api/v1/neon-staging/profile/avatar", {
          method: "POST", credentials: "same-origin", body: form,
        });
        if (!response.ok) throw new Error(`Photo upload failed (${response.status}). Use an AVIF, JPG, PNG or WebP image up to 5 MB.`);
        await refreshProfile();
        toast({ title: "Photo updated!" });
        return;
      }
      const fileExt = file.name.split('.').pop();
      const filePath = `${targetUserId}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      let avatarUrl = filePath;
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) avatarUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .upsert({
          user_id: targetUserId,
          email: user?.email || profile?.email || "",
          avatar_url: avatarUrl,
        }, { onConflict: 'user_id' });

      if (updateError) {
        toast({ variant: "destructive", title: "Could not save avatar", description: updateError.message });
      } else {
        toast({ title: "Photo updated!", description: "Your profile photo has been updated." });
        await refreshProfile();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Could not upload avatar" });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSkill = async (skillId: string) => {
    if (!profile?.user_id) return;

    if (userSkills.includes(skillId)) {
      const { error } = await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", profile.user_id)
        .eq("skill_id", skillId);
      if (error) {
        toast({ variant: "destructive", title: "Could not remove skill", description: error.message });
        return;
      }
      setUserSkills(userSkills.filter((id) => id !== skillId));
    } else {
      const { error } = await supabase
        .from("user_skills")
        .insert({ user_id: profile.user_id, skill_id: skillId });
      if (error) {
        toast({ variant: "destructive", title: "Could not add skill", description: error.message });
        return;
      }
      setUserSkills([...userSkills, skillId]);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (isStaging) {
      setIsUploading(true);
      try {
        const form = new FormData(); form.set("file", file);
        const response = await fetch("/api/v1/neon-staging/resume", {
          method: "POST", credentials: "same-origin", body: form,
        });
        if (!response.ok) throw new Error(`Resume upload failed (${response.status}). Use a PDF up to 5 MB.`);
        setResumeFile(file);
        await refreshProfile();
        toast({ title: "Resume uploaded!" });
      } catch (error) {
        toast({ variant: "destructive", title: "Upload failed", description: error instanceof Error ? error.message : "Please try again." });
      } finally { setIsUploading(false); }
      return;
    }

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

    const { error: uploadError } = await supabase.storage
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
      // Update profile with resume URL
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ resume_url: filePath })
        .eq('user_id', user.id);

      if (linkError) {
        toast({
          variant: "destructive",
          title: "Resume not linked",
          description: `The file uploaded but was not attached to your profile: ${linkError.message}`,
        });
      } else {
        toast({
          title: "Resume uploaded!",
          description: "Your resume has been saved.",
        });
      }
      await refreshProfile();
    }
    setIsUploading(false);
  };

  const handleLinkedInImport = async () => {
    if (!formData.linkedin_url) {
      toast({
        variant: "destructive",
        title: "LinkedIn URL required",
        description: "Please enter your LinkedIn profile URL first.",
      });
      return;
    }

    if (!isValidLinkedInProfileUrl(formData.linkedin_url)) {
      toast({
        variant: "destructive",
        title: "Invalid LinkedIn URL",
        description: "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile)",
      });
      return;
    }

    if (!profile?.user_id) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in again before linking your LinkedIn profile.",
      });
      return;
    }

    setIsImporting(true);
    if (isStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/profile", {
          method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" },
          body: JSON.stringify({ linkedin_url: formData.linkedin_url }),
        });
        if (!response.ok) throw new Error(`Could not save URL (${response.status}).`);
        await refreshProfile();
        toast({ title: "LinkedIn profile linked!" });
      } catch (error) {
        toast({ variant: "destructive", title: "Could not link LinkedIn", description: error instanceof Error ? error.message : "Please try again." });
      } finally { setIsImporting(false); }
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ linkedin_url: formData.linkedin_url })
      .eq("user_id", profile.user_id);
    setIsImporting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Could not link LinkedIn",
        description: error.message,
      });
      return;
    }

    await refreshProfile();
    toast({
      title: "LinkedIn profile linked!",
      description: "Your profile URL is saved. Full profile import requires LinkedIn API access.",
    });
  };

  return (
    <div className="w-full space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Your talent story"
        title="My profile"
        description="Keep your proof of work, experience and strengths clear for mentors and employers."
      />
      <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
        Before applying or registering, save your full name, phone number and location here. College and job applications also need your education. Forms will use these saved contact details automatically.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={`${dashboardSurface} lg:col-span-1`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-[30px] bg-[#c2410c] text-3xl font-black text-white shadow-[0_16px_34px_rgba(249,115,22,0.24)] ring-8 ring-[#fff2e8] flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || "User"} className="h-full w-full object-cover" />
                ) : (
                  profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"
                )}
              </div>
              <div className="mt-2 flex justify-center">
                <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                  Change Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <h3 className="mt-2 font-semibold text-lg">{profile?.full_name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              
              {isValidLinkedInProfileUrl(formData.linkedin_url) && (
                <a 
                  href={formData.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Profile
                </a>
              )}
              
            </div>
          </CardContent>
        </Card>

        <Card className={`${dashboardSurface} lg:col-span-2`}>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal and professional details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className={`${dashboardTabs} mb-4 grid w-full grid-cols-3`}>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="pl-10"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          className="pl-10 bg-muted"
                          disabled
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10"
                          placeholder="+977 98XXXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="pl-10"
                          placeholder="Kathmandu, Nepal"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="professional" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="education">Education</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="education"
                          value={formData.education}
                          onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                          className="pl-10"
                          placeholder="e.g., B.Tech in Computer Science"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Experience Level</Label>
                      <Select 
                        value={formData.experience_level} 
                        onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                      >
                        <SelectTrigger>
                          <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Select experience level" />
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
                  </div>

                  <div className="space-y-2">
                    <Label>Resume / CV</Label>
                    <div className="rounded-2xl border-2 border-dashed border-[#e6d5c8] bg-[#fff9f4] p-4 text-center">
                      {resumeFile || (profile as any)?.resume_url ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm">
                            {resumeFile?.name || "Resume uploaded"}
                          </span>
                          {isStaging && (
                            <>
                              <Button type="button" variant="outline" size="sm" onClick={async () => {
                                const path = profile?.resume_url;
                                if (!path) return;
                                try {
                                  const response = await fetch(`/api/v1/neon-staging/resume?path=${encodeURIComponent(path)}`, { credentials: "same-origin" });
                                  const result = await response.json();
                                  if (!response.ok || !result?.data?.signedUrl) throw new Error("Resume could not be opened.");
                                  window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
                                } catch (error) {
                                  toast({ variant: "destructive", title: "Download failed", description: error instanceof Error ? error.message : "Please try again." });
                                }
                              }}>View PDF</Button>
                              <label className="cursor-pointer text-xs font-semibold text-primary">
                                Replace PDF
                                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleResumeUpload} disabled={isUploading} />
                              </label>
                            </>
                          )}
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              if (!isStaging) { setResumeFile(null); return; }
                              try {
                                const response = await fetch("/api/v1/neon-staging/resume", { method: "DELETE", credentials: "same-origin" });
                                if (!response.ok) throw new Error(`Could not delete resume (${response.status}).`);
                                setResumeFile(null); await refreshProfile();
                                toast({ title: "Resume removed" });
                              } catch (error) {
                                toast({ variant: "destructive", title: "Delete failed", description: error instanceof Error ? error.message : "Please try again." });
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept={isStaging ? ".pdf" : ".pdf,.doc,.docx"}
                            onChange={handleResumeUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                          <div className="space-y-2">
                            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">
                              {isUploading ? "Uploading..." : isStaging ? "Click to upload PDF (max 5MB)" : "Click to upload PDF, DOC (max 5MB)"}
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between"><div><Label>Education history</Label><p className="text-xs text-muted-foreground">Add the institutions and programs employers should see.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setEducationHistory((items) => [...items, emptyEducation()])}>Add education</Button></div>
                    {educationHistory.map((item, index) => (
                      <div key={`education-${index}`} className="grid gap-3 rounded-xl border p-3 md:grid-cols-2">
                        <Input aria-label={`Education ${index + 1} institution`} placeholder="Institution" value={item.institution} onChange={(event) => setEducationHistory((items) => items.map((entry, i) => i === index ? { ...entry, institution: event.target.value } : entry))} />
                        <Input aria-label={`Education ${index + 1} degree`} placeholder="Degree or program" value={item.degree} onChange={(event) => setEducationHistory((items) => items.map((entry, i) => i === index ? { ...entry, degree: event.target.value } : entry))} />
                        <Input aria-label={`Education ${index + 1} field`} placeholder="Field of study" value={item.field} onChange={(event) => setEducationHistory((items) => items.map((entry, i) => i === index ? { ...entry, field: event.target.value } : entry))} />
                        <div className="flex gap-2"><Input aria-label={`Education ${index + 1} start year`} inputMode="numeric" placeholder="Start year" value={item.startYear} onChange={(event) => setEducationHistory((items) => items.map((entry, i) => i === index ? { ...entry, startYear: event.target.value } : entry))} /><Input aria-label={`Education ${index + 1} end year`} inputMode="numeric" placeholder="End year" value={item.endYear} onChange={(event) => setEducationHistory((items) => items.map((entry, i) => i === index ? { ...entry, endYear: event.target.value } : entry))} /></div>
                        <Button type="button" variant="ghost" className="justify-self-start text-destructive md:col-span-2" onClick={() => setEducationHistory((items) => items.filter((_, i) => i !== index))}>Remove</Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between"><div><Label>Experience history</Label><p className="text-xs text-muted-foreground">Experience is optional and reused in job applications.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setExperienceHistory((items) => [...items, emptyExperience()])}>Add experience</Button></div>
                    {experienceHistory.map((item, index) => (
                      <div key={`experience-${index}`} className="grid gap-3 rounded-xl border p-3 md:grid-cols-2">
                        <Input aria-label={`Experience ${index + 1} organization`} placeholder="Organization" value={item.organization} onChange={(event) => setExperienceHistory((items) => items.map((entry, i) => i === index ? { ...entry, organization: event.target.value } : entry))} />
                        <Input aria-label={`Experience ${index + 1} role`} placeholder="Role" value={item.role} onChange={(event) => setExperienceHistory((items) => items.map((entry, i) => i === index ? { ...entry, role: event.target.value } : entry))} />
                        <Input aria-label={`Experience ${index + 1} start date`} type="month" value={item.startDate} onChange={(event) => setExperienceHistory((items) => items.map((entry, i) => i === index ? { ...entry, startDate: event.target.value } : entry))} />
                        <Input aria-label={`Experience ${index + 1} end date`} type="month" value={item.endDate} onChange={(event) => setExperienceHistory((items) => items.map((entry, i) => i === index ? { ...entry, endDate: event.target.value } : entry))} />
                        <Textarea aria-label={`Experience ${index + 1} description`} className="md:col-span-2" placeholder="Responsibilities and achievements" value={item.description} onChange={(event) => setExperienceHistory((items) => items.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} />
                        <Button type="button" variant="ghost" className="justify-self-start text-destructive md:col-span-2" onClick={() => setExperienceHistory((items) => items.filter((_, i) => i !== index))}>Remove</Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between"><div><Label>Certifications</Label><p className="text-xs text-muted-foreground">Add relevant certifications or training awards.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setCertifications((items) => [...items, emptyCertification()])}>Add certification</Button></div>
                    {certifications.map((item, index) => (
                      <div key={`certification-${index}`} className="grid gap-3 rounded-xl border p-3 md:grid-cols-3">
                        <Input aria-label={`Certification ${index + 1} name`} placeholder="Certification name" value={item.name} onChange={(event) => setCertifications((items) => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} />
                        <Input aria-label={`Certification ${index + 1} issuer`} placeholder="Issuer" value={item.issuer} onChange={(event) => setCertifications((items) => items.map((entry, i) => i === index ? { ...entry, issuer: event.target.value } : entry))} />
                        <Input aria-label={`Certification ${index + 1} issue date`} type="month" value={item.issuedDate} onChange={(event) => setCertifications((items) => items.map((entry, i) => i === index ? { ...entry, issuedDate: event.target.value } : entry))} />
                        <Button type="button" variant="ghost" className="justify-self-start text-destructive md:col-span-3" onClick={() => setCertifications((items) => items.filter((_, i) => i !== index))}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-4">
                  <div className="mb-4 rounded-2xl bg-[#fff6ef] p-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                      Import from LinkedIn
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Link your LinkedIn profile to enhance your talent CV. Enter your profile URL and click import.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        className="pl-10"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleLinkedInImport}
                    disabled={isImporting || !formData.linkedin_url}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Linkedin className="w-4 h-4 mr-2" />
                        Link LinkedIn Profile
                      </>
                    )}
                  </Button>

                  {isValidLinkedInProfileUrl(formData.linkedin_url) && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      LinkedIn profile linked
                    </div>
                  )}
                </TabsContent>

                <div className="pt-4">
                  <Button type="submit" className={dashboardPrimaryButton} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        <Card className={`${dashboardSurface} lg:col-span-3`}>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Select your skills and expertise</CardDescription>
          </CardHeader>
          <CardContent>
            {isStaging ? (
              <div className="space-y-2">
                <Label htmlFor="employment-skills">Skills (comma-separated)</Label>
                <Textarea id="employment-skills" value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="e.g. React, project management" />
                <p className="text-xs text-muted-foreground">Use Save Changes above to update your employment skills.</p>
              </div>
            ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill.id}
                  variant={userSkills.includes(skill.id) ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleSkill(skill.id)}
                >
                  {skill.name}
                </Badge>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No skills available. Contact admin to add skills.
                </p>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
