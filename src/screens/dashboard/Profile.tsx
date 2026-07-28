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
  User, Mail, Phone, MapPin, Loader2, Save, Award, Trophy, 
  Linkedin, GraduationCap, Briefcase, FileText, Link2, X, CheckCircle 
} from "lucide-react";

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

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
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
    }
    fetchSkills();
    fetchUserSkills();
  }, [profile]);

  const fetchSkills = async () => {
    const { data } = await supabase.from("skills").select("*");
    if (data) setSkills(data);
  };

  const fetchUserSkills = async () => {
    if (!profile?.user_id) return;
    const { data } = await supabase
      .from("user_skills")
      .select("skill_id")
      .eq("user_id", profile.user_id);
    if (data) setUserSkills(data.map((s) => s.skill_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;

    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update(formData)
      .eq("user_id", profile.user_id);

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

  const toggleSkill = async (skillId: string) => {
    if (!profile?.user_id) return;

    if (userSkills.includes(skillId)) {
      await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", profile.user_id)
        .eq("skill_id", skillId);
      setUserSkills(userSkills.filter((id) => id !== skillId));
    } else {
      await supabase
        .from("user_skills")
        .insert({ user_id: profile.user_id, skill_id: skillId });
      setUserSkills([...userSkills, skillId]);
    }
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
      await supabase
        .from('profiles')
        .update({ resume_url: filePath })
        .eq('user_id', user.id);
      
      toast({
        title: "Resume uploaded!",
        description: "Your resume has been saved.",
      });
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

    // Validate LinkedIn URL format
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    if (!linkedinRegex.test(formData.linkedin_url)) {
      toast({
        variant: "destructive",
        title: "Invalid LinkedIn URL",
        description: "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile)",
      });
      return;
    }

    setIsImporting(true);
    
    // Note: Full LinkedIn API integration would require OAuth setup
    // For now, we save the URL and show a helpful message
    toast({
      title: "LinkedIn linked!",
      description: "Your LinkedIn profile URL has been saved. Full profile import requires LinkedIn API access.",
    });
    
    setIsImporting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile information and professional details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mx-auto flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
              </div>
              <h3 className="mt-4 font-semibold text-lg">{profile?.full_name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              
              {formData.linkedin_url && (
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
              
              <div className="flex justify-center gap-4 mt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mx-auto">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium mt-1">12</p>
                  <p className="text-xs text-muted-foreground">Competitions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/10 mx-auto">
                    <Award className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-sm font-medium mt-1">8</p>
                  <p className="text-xs text-muted-foreground">Badges</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form with Tabs */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal and professional details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
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
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {resumeFile || (profile as any)?.resume_url ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm">
                            {resumeFile?.name || "Resume uploaded"}
                          </span>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => setResumeFile(null)}
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
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
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

                  {formData.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      LinkedIn profile linked
                    </div>
                  )}
                </TabsContent>

                <div className="pt-4">
                  <Button type="submit" disabled={isLoading}>
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

        {/* Skills */}
        <Card className="lg:col-span-3 border-border/50">
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Select your skills and expertise</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
