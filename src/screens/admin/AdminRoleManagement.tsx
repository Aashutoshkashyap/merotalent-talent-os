import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OperationsPage } from "./OperationsUI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Shield,
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  UserCog,
  BookOpen,
  Settings,
} from "lucide-react";

interface UserWithRoles {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

interface MentorWithSettings {
  id: string;
  user_id: string;
  profile: {
    email: string;
    full_name: string | null;
  };
  trial_settings?: {
    free_trial_enabled: boolean;
    free_trial_type: string;
    free_trial_duration_minutes: number;
    trial_days: number;
  };
}

const roleConfig = {
  admin: {
    icon: Shield,
    color: "bg-destructive/10 text-destructive",
    description: "Full system access",
  },
  mentor: {
    icon: UserCog,
    color: "bg-primary/10 text-primary",
    description: "Conduct mentorship sessions",
  },
  instructor: {
    icon: BookOpen,
    color: "bg-accent/10 text-accent",
    description: "Upload courses and manage LMS content",
  },
  institution: {
    icon: GraduationCap,
    color: "bg-warning/10 text-warning",
    description: "Manage institute profile and notices",
  },
  company: {
    icon: Briefcase,
    color: "bg-success/10 text-success",
    description: "Post jobs and manage applications",
  },
  talent: {
    icon: Users,
    color: "bg-muted text-muted-foreground",
    description: "Default user role",
  },
};

const AdminRoleManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [mentors, setMentors] = useState<MentorWithSettings[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorWithSettings | null>(null);
  const [trialSettings, setTrialSettings] = useState({
    enabled: false,
    type: "one_session",
    duration: 30,
    days: 7,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchMentors();
  }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const usersWithRoles = profiles.map((profile) => ({
        ...profile,
        roles: roles?.filter((r) => r.user_id === profile.user_id).map((r) => r.role) || [],
      }));

      setUsers(usersWithRoles);
    }
    setIsLoading(false);
  };

  const fetchMentors = async () => {
    const { data: mentorsData } = await supabase
      .from("mentors")
      .select(`
        id,
        user_id,
        mentor_trial_settings(*)
      `);

    if (mentorsData) {
      const mentorsWithProfiles = await Promise.all(
        mentorsData.map(async (mentor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", mentor.user_id)
            .single();

          return {
            ...mentor,
            profile: profile || { email: "", full_name: null },
            trial_settings: Array.isArray(mentor.mentor_trial_settings)
              ? mentor.mentor_trial_settings[0]
              : mentor.mentor_trial_settings,
          };
        })
      );

      setMentors(mentorsWithProfiles);
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser.user_id,
      role: selectedRole as any,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          variant: "destructive",
          title: "Role already assigned",
          description: "This user already has this role.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      }
    } else {
      // If assigning mentor role, create mentor record
      if (selectedRole === "mentor") {
        await supabase.from("mentors").insert({
          user_id: selectedUser.user_id,
        });
      }

      toast({
        title: "Role assigned",
        description: `${selectedRole} role has been assigned to ${selectedUser.full_name || selectedUser.email}`,
      });
      fetchUsers();
      fetchMentors();
      setIsRoleDialogOpen(false);
      setSelectedRole("");
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as any);

    if (!error) {
      toast({
        title: "Role removed",
        description: `${role} role has been removed.`,
      });
      fetchUsers();
    }
  };

  const saveTrialSettings = async () => {
    if (!selectedMentor) return;

    const { error } = await supabase.from("mentor_trial_settings").upsert({
      mentor_id: selectedMentor.id,
      free_trial_enabled: trialSettings.enabled,
      free_trial_type: trialSettings.type,
      free_trial_duration_minutes: trialSettings.duration,
      trial_days: trialSettings.days,
    });

    if (!error) {
      toast({
        title: "Settings saved",
        description: "Free trial settings have been updated.",
      });
      fetchMentors();
      setTrialDialogOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div>
        <h1 className="text-2xl font-display font-bold">Role Management</h1>
        <p className="text-muted-foreground">
          Assign and manage user roles with granular permissions
        </p>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = users.filter((u) => u.roles.includes(role)).length;
          const Icon = config.icon;
          return (
            <Card key={role} className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}s</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>Manage user access levels and permissions</CardDescription>
          <div className="relative max-w-md mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => {
                        const config = roleConfig[role as keyof typeof roleConfig];
                        return (
                          <Badge
                            key={role}
                            variant="outline"
                            className={`text-xs cursor-pointer ${config?.color}`}
                            onClick={() => {
                              if (role !== "talent") {
                                removeRole(user.user_id, role);
                              }
                            }}
                          >
                            {role}
                            {role !== "talent" && " ×"}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsRoleDialogOpen(true);
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Assign Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mentor Trial Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Mentor Free Trial Settings
          </CardTitle>
          <CardDescription>
            Configure free trial options for each mentor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentor</TableHead>
                <TableHead>Trial Status</TableHead>
                <TableHead>Trial Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentors.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{mentor.profile?.full_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{mentor.profile?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mentor.trial_settings?.free_trial_enabled ? "default" : "secondary"}>
                      {mentor.trial_settings?.free_trial_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {mentor.trial_settings?.free_trial_type || "Not configured"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setTrialSettings({
                          enabled: mentor.trial_settings?.free_trial_enabled || false,
                          type: mentor.trial_settings?.free_trial_type || "one_session",
                          duration: mentor.trial_settings?.free_trial_duration_minutes || 30,
                          days: mentor.trial_settings?.trial_days || 7,
                        });
                        setTrialDialogOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig)
                    .filter(([role]) => !selectedUser?.roles.includes(role))
                    .map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          <span className="capitalize">{role}</span>
                          <span className="text-muted-foreground text-xs">
                            - {config.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assignRole} disabled={!selectedRole}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Settings Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Free Trial</DialogTitle>
            <DialogDescription>
              Set up free trial for {selectedMentor?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Free Trial</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to try a free session
                </p>
              </div>
              <Switch
                checked={trialSettings.enabled}
                onCheckedChange={(checked) =>
                  setTrialSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {trialSettings.enabled && (
              <>
                <div>
                  <Label>Trial Type</Label>
                  <Select
                    value={trialSettings.type}
                    onValueChange={(value) =>
                      setTrialSettings((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_session">One Free Session</SelectItem>
                      <SelectItem value="time_limited">Time-Limited Access</SelectItem>
                      <SelectItem value="intro_call">Free Intro Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={trialSettings.duration}
                    onChange={(e) =>
                      setTrialSettings((prev) => ({
                        ...prev,
                        duration: parseInt(e.target.value) || 30,
                      }))
                    }
                  />
                </div>

                {trialSettings.type === "time_limited" && (
                  <div>
                    <Label>Trial Days</Label>
                    <Input
                      type="number"
                      value={trialSettings.days}
                      onChange={(e) =>
                        setTrialSettings((prev) => ({
                          ...prev,
                          days: parseInt(e.target.value) || 7,
                        }))
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTrialSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default AdminRoleManagement;
