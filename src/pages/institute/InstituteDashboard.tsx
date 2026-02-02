import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Bell,
  BookOpen,
  Settings,
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Institute Access</h2>
            <p className="text-muted-foreground mb-4">
              You don't have access to manage any institute. Please contact the admin.
            </p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { path: "/institute", icon: LayoutDashboard, label: "Overview", end: true },
    { path: "/institute/profile", icon: Building2, label: "Profile", disabled: !access?.can_edit_profile },
    { path: "/institute/notices", icon: Bell, label: "Notices", disabled: !access?.can_post_notices },
    { path: "/institute/courses", icon: BookOpen, label: "Courses", disabled: !access?.can_manage_courses },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                {institute.logo_url ? (
                  <img src={institute.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">{institute.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant={institute.is_verified ? "default" : "secondary"}>
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

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <Card className="border-border/50">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                          item.disabled
                            ? "opacity-50 pointer-events-none"
                            : isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.notices}</p>
                      <p className="text-sm text-muted-foreground">Notices</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{institute.available_seats || 0}</p>
                      <p className="text-sm text-muted-foreground">Available Seats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.courses}</p>
                      <p className="text-sm text-muted-foreground">Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-warning" />
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
            <Card className="border-border/50 mb-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {access?.can_post_notices && (
                    <Button onClick={() => navigate("/institute/notices/new")}>
                      <Bell className="w-4 h-4 mr-2" />
                      Post Notice
                    </Button>
                  )}
                  {access?.can_edit_profile && (
                    <Button variant="outline" onClick={() => navigate("/institute/profile")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Update Profile
                    </Button>
                  )}
                  {access?.can_manage_courses && (
                    <Button variant="outline" onClick={() => navigate("/institute/courses")}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Manage Courses
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Notices Preview */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notices</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/institute/notices")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats.notices === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No notices posted yet</p>
                    {access?.can_post_notices && (
                      <Button variant="link" onClick={() => navigate("/institute/notices/new")}>
                        Post your first notice
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading notices...</p>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default InstituteDashboard;
