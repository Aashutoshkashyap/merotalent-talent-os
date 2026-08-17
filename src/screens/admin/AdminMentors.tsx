import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Star,
  Clock,
  MessageCircle,
  Plus,
  Loader2,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { generateMentorDetails } from "@/lib/ai/ai-generator";
import { SEED_MENTORS } from "@/lib/admin/admin-seed-fallbacks";

interface Mentor {
  id: string;
  user_id: string;
  headline?: string | null;
  description?: string | null;
  expertise: string[];
  hourly_rate: number;
  is_available: boolean;
  years_experience: number;
  rating: number;
  total_sessions: number;
  created_at: string;
  full_name: string | null;
  email: string | null;
  location: string | null;
  is_verified: boolean;
  bio?: string;
}

const AdminMentors = () => {
  const { toast } = useToast();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);

  const [formData, setFormData] = useState({
    user_id: "",
    expertise: "",
    hourly_rate: "",
    years_experience: "",
    is_available: true,
    is_verified: false,
    bio: "",
  });

  useEffect(() => {
    fetchMentors();
    fetchAvailableUsers();
  }, []);

  const fetchMentors = async () => {
    setIsLoading(true);
    // Fetch mentors with profiles
    const { data: mentorsData } = await supabase
      .from("mentors")
      .select("*")
      .order("created_at", { ascending: false });

    if (mentorsData && mentorsData.length > 0) {
      const userIds = mentorsData.map(m => m.user_id);
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email, location, is_verified, bio")
        .in("user_id", userIds);

      const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

      const combined = mentorsData.map(m => {
        const prof = profileMap.get(m.user_id);
        return {
          ...m,
          headline: (m as any).headline || null,
          description: (m as any).description || null,
          hourly_rate: Number(m.hourly_rate) || 0,
          rating: Number(m.rating) || 0,
          years_experience: Number(m.years_experience) || 0,
          total_sessions: Number(m.total_sessions) || 0,
          full_name: prof?.full_name || null,
          email: prof?.email || null,
          location: prof?.location || null,
          is_verified: prof?.is_verified ?? false,
          bio: prof?.bio || "",
        };
      });
      setMentors(combined);
    } else {
      setMentors(
        SEED_MENTORS.map((m) => ({
          ...m,
          full_name: m.profiles?.full_name || "QA Mentor",
          email: m.profiles?.email || "mentor@example.com",
          location: "Pokhara, Nepal",
          is_verified: true,
          bio: m.description,
        })) as unknown as Mentor[],
      );
    }
    setIsLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .limit(100);
    
    if (profiles) {
      setAvailableUsers(profiles.map(p => ({
        id: p.user_id,
        email: p.email || "",
        full_name: p.full_name,
      })));
    }
  };

  const handleAIGenerate = async () => {
    // Try to get user full name
    const selectedUser = availableUsers.find(u => u.id === formData.user_id);
    const mentorName = selectedUser?.full_name || "Professional Mentor";
    const primaryExp = formData.expertise.split(",")[0] || "Software Development";

    setIsAiGenerating(true);
    try {
      const aiResult = await generateMentorDetails(mentorName, primaryExp);
      setFormData(current => ({
        ...current,
        bio: current.bio || aiResult.bio,
        expertise: current.expertise || aiResult.skills.join(", "),
      }));
      toast({
        title: "AI Generation Complete!",
        description: "Mentor bio and expert skills generated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "AI Generation failed",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.user_id) {
      toast({ variant: "destructive", title: "User selection required" });
      return;
    }

    setIsSubmitting(true);
    const mentorPayload = {
      user_id: formData.user_id,
      expertise: formData.expertise ? formData.expertise.split(",").map(s => s.trim()) : [],
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
      years_experience: formData.years_experience ? parseInt(formData.years_experience) : 0,
      is_available: formData.is_available,
    };

    // Save mentor record first
    let error;
    if (editingMentor) {
      const result = await supabase.from("mentors").update(mentorPayload).eq("id", editingMentor.id);
      error = result.error;
    } else {
      const result = await supabase.from("mentors").insert(mentorPayload);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setIsSubmitting(false);
      return;
    }

    // Try updating profile optional fields non-blockingly
    try {
      await (supabase as any)
        .from("profiles")
        .update({
          is_verified: formData.is_verified,
          bio: formData.bio || null
        })
        .eq("user_id", formData.user_id);
    } catch {
      // Non-critical if optional profile columns are not migrated yet
    }

    toast({ title: editingMentor ? "Mentor profile updated!" : "Mentor added successfully!" });
    resetForm();
    fetchMentors();
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, _userId: string) => {
    if (!window.confirm("Are you sure you want to permanently remove this mentor profile?")) return;
    const { error } = await supabase.from("mentors").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Mentor profile removed" });
      fetchMentors();
    }
  };

  const toggleVerification = async (mentor: Mentor) => {
    try {
      await (supabase as any)
        .from("profiles")
        .update({ is_verified: !mentor.is_verified })
        .eq("user_id", mentor.user_id);
      toast({ title: mentor.is_verified ? "Verification revoked" : "Mentor verified" });
    } catch {
      toast({ title: "Verification status toggled" });
    }
    fetchMentors();
  };

  const openEdit = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setFormData({
      user_id: mentor.user_id,
      expertise: mentor.expertise.join(", "),
      hourly_rate: mentor.hourly_rate.toString(),
      years_experience: mentor.years_experience.toString(),
      is_available: mentor.is_available,
      is_verified: mentor.is_verified,
      bio: mentor.bio || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      expertise: "",
      hourly_rate: "",
      years_experience: "",
      is_available: true,
      is_verified: false,
      bio: "",
    });
    setEditingMentor(null);
    setIsDialogOpen(false);
  };

  const filteredMentors = mentors.filter(
    (mentor) =>
      (mentor.full_name && mentor.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (mentor.email && mentor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mentor.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    { label: "Total Mentors", value: mentors.length, icon: Users, color: "text-primary" },
    { label: "Verified", value: mentors.filter(m => m.is_verified).length, icon: CheckCircle, color: "text-success" },
    { label: "Available", value: mentors.filter(m => m.is_available).length, icon: Clock, color: "text-accent" },
    { label: "Total Sessions", value: mentors.reduce((sum, m) => sum + m.total_sessions, 0), icon: MessageCircle, color: "text-secondary" },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mentors</h1>
          <p className="text-muted-foreground">Manage platform mentors and their availability</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Mentor Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMentor ? "Edit Mentor Profile" : "Add Mentor Profile"}</DialogTitle>
              <DialogDescription>
                Assign and manage professional mentor details.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Select Platform User *</Label>
                <select
                  value={formData.user_id}
                  disabled={!!editingMentor}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full rounded-xl border border-[#eadfd7] bg-[#fcfbfa] p-2.5 text-sm"
                >
                  <option value="">-- Choose User Profile --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || "No Name"} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Expertise (comma separated)</Label>
                <Input
                  placeholder="e.g. React, Python, Data Science"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-[#c2410c]/30 text-[#c2410c] hover:bg-[#fff5ed]"
                onClick={handleAIGenerate}
                disabled={isAiGenerating || !formData.user_id}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating bio & skills with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Bio & Expertise with AI
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Label>Professional Bio</Label>
                <Textarea
                  placeholder="Tell students about your professional achievements..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hourly Rate (NPR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-6 items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
                  />
                  <Label>Available for bookings</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_verified}
                    onCheckedChange={(v) => setFormData({ ...formData, is_verified: v })}
                  />
                  <Label>Verified Mentor Badge</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingMentor ? "Update Profile" : "Add Mentor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search mentors by name or skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50 mt-6">
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Expertise</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMentors.map((mentor) => (
                  <TableRow key={mentor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                            {(mentor.full_name || mentor.email || "M").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{mentor.full_name || "No Name"}</p>
                          <p className="text-xs text-primary/80 font-medium line-clamp-1">{mentor.headline || `${mentor.years_experience} years exp.`}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mentor.expertise.slice(0, 2).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {mentor.expertise.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.expertise.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{mentor.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {mentor.total_sessions}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">NPR {mentor.hourly_rate.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {mentor.is_verified ? (
                          <Badge className="bg-success/10 text-success border-success/20 w-fit">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 w-fit">
                            Pending
                          </Badge>
                        )}
                        {mentor.is_available ? (
                          <Badge variant="outline" className="w-fit text-xs">Available</Badge>
                        ) : (
                          <Badge variant="outline" className="w-fit text-xs text-muted-foreground">Unavailable</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(mentor)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={mentor.is_verified ? "text-amber-600" : "text-emerald-600"}
                          onClick={() => void toggleVerification(mentor)}
                          title={mentor.is_verified ? "Revoke Verification" : "Verify Mentor"}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(mentor.id, mentor.user_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMentors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {isLoading ? "Loading..." : "No mentors found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </OperationsPage>
  );
};

export default AdminMentors;
