import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Bell,
  BookOpen,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  ChevronLeft,
} from "lucide-react";

interface InstituteData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  type: string | null;
  is_verified: boolean;
  total_seats: number | null;
  available_seats: number | null;
  admission_status: string | null;
}

interface InstituteAdminAccess {
  can_edit_profile: boolean;
  can_manage_courses: boolean;
  can_post_notices: boolean;
}

const InstituteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [institute, setInstitute] = useState<InstituteData | null>(null);
  const [access, setAccess] = useState<InstituteAdminAccess | null>(null);
  const [stats, setStats] = useState({
    notices: 0,
    courses: 0,
    enrollments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInstituteData();
    }
  }, [user]);

  const fetchInstituteData = async () => {
    if (!user) return;

    // Get institute admin access
    const { data: adminData } = await supabase
      .from("institute_admins")
      .select("*, institutes(*)")
      .eq("user_id", user.id)
      .single();

    if (adminData) {
      setAccess({
        can_edit_profile: adminData.can_edit_profile,
        can_manage_courses: adminData.can_manage_courses,
        can_post_notices: adminData.can_post_notices,
      });
      setInstitute(adminData.institutes);

      // Fetch stats
      const { count: noticesCount } = await supabase
        .from("institute_notices")
        .select("*", { count: "exact", head: true })
        .eq("institute_id", adminData.institute_id);

      setStats({
        notices: noticesCount || 0,
        courses: 0, // Would need institute_courses table
        enrollments: 0,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have access to any institute.",
      });
      navigate("/dashboard");
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2410c] border-t-transparent" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="max-w-md rounded-[26px] border-[#f0e3da] shadow-[0_24px_60px_rgba(79,48,30,0.12)]">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Institute Access</h2>
            <p className="text-muted-foreground mb-4">
              You don't have access to manage any institute. Please contact the admin.
            </p>
            <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { path: "/institute", icon: LayoutDashboard, label: "Overview", end: true },
    { path: "/institute/notices", icon: Bell, label: "Notices", disabled: !access?.can_post_notices },
    { path: "/institutes", icon: Building2, label: "Public listing" },
    { path: "/courses", icon: BookOpen, label: "Course catalog" },
  ];

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-[#17162e]">
      <div className="min-h-screen w-full overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-[#f0e3da] bg-white/90 backdrop-blur">
        <div className="mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]"
                onClick={() => navigate("/dashboard")}
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                {institute.logo_url ? (
                  <img src={institute.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1e8]">
                    <Building2 className="h-5 w-5 text-[#c2410c]" />
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">{institute.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={institute.is_verified ? "border-0 bg-[#dff5ec] text-[#28725a] hover:bg-[#dff5ec]" : "border-0 bg-[#fff1e8] text-[#c84f08] hover:bg-[#fff1e8]"}>
                      {institute.is_verified ? "Verified" : "Pending"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{institute.type}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 py-5 sm:px-6 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <Card className="rounded-[22px] border-[#f0e3da] bg-white shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardContent className="p-2.5">
                <nav className="space-y-1">
                  {navItems.map((item) =>
                    item.disabled ? (
                      <span
                        key={item.path}
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#746a64] opacity-50"
                        title="You do not have permission to post notices"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </span>
                    ) : (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-[#c2410c] text-white shadow-[0_8px_20px_rgba(249,115,22,0.22)]"
                              : "text-[#746a64] hover:bg-[#fff1e8] hover:text-[#c84f08]"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    ),
                  )}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">
            <section className="mb-4 overflow-hidden rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c2410c]">Institution workspace</p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Good morning, {institute.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#81766f]">Keep admissions, learning resources and student announcements moving from one calm control room.</p>
                </div>
                <Badge className="w-fit border-0 bg-[#dff5ec] px-3 py-1.5 text-[#28725a] hover:bg-[#dff5ec]">Systems on track</Badge>
              </div>
            </section>
            {/* Overview Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <Bell className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.notices}</p>
                      <p className="text-sm text-muted-foreground">Notices</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#dff5ec]">
                      <Users className="h-5 w-5 text-[#28725a]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{institute.available_seats || 0}</p>
                      <p className="text-sm text-muted-foreground">Available Seats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <BookOpen className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.courses}</p>
                      <p className="text-sm text-muted-foreground">Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <Calendar className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold capitalize">
                        {institute.admission_status || "Closed"}
                      </p>
                      <p className="text-sm text-muted-foreground">Admission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-[24px] border-[#f0e3da] shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {access?.can_post_notices && (
                    <Button asChild className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]">
                      <Link to="/institute/notices?new=1">
                        <Bell className="mr-2 h-4 w-4" />
                        Post Notice
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/institutes">
                      <Building2 className="mr-2 h-4 w-4" />
                      View public listing
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/courses">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Browse course catalog
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Notices Preview */}
            <Card className="rounded-[24px] border-[#f0e3da] shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notices</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/institute/notices">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats.notices === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No notices posted yet</p>
                    {access?.can_post_notices && (
                      <Button asChild variant="link">
                        <Link to="/institute/notices?new=1">Post your first notice</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading notices...</p>
                )}
              </CardContent>
            </Card>
            </div>
          </main>
        </div>
      </div>
      </div>
    </div>
  );
};

export default InstituteDashboard;
