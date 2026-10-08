import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Menu,
  Search,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteCMS } from "@/hooks/useSiteCMS";

const navLinks = [
  { name: "Jobs", href: "/jobs" },
  { name: "Competitions", href: "/competitions" },
  { name: "Learn", href: "/courses" },
  { name: "Mentorship", href: "/mentorship" },
  { name: "Institutes", href: "/institutes" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { settings } = useSiteCMS();
  const { user, roles } = useAuth();

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/jobs?search=${encodeURIComponent(query)}` : "/jobs");
    setIsOpen(false);
  };

  const targetDashboard = roles.includes("admin") || roles.includes("super_admin")
    ? "/admin"
    : "/dashboard";

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#eadfd9] bg-[#fffdfb]/92 backdrop-blur-xl">
      <div className="flex h-[68px] w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Merotalent home">
          <img
            src={settings.logo_url || "/logo.png"}
            alt={settings.site_title || "MeroTalent Logo"}
            className="h-9 w-auto object-contain rounded-lg"
          />
          <span className="font-display text-lg font-bold tracking-tight text-[#17162e]">
            {settings.site_title ? settings.site_title.split(" - ")[0] : (
              <>Mero<span className="text-[#071a3d]">talent</span></>
            )}
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative hidden w-full max-w-[300px] lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9996a8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search opportunities"
            placeholder="Search opportunities"
            className="h-10 w-full rounded-xl border border-[#ede5e0] bg-[#faf7f5] pl-9 pr-3 text-xs text-[#292f43] outline-none transition placeholder:text-[#aaa1a5] focus:border-[#fb923c] focus:bg-white focus:ring-4 focus:ring-[#c2410c]/5"
          />
        </form>

        <div className="mx-auto hidden items-center gap-5 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-sm font-semibold text-[#706a72] transition hover:text-[#c2410c]"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Button className="h-10 rounded-xl bg-[#071a3d] px-5 text-xs font-bold text-white shadow-md hover:bg-[#05132d]" asChild>
              <Link to={targetDashboard} className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="h-10 rounded-xl px-3 text-xs font-semibold" asChild>
                <Link to="/company">
                  For organizations
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button variant="ghost" className="h-10 rounded-xl text-xs font-semibold" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button className="h-10 rounded-xl bg-[#c2410c] px-4 text-xs shadow-md shadow-[#c2410c]/15 hover:bg-[#9a3412]" asChild>
                <Link to="/signup">
                  Join free
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e7] text-[#c2410c] md:hidden"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-[#eee5e0] bg-[#fffdfb] px-4 pb-5 pt-4 shadow-xl md:hidden">
          <form onSubmit={submitSearch} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9996a8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search opportunities"
              placeholder="Search jobs, skills or competitions"
              className="h-11 w-full rounded-xl border border-[#ede5e0] bg-[#faf7f5] pl-10 pr-3 text-sm outline-none focus:border-[#fb923c]"
            />
          </form>
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-[#faf7f5] px-3 py-3 text-sm font-semibold text-[#504d5c]"
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-xl" asChild>
              <Link to="/login" onClick={() => setIsOpen(false)}>Log in</Link>
            </Button>
            <Button className="h-11 rounded-xl bg-[#c2410c]" asChild>
              <Link to="/signup" onClick={() => setIsOpen(false)}>Join free</Link>
            </Button>
          </div>
          <div className="mt-3 flex gap-2 text-xs font-semibold text-[#777078]">
            <Link to="/company" className="flex items-center gap-1 rounded-lg px-2 py-1.5">
              <BriefcaseBusiness className="h-3.5 w-3.5" /> Company
            </Link>
            <Link to="/institute" className="flex items-center gap-1 rounded-lg px-2 py-1.5">
              <Building2 className="h-3.5 w-3.5" /> Institution
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;
