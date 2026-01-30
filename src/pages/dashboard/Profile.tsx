import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Loader2, Save, Award, Trophy } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
}

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        location: profile.location || "",
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile information and skills</p>
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

        {/* Edit Form */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
            </form>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
