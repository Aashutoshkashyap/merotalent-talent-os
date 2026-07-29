import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Menu,
  Search,
  Settings,
} from "lucide-react";
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

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

const AdminHeader = ({ onMenuClick }: AdminHeaderProps) => {
  const { profile, signOut } = useAuth();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[#e9e8f2] bg-white/90 px-4 backdrop-blur-xl sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-xl lg:hidden"
        onClick={onMenuClick}
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden sm:block">
        <p className="text-sm font-bold text-[#25233c]">Command center</p>
        <p className="text-[11px] text-[#9996a9]">One calm view of the platform</p>
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b98aa]" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          aria-label="Search admin workspace"
          placeholder="Search people, jobs, courses or commands…"
          className="h-10 rounded-xl border-0 bg-[#f3f2f8] pl-10 pr-11 text-sm placeholder:text-[#a9a6b7] focus-visible:ring-[#f97316]/30"
        />
        <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md bg-white px-1.5 py-1 text-[9px] font-semibold text-[#9b98aa] shadow-sm md:flex">
          <Command className="h-3 w-3" /> K
        </span>
      </div>

      <Button variant="ghost" size="icon" className="relative shrink-0 rounded-xl" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#ef6d72]" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 shrink-0 gap-2 rounded-xl px-1.5 sm:pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ddf5eb] text-xs font-bold text-[#28735a]">
              {profile?.full_name?.charAt(0) || "A"}
            </span>
            <span className="hidden text-xs font-semibold text-[#4c495f] md:inline">
              {profile?.full_name?.split(" ")[0] || "Admin"}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[#9a97a8] md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuLabel>
            <span className="block text-sm">{profile?.full_name || "Platform admin"}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{profile?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AdminHeader;
