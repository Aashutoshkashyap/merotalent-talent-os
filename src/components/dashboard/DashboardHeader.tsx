import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, User, Settings, LogOut, Menu, Plus, Command } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const { profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusCommandSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", focusCommandSearch);
    return () => window.removeEventListener("keydown", focusCommandSearch);
  }, []);

  const runCommand = (event: FormEvent) => {
    event.preventDefault();
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return;

    const route = [
      ["competition challenge", "/dashboard/competitions"],
      ["mentor coaching", "/dashboard/mentors"],
      ["course learning partner", "/courses"],
      ["job career role", "/dashboard/jobs"],
      ["profile portfolio", "/dashboard/profile"],
      ["badge achievement", "/dashboard/badges"],
      ["session appointment", "/dashboard/sessions"],
      ["message chat", "/dashboard/messages"],
      ["setting account", "/dashboard/settings"],
    ].find(([keywords]) => keywords.split(" ").some((keyword) => normalized.includes(keyword)))?.[1];

    navigate(route || `/dashboard/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  };

  const titles: Record<string, string> = {
    "/dashboard": "My workspace",
    "/dashboard/competitions": "Competitions",
    "/dashboard/mentors": "Mentors",
    "/dashboard/jobs": "Jobs",
    "/dashboard/profile": "My profile",
    "/dashboard/badges": "Achievements",
    "/dashboard/sessions": "Sessions",
    "/dashboard/messages": "Messages",
    "/dashboard/settings": "Settings",
  };
  const pageTitle =
    Object.entries(titles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) =>
        path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path)
      )?.[1] || "My workspace";

  return (
    <header className="sticky top-0 z-40 flex min-h-[76px] items-center gap-3 border-b border-[#f3e6db] bg-[#fffaf6]/95 px-4 py-3 backdrop-blur-xl sm:px-5 md:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-2xl border border-[#f0dfd2] bg-white text-[#19172b] shadow-sm hover:bg-[#fff1e7] hover:text-[#c2410c] md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-[132px] lg:block">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#aaa2aa]">Talent OS</p>
        <p className="mt-0.5 text-lg font-black tracking-[-0.035em] text-[#19172b]">{pageTitle}</p>
      </div>

      <form onSubmit={runCommand} className="min-w-0 flex-1 md:mx-2 lg:mx-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a939d]" />
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search or type a command"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-2xl border-[#eee2d8] bg-white pl-10 pr-12 text-sm shadow-[0_8px_24px_rgba(67,42,23,0.04)] placeholder:text-[#aaa4ab] focus-visible:border-[#c2410c]/50 focus-visible:ring-[#c2410c]/15"
          />
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-[#f8f1eb] px-2 py-1 text-xs font-bold text-[#928b94] sm:flex">
            <Command className="h-3 w-3" /> K
          </div>
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          asChild
          className="hidden h-10 rounded-xl bg-[#c2410c] px-4 text-xs text-white shadow-[0_10px_22px_rgba(249,115,22,0.24)] hover:bg-[#ea690c] sm:flex"
        >
          <Link to="/dashboard/competitions">
            <Plus className="h-4 w-4" />
            Explore
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl border border-[#eee2d8] bg-white text-[#393449] hover:bg-[#fff1e7] hover:text-[#c2410c]"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#68c9ad] text-xs font-black text-[#19172b] ring-2 ring-white">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-xl p-1 pr-2 text-[#19172b] hover:bg-[#fff1e7]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#19172b] text-xs font-bold text-white">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
              </div>
              <span className="hidden max-w-24 truncate text-xs font-bold xl:block">
                {profile?.full_name?.split(" ")[0] || "Talent"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.full_name || "User"}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
