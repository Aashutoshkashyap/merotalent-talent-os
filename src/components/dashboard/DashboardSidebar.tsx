import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  Trophy,
  User,
  Users,
  Building2,
  Briefcase,
  GraduationCap,
  Settings,
  LogOut,
  Shield,
  Calendar,
  Award,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardSidebar = () => {
  const { roles, signOut, profile } = useAuth();
  const location = useLocation();
  const isAdmin = roles.includes("admin");

  const mainNavItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Trophy, label: "Competitions", href: "/dashboard/competitions" },
    { icon: Users, label: "Mentors", href: "/dashboard/mentors" },
    { icon: GraduationCap, label: "Learning", href: "/dashboard/learning" },
    { icon: Briefcase, label: "Jobs", href: "/dashboard/jobs" },
  ];

  const userNavItems = [
    { icon: User, label: "My Profile", href: "/dashboard/profile" },
    { icon: Award, label: "My Badges", href: "/dashboard/badges" },
    { icon: Calendar, label: "My Sessions", href: "/dashboard/sessions" },
    { icon: MessageCircle, label: "Messages", href: "/dashboard/messages" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  const adminNavItems = [
    { icon: Shield, label: "Admin Panel", href: "/admin" },
    { icon: Users, label: "Manage Users", href: "/admin/users" },
    { icon: Trophy, label: "Manage Competitions", href: "/admin/competitions" },
    { icon: Building2, label: "Institutions", href: "/admin/institutions" },
    { icon: Briefcase, label: "Companies", href: "/admin/companies" },
  ];

  const NavItem = ({ icon: Icon, label, href }: { icon: typeof Home; label: string; href: string }) => {
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
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-primary">Mero</span>
            <span className="text-secondary">talent</span>
          </span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main
          </p>
          {mainNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* User Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Personal
          </p>
          {userNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* Admin Navigation */}
        {isAdmin && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
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

export default DashboardSidebar;
