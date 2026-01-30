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
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminSidebar = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: Trophy, label: "Competitions", href: "/admin/competitions" },
    { icon: Building2, label: "Institutions", href: "/admin/institutions" },
    { icon: Briefcase, label: "Companies", href: "/admin/companies" },
    { icon: GraduationCap, label: "Mentors", href: "/admin/mentors" },
    { icon: Award, label: "Badges", href: "/admin/badges" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  const NavItem = ({ icon: Icon, label, href }: { icon: typeof LayoutDashboard; label: string; href: string }) => {
    const isActive = location.pathname === href;
    return (
      <Link
        to={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-destructive text-destructive-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive via-destructive to-destructive/80 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-destructive-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-destructive">Admin</span>
            <span className="text-muted-foreground">Panel</span>
          </span>
        </Link>
      </div>

      {/* Admin Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center text-destructive-foreground font-semibold">
            {profile?.full_name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
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
