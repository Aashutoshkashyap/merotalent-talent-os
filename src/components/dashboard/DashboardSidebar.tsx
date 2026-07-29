import { Link, useLocation } from "react-router-dom";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  compact?: boolean;
  onNavigate?: () => void;
}

const DashboardSidebar = ({ compact = false, onNavigate }: DashboardSidebarProps) => {
  const { roles, signOut, profile } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isAdmin = roles.includes("admin");
  const previewSuffix =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(location.search).get("preview") === "ui"
      ? "?preview=ui"
      : "";

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
    const isActive =
      href === "/dashboard"
        ? location.pathname === href
        : location.pathname === href || location.pathname.startsWith(`${href}/`);

    return (
      <Link
        to={`${href}${previewSuffix}`}
        onClick={onNavigate}
        title={compact ? label : undefined}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative isolate flex items-center rounded-2xl text-base font-semibold transition-colors duration-200",
          compact ? "h-11 w-11 justify-center" : "gap-3 px-3.5 py-3",
          isActive
            ? "text-white"
            : "text-[#777286] hover:bg-[#fff1e5] hover:text-[#c2410c]"
        )}
      >
        {isActive && (
          <motion.span
            layoutId="talent-active-nav-item"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[#c2410c] shadow-[0_10px_24px_rgba(194,65,12,0.3)]"
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 430, damping: 34, mass: 0.75 }
            }
          />
        )}
        <Icon
          className="relative z-10 h-[19px] w-[19px]"
          strokeWidth={isActive ? 2.4 : 1.8}
        />
        {!compact && (
          <>
            <span className="relative z-10 flex-1">{label}</span>
            <ChevronRight className="relative z-10 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-50" />
          </>
        )}
        {compact && (
          <span className="pointer-events-none absolute left-[calc(100%+12px)] z-50 hidden whitespace-nowrap rounded-xl bg-[#19172b] px-3 py-2 text-sm font-semibold text-white shadow-xl group-hover:block">
            {label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <LayoutGroup id={compact ? "talent-desktop-nav" : "talent-mobile-nav"}>
      <aside
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden bg-white",
          compact
            ? "sticky top-0 h-[100dvh] w-[74px] border-r border-[#eee7e1]"
            : "h-[calc(100dvh-1.5rem)] w-full rounded-[28px] border border-[#f2e3d6]"
        )}
      >
        <div className={cn("flex items-center", compact ? "justify-center px-3 py-4" : "gap-3 px-5 py-5")}>
          <Link to="/" onClick={onNavigate} className="group flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c2410c] shadow-[0_12px_28px_rgba(249,115,22,0.28)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!compact && (
              <span className="font-display text-2xl font-black tracking-[-0.04em] text-[#19172b]">
                mero<span className="text-[#c2410c]">talent</span>
              </span>
            )}
          </Link>
        </div>

        <div className={cn("border-y border-[#f4e7dc]", compact ? "px-3 py-4" : "px-4 py-4")}>
          <div className={cn("flex items-center", compact ? "justify-center" : "gap-3 rounded-2xl bg-[#fff8f1] p-2.5")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#19172b] text-base font-bold text-white">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
            </div>
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#19172b]">{profile?.full_name || "Talent"}</p>
                <p className="truncate text-sm text-[#898391]">{profile?.email}</p>
              </div>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 overflow-y-auto", compact ? "space-y-5 px-3 py-4" : "space-y-6 px-4 py-5")}>
          <div className={cn("space-y-1.5", compact && "flex flex-col items-center")}>
            {!compact && <p className="px-3 text-sm font-bold uppercase tracking-[0.16em] text-[#a39ca8]">Explore</p>}
            {mainNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          <div className={cn("space-y-1.5", compact && "flex flex-col items-center border-t border-[#f4e7dc] pt-5")}>
            {!compact && <p className="px-3 text-sm font-bold uppercase tracking-[0.16em] text-[#a39ca8]">My space</p>}
            {userNavItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          {isAdmin && (
            <div className={cn("space-y-1.5", compact && "flex flex-col items-center border-t border-[#f4e7dc] pt-5")}>
              {!compact && <p className="px-3 text-sm font-bold uppercase tracking-[0.16em] text-[#a39ca8]">Admin</p>}
              {adminNavItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          )}
        </nav>

        <div className={cn("border-t border-[#f4e7dc]", compact ? "p-3" : "p-4")}>
          <Button
            variant="ghost"
            title={compact ? "Sign out" : undefined}
            aria-label="Sign out"
            className={cn(
              "text-base text-[#8a8490] hover:bg-red-50 hover:text-red-600",
              compact ? "h-11 w-11 rounded-2xl p-0" : "w-full justify-start gap-3 rounded-2xl"
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
