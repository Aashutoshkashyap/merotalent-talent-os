import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Bell, 
  Shield, 
  Globe,
  Key,
  Smartphone,
  Mail,
  LogOut,
  Trash2,
  Save,
  Monitor,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeAccountLanguage,
  normalizeNotificationPreferences,
  type AccountLanguage,
  type NotificationPreferences,
} from "@/lib/account/preferences";
import {
  dashboardPrimaryButton,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

const Settings = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
  const [personalInfo, setPersonalInfo] = useState({
    full_name: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  const [language, setLanguage] = useState<AccountLanguage>("en");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setPersonalInfo({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!profile?.user_id) return;

    let cancelled = false;
    const loadPreferences = async () => {
      if (isNeonStaging) {
        try {
          const response = await fetch("/api/v1/neon-staging/preferences", {
            credentials: "same-origin", cache: "no-store",
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error("Could not load preferences.");
          if (!cancelled) {
            setNotifications(normalizeNotificationPreferences(payload?.data?.notification_preferences));
            setLanguage(normalizeAccountLanguage(payload?.data?.language));
          }
        } catch { if (!cancelled) toast.error("Could not load your saved preferences."); }
        return;
      }
      const { data, error } = await supabase
        .from("user_preferences")
        .select("notification_preferences, language")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (cancelled || !data) {
        if (!cancelled && error && error.code !== "PGRST116") {
          toast.error("Could not load your saved preferences.");
        }
        return;
      }

      setNotifications(normalizeNotificationPreferences(data.notification_preferences));
      setLanguage(normalizeAccountLanguage(data.language));
    };

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, isNeonStaging]);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const handleSaveProfile = async () => {
    if (!profile?.user_id) {
      toast.error("Please sign in again before saving your profile.");
      return;
    }
    if (!personalInfo.full_name.trim()) {
      toast.error("Your full name is required.");
      return;
    }

    setIsSavingProfile(true);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/profile", {
          method: "PATCH", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: personalInfo.full_name.trim(),
            phone: personalInfo.phone.trim() || null,
            location: personalInfo.location.trim() || null, bio: personalInfo.bio.trim() || null }),
        });
        if (!response.ok) throw new Error("Could not save your personal information.");
        await refreshProfile();
        toast.success("Personal information saved.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your personal information."); }
      finally { setIsSavingProfile(false); }
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: personalInfo.full_name.trim(),
        phone: personalInfo.phone.trim() || null,
        location: personalInfo.location.trim() || null,
        bio: personalInfo.bio.trim() || null,
      })
      .eq("user_id", profile.user_id);
    setIsSavingProfile(false);

    if (error) {
      toast.error(`Could not save your personal information: ${error.message}`);
      return;
    }
    await refreshProfile();
    toast.success("Personal information saved.");
  };

  const handleSavePreferences = async (message: string) => {
    if (!profile?.user_id) {
      toast.error("Please sign in again before saving your preferences.");
      return;
    }

    setIsSavingPreferences(true);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/preferences", {
          method: "PUT", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notification_preferences: notifications, language }),
        });
        if (!response.ok) throw new Error("Could not save your preferences.");
        toast.success(message);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your preferences."); }
      finally { setIsSavingPreferences(false); }
      return;
    }
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: profile.user_id,
        notification_preferences: notifications,
        theme: "light",
        language,
      }, { onConflict: "user_id" });
    setIsSavingPreferences(false);

    if (error) {
      toast.error(`Could not save your preferences: ${error.message}`);
      return;
    }
    toast.success(message);
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Your new passwords do not match.");
      return;
    }
    if (isNeonStaging && !currentPassword) {
      toast.error("Enter your current password to change it.");
      return;
    }

    setIsUpdatingPassword(true);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/auth/change-password", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!response.ok) throw new Error("Could not update your password. Check your current password.");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        toast.success("Password updated securely.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update your password."); }
      finally { setIsUpdatingPassword(false); }
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);
    if (error) {
      toast.error(`Could not update your password: ${error.message}`);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated securely.");
  };

  return (
    <div className="w-full space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Make it yours"
        title="Settings"
        description="Control your account, alerts, viewing preferences and security without the clutter."
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className={`${dashboardTabs} flex h-auto max-w-full flex-nowrap gap-1 overflow-x-auto`}>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={personalInfo.full_name}
                    onChange={(event) => setPersonalInfo({ ...personalInfo, full_name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={profile?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">Contact support to change your email</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={personalInfo.phone}
                    onChange={(event) => setPersonalInfo({ ...personalInfo, phone: event.target.value })}
                    placeholder="+977 98XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={personalInfo.location}
                    onChange={(event) => setPersonalInfo({ ...personalInfo, location: event.target.value })}
                    placeholder="Kathmandu, Nepal"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={personalInfo.bio}
                  onChange={(event) => setPersonalInfo({ ...personalInfo, bio: event.target.value })}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <Button variant="hero" className={dashboardPrimaryButton} onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSavingProfile ? "Saving..." : "Save personal information"}
              </Button>
            </CardContent>
          </Card>

          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNeonStaging && <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
              </div>}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(normalizeAccountLanguage(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="en">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </select>
              </div>
              <Button variant="outline" onClick={() => void handleSavePreferences("Language preference saved.")} disabled={isSavingPreferences}>
                {isSavingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save language
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
              <Button variant="outline" onClick={() => void handleSavePreferences("Notification preferences saved.")} disabled={isSavingPreferences}>
                {isSavingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save notification preferences
              </Button>
            </CardContent>
          </Card>

          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Select what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "competitions", label: "Competition Updates", desc: "New competitions, deadlines, results" },
                { key: "mentorship", label: "Mentorship", desc: "Session reminders, new messages" },
                { key: "jobs", label: "Job Opportunities", desc: "New jobs matching your profile" },
                { key: "marketing", label: "Marketing", desc: "Promotions, newsletters, tips" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, [item.key]: checked })
                    }
                  />
                </div>
              ))}
              <Button variant="outline" onClick={() => void handleSavePreferences("Notification preferences saved.")} disabled={isSavingPreferences}>
                {isSavingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save notification preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Password
              </CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
              </div>
              <Button variant="outline" onClick={() => void handleUpdatePassword()} disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          <Card className={dashboardSurface}>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your logged-in devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-[#fff6ef] p-3">
                <div className="flex items-center gap-3">
                  <Monitor className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">This Device</p>
                    <p className="text-sm text-muted-foreground">Last active: Now</p>
                  </div>
                </div>
                <Badge variant="secondary">Current</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[22px] border-red-200 bg-white shadow-[0_16px_48px_rgba(127,29,29,0.055)]">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">Sign out from this device</p>
                </div>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
                </div>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
