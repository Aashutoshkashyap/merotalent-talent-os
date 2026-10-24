import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/components/brand/BrandMark";
import { MEROTALENT_BRAND as brand } from "@/lib/brand";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  Trophy,
  User,
  Users,
  Briefcase,
  GraduationCap,
  Building2,
  Settings,
  LogOut,
  Shield,
  Calendar,
  CalendarDays,
  Award,
  Sparkles,
  MessageCircle,
  ChevronRight,
  ShieldAlert,
  UserCog,
  Activity,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardSidebarProps {
  compact?: boolean;
  fixed?: boolean;
  motionScope?: string;
  onNavigate?: () => void;
}

const DashboardSidebar = ({
  compact = false,
  fixed = false,
  motionScope = compact ? "compact" : "expanded",
  onNavigate,
}: DashboardSidebarProps) => {
  const { roles, signOut, profile, capabilities } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isAdmin = roles.includes("admin");
  const isMentor = roles.includes("mentor") || capabilities.includes("mentor");
  const isCompany = roles.includes("company") || capabilities.includes("jobs");
  const isInstitution = roles.includes("institution") || capabilities.includes("college");
  const previewSuffix =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(location.search).get("preview") === "ui"
      ? "?preview=ui"
      : "";

  const mainNavItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Building2, label: "Colleges & Institutes", href: "/dashboard/colleges" },
    { icon: Briefcase, label: "Jobs", href: "/dashboard/jobs" },
    { icon: Trophy, label: "Competitions", href: "/dashboard/competitions" },
    { icon: Users, label: "Mentors", href: "/dashboard/mentors" },
    { icon: GraduationCap, label: "Partner Courses", href: "https://learn.merotalent.com", isExternal: true },
  ];

  const userNavItems = [
    { icon: User, label: "My Profile", href: "/dashboard/profile" },
    { icon: Calendar, label: "My Sessions", href: "/dashboard/sessions" },
    { icon: Award, label: "My Event Passes", href: "/dashboard/tickets" },
    { icon: Activity, label: "My Activity", href: "/dashboard/activity" },
    { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    { icon: ShieldAlert, label: "Request Access / Discard", href: "/request-access" },
  ];

  const adminNavItems = [{ icon: Shield, label: "Admin Panel", href: "/admin" }];

  const workspaceNavItems = [
    ...(isMentor ? [{ icon: UserCog, label: "Mentor Workspace", href: "/mentor" }] : []),
    ...(isCompany ? [{ icon: Briefcase, label: "Company Workspace", href: "/company" }] : []),
    ...(isInstitution ? [{ icon: Building2, label: "Institute Dashboard", href: "/institute" }] : []),
    ...(capabilities.includes("events") ? [{ icon: CalendarDays, label: "Events Workspace", href: "/event-admin" }] : []),
    ...(capabilities.some((capability) => ["jobs", "mentor", "events"].includes(capability)) ? [{ icon: Sparkles, label: "Module AI Workspace", href: "/dashboard/ai-workspace" }] : []),
  ];

  const NavItem = ({
    icon: Icon,
    label,
    href,
    isExternal,
  }: {
    icon: typeof Home;
    label: string;
    href: string;
    isExternal?: boolean;
  }) => {
    const isActive =
      !isExternal &&
      (href === "/dashboard" || href === "/admin"
        ? location.pathname === href
        : location.pathname === href || location.pathname.startsWith(`${href}/`));

    const content = (
      <>
        <Icon
          className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
          strokeWidth={isActive ? 2.3 : 1.9}
        />
        {!compact && (
          <>
            <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
            <ChevronRight className="relative z-10 h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-70" />
          </>
        )}
      </>
    );

    const className = cn(
      "group relative flex min-h-12 items-center rounded-xl text-base font-semibold outline-none transition-colors duration-150 active:scale-[0.98]",
      compact ? "w-12 justify-center" : "gap-3 px-3 py-2",
      isActive
        ? "bg-[#2563eb] text-white shadow-md font-bold"
        : "text-[#c5d8f3] hover:bg-white/10 hover:text-white"
    );

    const navLink = isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>
        {content}
      </a>
    ) : (
      <Link to={`${href}${previewSuffix}`} onClick={onNavigate} aria-label={label} aria-current={isActive ? "page" : undefined} className={className}>
        {content}
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
    <LayoutGroup id={`talent-nav-${motionScope}`}>
      <aside
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden bg-[#071a3d] text-white",
          compact ? "w-[84px]" : "w-[288px]",
          fixed && "fixed inset-y-0 left-0 z-40 h-[100dvh] border-r border-[#173769]"
        )}
        aria-label="Talent workspace navigation"
      >
        <div className={cn("flex h-[72px] items-center border-b border-white/10", compact ? "justify-center px-3" : "px-5")}>
          <Link
            to="/"
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071a3d]"
            aria-label={compact ? "MeroTalent home" : undefined}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white shadow-sm transition-transform group-hover:scale-105">
              <BrandMark size={36} className="h-9 w-9 object-contain" />
            </div>
            {!compact && (
              <span className="font-display text-xl font-bold tracking-tight text-white">
                {brand.name}
              </span>
            )}
          </Link>
        </div>

        <div className={cn("flex items-center border-b border-white/10 py-4", compact ? "justify-center px-3" : "gap-3 px-5")}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-base font-bold text-[#1d4ed8] ring-2 ring-[#60a5fa]/25">
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{profile?.full_name || "Talent"}</p>
              <p className="truncate text-sm text-[#9ebbe2]">{profile?.email || "Talent workspace"}</p>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 space-y-6 overflow-y-auto py-5", compact ? "px-[18px]" : "px-4")}>
          <div className={cn("space-y-1.5", compact && "flex flex-col items-center")}>
            {!compact && <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">Explore</p>}
            {mainNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          <div className={cn("space-y-1.5", compact && "flex flex-col items-center border-t border-white/10 pt-5")}>
            {!compact && <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">My space</p>}
            {userNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          {workspaceNavItems.length > 0 && (
            <div className={cn("space-y-1.5", compact && "flex flex-col items-center border-t border-white/10 pt-5")}>
              {!compact && <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">Workspaces</p>}
              {workspaceNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          )}

          {isAdmin && (
            <div className={cn("space-y-1.5", compact && "flex flex-col items-center border-t border-white/10 pt-5")}>
              {!compact && <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7fa4d7]">Admin</p>}
              {adminNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          )}
        </nav>

        <div className={cn("border-t border-white/10 bg-[#061734]", compact ? "p-3" : "p-4")}>
          <Button
            variant="ghost"
            title={compact ? "Sign out" : undefined}
            aria-label="Sign out"
            className={cn(
              "w-full rounded-xl text-[15px] font-semibold text-[#c5d8f3] outline-none hover:bg-[#7f1d1d]/25 hover:text-[#fecaca] focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071a3d]",
              compact ? "h-11 justify-center px-0" : "justify-start gap-3"
            )}
            onClick={signOut}
          >
            <LogOut className="h-[19px] w-[19px]" />
            {!compact && "Sign Out"}
          </Button>
        </div>
      </aside>
    </LayoutGroup>
  );
};

export default DashboardSidebar;
