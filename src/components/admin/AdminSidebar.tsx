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
}

const primaryItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "People", href: "/admin/users" },
  { icon: BookOpen, label: "Learning", href: "/admin/lms" },
  { icon: BriefcaseBusiness, label: "Jobs", href: "/admin/jobs" },
  { icon: Trophy, label: "Competitions", href: "/admin/competitions" },
  { icon: GraduationCap, label: "Mentors", href: "/admin/mentors" },
  { icon: Building2, label: "Institutions", href: "/admin/institutions" },
  { icon: Award, label: "Companies & badges", href: "/admin/companies" },
];

const systemItems = [
  { icon: Bell, label: "Notifications", href: "/admin/notifications", badge: 3 },
  { icon: MessageSquareText, label: "Support queries", href: "/admin/queries", badge: 5 },
  { icon: ShieldCheck, label: "Roles & access", href: "/admin/roles" },
  { icon: UserCog, label: "Admin team", href: "/admin/admins" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const AdminSidebar = ({ onNavigate }: AdminSidebarProps) => {
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
        className={cn(
          "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all",
          isActive
            ? "bg-[#625ce7] text-white shadow-[0_8px_20px_rgba(98,92,231,0.24)]"
            : "text-[#737087] hover:bg-[#f0effb] hover:text-[#35324d]",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge ? (
          <span
            className={cn(
              "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px]",
              isActive ? "bg-white/20 text-white" : "bg-[#ecebfa] text-[#625ce7]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-[272px] flex-col bg-white">
      <div className="flex h-[72px] items-center border-b border-[#efeff5] px-5">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#625ce7] text-white shadow-lg shadow-[#625ce7]/20">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#17162e]">
            Mero<span className="text-[#625ce7]">talent</span>
          </span>
        </Link>
        <span className="ml-auto rounded-full bg-[#f0effe] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#625ce7]">
          Admin
        </span>
      </div>

      <div className="flex items-center gap-3 border-b border-[#efeff5] px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ddf5eb] text-sm font-bold text-[#27745b]">
          {profile?.full_name?.charAt(0) || "A"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#29263d]">
            {profile?.full_name || "Platform admin"}
          </p>
          <p className="truncate text-[11px] text-[#9592a6]">
            {profile?.email || "Operations workspace"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa7ba]">
            Workspace
          </p>
          <div className="space-y-1">{primaryItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa7ba]">
            System
          </p>
          <div className="space-y-1">{systemItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
      </nav>

      <div className="space-y-1 border-t border-[#efeff5] p-4">
        <Button variant="ghost" className="w-full justify-start rounded-xl text-xs text-[#77748a]" asChild>
          <Link to="/dashboard" onClick={onNavigate}>
            <ChevronLeft className="h-4 w-4" />
            Talent workspace
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-xs text-[#77748a] hover:text-red-600"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
