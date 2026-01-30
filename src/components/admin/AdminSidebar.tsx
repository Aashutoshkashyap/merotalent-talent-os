import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Building2,
  Briefcase,
  GraduationCap,
  Settings,
  LogOut,
  Shield,
  Award,
  ArrowLeft,
  BookOpen,
  Bell,
  MessageSquare,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AdminSidebar = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: BookOpen, label: "LMS / Courses", href: "/admin/lms" },
    { icon: Briefcase, label: "Jobs", href: "/admin/jobs" },
    { icon: Trophy, label: "Competitions", href: "/admin/competitions" },
    { icon: GraduationCap, label: "Mentors", href: "/admin/mentors" },
    { icon: Building2, label: "Institutions", href: "/admin/institutions" },
    { icon: Award, label: "Companies", href: "/admin/companies" },
    { icon: Award, label: "Badges", href: "/admin/badges" },
  ];

  const systemItems = [
    { icon: Bell, label: "Notifications", href: "/admin/notifications", badge: 3 },
    { icon: MessageSquare, label: "Queries", href: "/admin/queries", badge: 5 },
    { icon: UserCog, label: "Admin Management", href: "/admin/admins" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  const NavItem = ({ icon: Icon, label, href, badge }: { icon: typeof LayoutDashboard; label: string; href: string; badge?: number }) => {
    const isActive = location.pathname === href;
    return (
      <Link
        to={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1">{label}</span>
        {badge && badge > 0 && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
            {badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-primary">Super</span>
            <span className="text-muted-foreground">Admin</span>
          </span>
        </Link>
      </div>

      {/* Admin Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold">
            {profile?.full_name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Content Management
          </p>
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            System
          </p>
          {systemItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-5 h-5" />
            Back to Student Dashboard
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
