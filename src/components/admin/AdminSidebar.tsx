import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  Contact,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  Package,
  PanelTop,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminSidebarProps {
  onNavigate?: () => void;
  compact?: boolean;
  motionScope?: string;
}

const primaryItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "People", href: "/admin/users" },
  { icon: BookOpen, label: "Learning", href: "/admin/lms" },
  { icon: BriefcaseBusiness, label: "Jobs", href: "/admin/jobs" },
  { icon: Trophy, label: "Competitions", href: "/admin/competitions" },
  { icon: GraduationCap, label: "Mentors", href: "/admin/mentors" },
  { icon: Building2, label: "Institutions", href: "/admin/institutions" },
  { icon: Building, label: "Companies", href: "/admin/companies" },
  { icon: CalendarDays, label: "Events", href: "/admin/events" },
  { icon: FileText, label: "Applications", href: "/admin/applications" },
  { icon: CalendarCheck, label: "Bookings", href: "/admin/bookings" },
];

const systemItems = [
  { icon: Contact, label: "Leads", href: "/admin/leads" },
  { icon: Package, label: "Packages", href: "/admin/packages" },
  { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: Receipt, label: "Payments", href: "/admin/payments" },
  { icon: Megaphone, label: "Ads", href: "/admin/advertisements" },
  { icon: Sparkles, label: "Featured", href: "/admin/featured" },
  { icon: BarChart3, label: "Reports", href: "/admin/reports" },
  { icon: Bell, label: "Notifications", href: "/admin/notifications" },
  { icon: MessageSquareText, label: "Support", href: "/admin/queries" },
  { icon: ShieldCheck, label: "Roles", href: "/admin/roles" },
  { icon: UserCheck, label: "Access requests", href: "/admin/access-requests" },
  { icon: PanelTop, label: "Page editor", href: "/admin/pages" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const AdminSidebar = ({
  onNavigate,
  compact = false,
  motionScope = compact ? "compact" : "expanded",
}: AdminSidebarProps) => {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const previewSuffix =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(location.search).get("preview") === "ui"
      ? "?preview=ui"
      : "";

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

    const navLink = (
      <Link
        to={`${href}${previewSuffix}`}
        onClick={onNavigate}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative isolate flex min-h-12 items-center gap-3 overflow-hidden rounded-xl py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071a3d]",
          compact ? "justify-center px-2" : "px-3",
          isActive
            ? "text-white"
            : "text-[#c5d8f3] hover:bg-white/10 hover:text-white",
        )}
      >
        {isActive ? (
          <motion.span
            layoutId={`admin-sidebar-active-${motionScope}`}
            className="absolute inset-0 z-0 rounded-xl bg-[#2563eb] shadow-[0_10px_24px_rgba(37,99,235,0.36)] ring-1 ring-inset ring-[#60a5fa]/60"
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 440, damping: 36, mass: 0.72 }
            }
          />
        ) : null}
        <Icon
          className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
          strokeWidth={1.9}
        />
        {!compact ? <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span> : null}
        {badge && !compact ? (
          <span
            className={cn(
              "relative z-10 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold",
              isActive ? "bg-white/20 text-white" : "bg-[#17396c] text-[#bfdbfe]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );

    if (!compact) return navLink;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{navLink}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-[#31548a] bg-[#10264a] px-3 py-2 text-sm font-bold text-white shadow-xl"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-[#071a3d]", compact ? "w-[84px]" : "w-[288px]")}>
      <div className={cn("flex h-[72px] items-center border-b border-white/10", compact ? "justify-center px-3" : "px-5")}>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071a3d]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-[#60a5fa]/70">
            <Sparkles className="h-5 w-5" />
          </span>
          {!compact ? (
            <span className="font-display text-xl font-bold tracking-tight text-white">
              Mero<span className="text-[#93c5fd]">talent</span>
            </span>
          ) : null}
        </Link>
        {!compact && motionScope !== "mobile" ? (
          <span className="ml-auto rounded-full bg-[#17396c] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#bfdbfe] ring-1 ring-inset ring-[#60a5fa]/30">
            Admin
          </span>
        ) : null}
      </div>

      <div className={cn("flex items-center border-b border-white/10 py-4", compact ? "justify-center px-3" : "gap-3 px-5")}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dbeafe] text-base font-bold text-[#1d4ed8] ring-2 ring-[#60a5fa]/25">
          {profile?.full_name?.charAt(0) || "A"}
        </span>
        {!compact ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">
              {profile?.full_name || "Platform admin"}
            </p>
            <p className="truncate text-sm text-[#9ebbe2]">
              {profile?.email || "Operations workspace"}
            </p>
          </div>
        ) : null}
      </div>

      <nav className={cn("flex-1 space-y-6 overflow-y-auto py-5", compact ? "px-3" : "px-4")}>
        <div>
          {!compact ? (
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">
              Workspace
            </p>
          ) : null}
          <div className="space-y-1">{primaryItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
        <div>
          {!compact ? (
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">
              System
            </p>
          ) : null}
          <div className="space-y-1">{systemItems.map((item) => <NavItem key={item.href} {...item} />)}</div>
        </div>
      </nav>

      <div className={cn("space-y-1 border-t border-white/10 bg-[#061734]", compact ? "p-3" : "p-4")}>
        <Button
          variant="ghost"
          className={cn(
            "w-full rounded-xl text-[15px] text-[#c5d8f3] hover:bg-white/10 hover:text-white focus-visible:ring-[#93c5fd] focus-visible:ring-offset-[#071a3d]",
            compact ? "justify-center px-0" : "justify-start",
          )}
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
          className={cn(
            "w-full rounded-xl text-[15px] text-[#c5d8f3] hover:bg-[#7f1d1d]/25 hover:text-[#fecaca] focus-visible:ring-[#93c5fd] focus-visible:ring-offset-[#071a3d]",
            compact ? "justify-center px-0" : "justify-start",
          )}
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
