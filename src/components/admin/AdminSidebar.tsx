import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  onNavigate?: () => void;
  compact?: boolean;
}

const primaryItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "People", href: "/admin/users" },
  { icon: BookOpen, label: "Learning", href: "/admin/lms" },
  { icon: BriefcaseBusiness, label: "Jobs", href: "/admin/jobs" },
  { icon: Trophy, label: "Competitions", href: "/admin/competitions" },
  { icon: GraduationCap, label: "Mentors", href: "/admin/mentors" },
  { icon: Building2, label: "Institutions", href: "/admin/institutions" },
  { icon: BriefcaseBusiness, label: "Companies", href: "/admin/companies" },
  { icon: Award, label: "Badges", href: "/admin/badges" },
];

const systemItems = [
  { icon: Bell, label: "Notifications", href: "/admin/notifications", badge: 3 },
  { icon: MessageSquareText, label: "Support queries", href: "/admin/queries", badge: 5 },
  { icon: ShieldCheck, label: "Roles & access", href: "/admin/roles" },
  { icon: UserCog, label: "Admin team", href: "/admin/admins" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const AdminSidebar = ({ onNavigate, compact = false }: AdminSidebarProps) => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const NavItem = ({
    icon: Icon,
    label,
    href,
    badge,
  }: {
    icon: typeof LayoutDashboard;
    label: string;
    href: string;
    badge?: number;
  }) => {
    const isActive =
      href === "/admin"
        ? location.pathname === href
        : location.pathname.startsWith(href);

    return (
      <Link
        to={href}
        onClick={onNavigate}
        title={compact ? label : undefined}
        aria-label={compact ? label : undefined}
        className={cn(
          "group flex min-h-10 items-center gap-3 rounded-xl py-2 text-[13px] font-semibold transition-all",
          compact ? "justify-center px-2" : "px-3",
          isActive
            ? "bg-[#c2410c] text-white shadow-[0_8px_20px_rgba(249,115,22,0.28)]"
            : "text-[#737087] hover:bg-[#fff7ed] hover:text-[#35324d]",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
        {!compact ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
        {badge && !compact ? (
          <span
            className={cn(
              "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px]",
              isActive ? "bg-white/20 text-white" : "bg-[#fff1e8] text-[#c2410c]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className={cn("flex h-full flex-col bg-white", compact ? "w-[84px]" : "w-[272px]")}>
      <div className={cn("flex h-[72px] items-center border-b border-[#f0e9e4]", compact ? "justify-center px-3" : "px-5")}>
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#c2410c] text-white shadow-lg shadow-[#c2410c]/20">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          {!compact ? (
            <span className="font-display text-lg font-bold tracking-tight text-[#17162e]">
              Mero<span className="text-[#c2410c]">talent</span>
            </span>
          ) : null}
        </Link>
        {!compact ? (
          <span className="ml-auto rounded-full bg-[#fff1e8] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c2410c]">
            Admin
          </span>
        ) : null}
      </div>

      <div className={cn("flex items-center border-b border-[#f0e9e4] py-4", compact ? "justify-center px-3" : "gap-3 px-5")}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ddf5eb] text-sm font-bold text-[#27745b]">
          {profile?.full_name?.charAt(0) || "A"}
        </span>
        {!compact ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#29263d]">
              {profile?.full_name || "Platform admin"}
            </p>
            <p className="truncate text-[11px] text-[#9592a6]">
              {profile?.email || "Operations workspace"}
            </p>
          </div>
        ) : null}
      </div>

      <nav className={cn("flex-1 space-y-6 overflow-y-auto py-5", compact ? "px-3" : "px-4")}>
        <div>
          {!compact ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa7ba]">
              Workspace
            </p>
          ) : null}
          <div className="space-y-1">{primaryItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
        <div>
          {!compact ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa7ba]">
              System
            </p>
          ) : null}
          <div className="space-y-1">{systemItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
      </nav>

      <div className={cn("space-y-1 border-t border-[#f0e9e4]", compact ? "p-3" : "p-4")}>
        <Button
          variant="ghost"
          className={cn("w-full rounded-xl text-xs text-[#77748a]", compact ? "justify-center px-0" : "justify-start")}
          title={compact ? "Talent workspace" : undefined}
          asChild
        >
          <Link to="/dashboard" onClick={onNavigate}>
            <ChevronLeft className="h-4 w-4" />
            {!compact ? "Talent workspace" : null}
          </Link>
        </Button>
        <Button
          variant="ghost"
          className={cn("w-full rounded-xl text-xs text-[#77748a] hover:text-red-600", compact ? "justify-center px-0" : "justify-start")}
          onClick={signOut}
          title={compact ? "Sign out" : undefined}
          aria-label={compact ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!compact ? "Sign out" : null}
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
