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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/jobs?search=${encodeURIComponent(query)}` : "/jobs");
    setIsOpen(false);
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#ecebf3] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Merotalent home">
          <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#625ce7] text-white shadow-lg shadow-[#625ce7]/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#17162e]">
            Mero<span className="text-[#625ce7]">talent</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative hidden w-full max-w-[300px] lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9996a8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search opportunities"
            placeholder="Search opportunities"
            className="h-10 w-full rounded-xl border border-[#e5e4ee] bg-[#f8f8fb] pl-9 pr-3 text-xs outline-none transition placeholder:text-[#aaa7b6] focus:border-[#aaa6ef] focus:bg-white focus:ring-4 focus:ring-[#625ce7]/5"
          />
        </form>

        <div className="mx-auto hidden items-center gap-5 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-xs font-semibold text-[#686579] transition hover:text-[#625ce7]"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" className="h-10 rounded-xl px-3 text-xs font-semibold" asChild>
            <Link to="/company">
              For organizations
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" className="h-10 rounded-xl text-xs font-semibold" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button className="h-10 rounded-xl bg-[#625ce7] px-4 text-xs shadow-md shadow-[#625ce7]/15 hover:bg-[#554fd2]" asChild>
            <Link to="/signup">
              Join free
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f4f3f9] text-[#36334e] md:hidden"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-[#efeff4] bg-white px-4 pb-5 pt-4 shadow-xl md:hidden">
          <form onSubmit={submitSearch} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9996a8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search opportunities"
              placeholder="Search jobs, skills or competitions"
              className="h-11 w-full rounded-xl border border-[#e6e5ee] bg-[#f8f8fb] pl-10 pr-3 text-sm outline-none focus:border-[#aaa6ef]"
            />
          </form>
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-[#f8f8fb] px-3 py-3 text-sm font-semibold text-[#504d63]"
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-xl" asChild>
              <Link to="/login" onClick={() => setIsOpen(false)}>Log in</Link>
            </Button>
            <Button className="h-11 rounded-xl bg-[#625ce7]" asChild>
              <Link to="/signup" onClick={() => setIsOpen(false)}>Join free</Link>
            </Button>
          </div>
          <div className="mt-3 flex gap-2 text-[11px] font-semibold text-[#777489]">
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
