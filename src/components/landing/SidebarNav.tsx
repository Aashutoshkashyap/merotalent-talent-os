"use client";

import React, { useState } from "react";
import {
  Home,
  GraduationCap,
  Briefcase,
  Trophy,
  Target,
  Users,
  Code2,
  ChevronRight,
  Plus,
  LogOut,
  Sparkles,
  UserCheck,
  Building2,
  Menu,
  Grid,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export interface RoleOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  isExternal?: boolean;
  hasSubmenu?: boolean;
}

const DEFAULT_ROLES: RoleOption[] = [
  { id: "talent", label: "Talent", icon: Sparkles },
  { id: "mentor", label: "Mentor", icon: UserCheck },
];

const TALENT_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "courses", label: "Courses", icon: GraduationCap, path: "https://learn.merotalent.com", isExternal: true },
  { id: "events", label: "Events", icon: Trophy, path: "/events" },
  { id: "mentors", label: "Mentors", icon: Users, path: "/mentorship" },
  { id: "colleges", label: "Colleges", icon: Building2, path: "/institutes" },
  { id: "jobs", label: "Jobs", icon: Briefcase, path: "/jobs" },
];

export const RoleSwitchButton: React.FC<{
  role: RoleOption;
  isActive: boolean;
  onSelect: () => void;
}> = ({ role, isActive, onSelect }) => {
  const Icon = role.icon;
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onSelect}
      title={role.label}
      className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 w-12 ${
        isActive ? "text-[#0073e6] font-bold" : "text-slate-500 hover:text-slate-900"
      }`}
    >
      <div
        className={`p-2 rounded-full transition-all duration-200 ${
          isActive
            ? "bg-blue-100 text-[#0073e6] shadow-sm scale-110"
            : "bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-[#0073e6]"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] mt-1 font-semibold tracking-tight truncate max-w-full">
        {role.label}
      </span>
    </button>
  );
};

interface SidebarNavProps {
  activeRole?: string;
  onRoleChange?: (roleId: string) => void;
  activeNavId?: string;
  onNavSelect?: (navId: string) => void;
  onHoverChange?: (hovered: boolean) => void;
}

export default function SidebarNav({
  activeRole = "talent",
  onRoleChange,
  activeNavId = "home",
  onNavSelect,
  onHoverChange,
}: SidebarNavProps) {
  const [currentRole, setCurrentRole] = useState(activeRole);
  const [currentNav, setCurrentNav] = useState(activeNavId);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = (id: string) => {
    setCurrentRole(id);
    onRoleChange?.(id);
  };

  const handleNavClick = (item: NavItem) => {
    setCurrentNav(item.id);
    onNavSelect?.(item.id);
    if (item.path) {
      if (item.isExternal) {
        window.location.href = item.path;
      } else {
        navigate(item.path);
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange?.(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed left-0 top-0 bottom-0 flex z-40 select-none bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out shadow-[4px_0_20px_rgba(0,0,0,0.04)] h-screen"
      style={{ width: isHovered ? "292px" : "72px" }}
    >
      {/* Panel A: Left Role Rail */}
      <div className="w-[72px] bg-white border-r border-slate-100 flex flex-col items-center justify-between py-4 flex-shrink-0 h-full">
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Top Toggle Switch */}
          <button
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-200/60 active:scale-95"
            title="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-[1px] bg-slate-200/60 my-0.5" />

          {/* Roles Selector Stack */}
          <div className="flex flex-col items-center gap-2 w-full">
            {DEFAULT_ROLES.map((role) => (
              <RoleSwitchButton
                key={role.id}
                role={role}
                isActive={currentRole === role.id}
                onSelect={() => handleRoleSelect(role.id)}
              />
            ))}
          </div>
        </div>

        {/* Bottom Logout Action */}
        <Link
          to="/login"
          title="Logout"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </Link>
      </div>

      {/* Panel B: Wide Navigation Panel */}
      <div
        className={`bg-white flex flex-col py-5 px-4 border-r border-slate-100 overflow-hidden transition-all duration-300 ease-in-out h-full ${
          isHovered ? "w-[220px] opacity-100" : "w-0 opacity-0 pointer-events-none p-0 border-none"
        }`}
      >
        {/* VIEW 1: TALENT ROLE */}
        {currentRole === "talent" && (
          <div className="flex flex-col h-full gap-3">
            {/* + Post Button */}
            <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#eaf4ff] hover:bg-[#dbeafe] border border-blue-200/80 text-[#0073e6] font-bold text-sm rounded-full transition-all duration-200 shadow-sm active:scale-[0.98] flex-shrink-0">
              <Plus className="w-4 h-4" />
              <span>Post</span>
            </button>

            {/* Navigation list matching reference image */}
            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
              {TALENT_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentNav === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200 ${
                      isActive
                        ? "bg-[#eaf4ff] text-[#0073e6] font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? "text-[#0073e6]" : "text-slate-500 group-hover:text-slate-800"
                        }`}
                      />
                      <span className="text-xs sm:text-sm tracking-tight truncate">{item.label}</span>
                    </div>
                    {item.hasSubmenu && (
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-[#0073e6]" : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* VIEW 2: MENTOR ROLE */}
        {currentRole === "mentor" && (
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base border-b border-slate-100 pb-2.5">
              <UserCheck className="w-5 h-5 text-[#0073e6]" />
              <span>Mentor</span>
            </div>

            {/* Mentor Card */}
            <div className="rounded-2xl bg-gradient-to-b from-blue-50/90 via-indigo-50/50 to-white border border-blue-100 p-4 flex flex-col items-center text-center gap-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#0073e6] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Mentor & Guide</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Share your expertise with talents across Nepal
                </p>
              </div>
              <Link
                to="/signup?role=mentor"
                className="w-full py-2.5 bg-[#0073e6] hover:bg-[#0062c4] text-white font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 text-center mt-1"
              >
                + Be a Mentor
              </Link>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0073e6] hover:underline"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Login / Signup</span>
              </Link>
            </div>
          </div>
        )}

        {/* VIEW 3: RECRUITER ROLE */}
        {currentRole === "recruiter" && (
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base border-b border-slate-100 pb-2.5">
              <Building2 className="w-5 h-5 text-[#0073e6]" />
              <span>Recruiter</span>
            </div>

            {/* Recruiter Card */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-50 via-blue-50/40 to-white border border-slate-200/80 p-4 flex flex-col items-center text-center gap-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Hire fast & for free</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">50K+ Educational Talents</p>
              </div>

              <div className="w-full flex flex-col gap-2 mt-1">
                <Link
                  to="/company"
                  className="w-full py-2.5 bg-[#0073e6] hover:bg-[#0062c4] text-white font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 text-center"
                >
                  + Post a Job
                </Link>
                <Link
                  to="/company"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 text-center"
                >
                  + Post an Internship
                </Link>
              </div>

              <Link
                to="/company"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 mt-1"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>For Business</span>
              </Link>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0073e6] hover:underline"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Login/signup as Recruiter</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
