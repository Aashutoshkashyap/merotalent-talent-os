import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DiscoveryType = "Jobs" | "Competitions" | "Courses" | "Mentors";

const content: Record<DiscoveryType, {
  href: string;
  icon: typeof BriefcaseBusiness;
  items: Array<{ title: string; subtitle: string; meta: string; tag: string }>;
}> = {
  Jobs: {
    href: "/jobs",
    icon: BriefcaseBusiness,
    items: [
      { title: "Frontend Developer", subtitle: "CloudFactory", meta: "Kathmandu · Hybrid", tag: "Full-time" },
      { title: "Product Design Intern", subtitle: "Leapfrog Technology", meta: "Lalitpur · Hybrid", tag: "Internship" },
      { title: "Growth Associate", subtitle: "Khalti", meta: "Kathmandu · On-site", tag: "Entry level" },
    ],
  },
  Competitions: {
    href: "/competitions",
    icon: Trophy,
    items: [
      { title: "Nepal AI Challenge 2026", subtitle: "Build useful local AI", meta: "Registration open", tag: "Hackathon" },
      { title: "Code Sprint Nepal", subtitle: "Solve. Ship. Stand out.", meta: "Teams of 2–4", tag: "Coding" },
      { title: "Design Innovation Summit", subtitle: "Design for daily life", meta: "Remote submission", tag: "Design" },
    ],
  },
  Courses: {
    href: "/courses",
    icon: BookOpen,
    items: [
      { title: "Full-stack foundations", subtitle: "Project-based learning", meta: "8 weeks · 24 lessons", tag: "Popular" },
      { title: "Product design systems", subtitle: "From audit to handoff", meta: "6 weeks · Mentor led", tag: "New" },
      { title: "Career communication", subtitle: "Tell a stronger story", meta: "3 weeks · Self paced", tag: "Free" },
    ],
  },
  Mentors: {
    href: "/mentorship",
    icon: GraduationCap,
    items: [
      { title: "Priya Shrestha", subtitle: "Design leader", meta: "Portfolio · Career clarity", tag: "4.9" },
      { title: "Anish Karki", subtitle: "Engineering manager", meta: "System design · Interviews", tag: "5.0" },
      { title: "Sujata Rai", subtitle: "Growth strategist", meta: "Marketing · Startups", tag: "4.8" },
    ],
  },
};

const DiscoveryHub = () => {
  const [active, setActive] = useState<DiscoveryType>("Jobs");
  const activeContent = content[active];
  const ActiveIcon = activeContent.icon;

  return (
    <section id="discover" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#625ce7]">
              <Sparkles className="h-3.5 w-3.5" />
              Curated discovery
            </div>
            <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl font-bold tracking-tight text-[#1b1932] sm:text-4xl">
              The next right move, without the endless scroll.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777389] sm:text-base">
              High-signal opportunities across work, learning, competition and mentorship.
            </p>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#f5f4fa] p-1.5">
            {(Object.keys(content) as DiscoveryType[]).map((type) => {
              const Icon = content[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActive(type)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                    active === type
                      ? "bg-white text-[#625ce7] shadow-sm"
                      : "text-[#777389] hover:text-[#4d4960]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {activeContent.items.map((item, index) => (
            <Link
              key={item.title}
              to={activeContent.href}
              className="group relative overflow-hidden rounded-[22px] border border-[#e9e8f0] bg-[#fbfbfd] p-5 transition hover:-translate-y-1 hover:border-[#cbc8f2] hover:bg-white hover:shadow-[0_20px_45px_rgba(58,54,107,0.10)]"
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-[14px] ${["bg-[#efedff] text-[#625ce7]", "bg-[#e4f7f0] text-[#2d8568]", "bg-[#e9e7ff] text-[#5f58cf]"][index]}`}>
                  <ActiveIcon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#686579] shadow-sm">
                  {item.tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-lg font-bold text-[#24213a]">{item.title}</h3>
              <p className="mt-1 text-sm font-medium text-[#777389]">{item.subtitle}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#ecebf2] pt-4 text-[11px] text-[#918d9f]">
                <span className="flex items-center gap-1.5">
                  {active === "Jobs" ? <MapPin className="h-3.5 w-3.5" /> : active === "Mentors" ? <Users className="h-3.5 w-3.5" /> : active === "Competitions" ? <CalendarDays className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                  {item.meta}
                </span>
                <ArrowRight className="h-4 w-4 text-[#bbb8c5] transition group-hover:translate-x-1 group-hover:text-[#625ce7]" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" className="rounded-xl border-[#dddbe9]" asChild>
            <Link to={activeContent.href}>
              Explore all {active.toLowerCase()}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DiscoveryHub;
