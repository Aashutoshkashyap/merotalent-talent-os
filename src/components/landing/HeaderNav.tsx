"use client";

import React, { useState } from "react";
import { Search, Briefcase, Sparkles, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { resolveWorkspacePath } from "@/lib/auth/workspace-path";

interface HeaderNavProps {
  onSearch?: (query: string) => void;
  brandHref?: string;
}

export const SearchBar: React.FC<{
  placeholder?: string;
  onSearch?: (val: string) => void;
}> = ({ placeholder = "Search Opportunities", onSearch }) => {
  const [val, setVal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(val);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center w-full max-w-[480px]"
    >
      <Search className="absolute left-4 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-5 py-[10px] bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-[13px] text-slate-800 placeholder-slate-400 rounded-full border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
      />
    </form>
  );
};

export const LoginButton: React.FC<{ label?: string; onClick?: () => void }> = ({
  label = "Login",
  onClick,
}) => {
  const { user, roles, permissions } = useAuth();
  
  if (user) {
    const targetDashboard = resolveWorkspacePath(roles, permissions);

    return (
      <Link
        to={targetDashboard}
        onClick={onClick}
        className="inline-flex items-center gap-2 px-5 py-[9px] bg-[#0073e6] hover:bg-[#0062c4] text-white font-bold text-[13px] rounded-full shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
      >
        <UserIcon className="w-4 h-4" />
        <span>Dashboard</span>
      </Link>
    );
  }

  return (
    <Link
      to="/login"
      onClick={onClick}
      className="inline-flex items-center justify-center px-7 py-[9px] bg-[#0073e6] hover:bg-[#0062c4] text-white font-bold text-[13px] rounded-full shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
    >
      {label}
    </Link>
  );
};

export const BusinessButton: React.FC<{
  label?: string;
  onClick?: () => void;
}> = ({ label = "For Business", onClick }) => {
  return (
    <Link
      to="/company"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-5 py-[9px] bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-[13px] rounded-full transition-all duration-200 active:scale-95"
    >
      <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
        <Briefcase className="w-3 h-3" />
      </div>
      <span>{label}</span>
    </Link>
  );
};

export default function HeaderNav({
  onSearch,
  brandHref = "/",
}: HeaderNavProps) {
  return (
    <header className="sticky top-0 right-0 left-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-[60px] px-5 md:px-8 flex items-center justify-between z-30">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Link
          to={brandHref}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <img src="/logo.png" alt="MeroTalent Logo" className="h-8 w-auto object-contain rounded-lg" />
          <span className="text-xl font-black text-slate-900 tracking-tight">
            Mero<span className="text-[#0073e6]">Talent</span>
          </span>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl mx-6 hidden sm:flex justify-center">
        <SearchBar onSearch={onSearch} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <LoginButton />
      </div>
    </header>
  );
}
