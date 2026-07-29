import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

type DiscoveryType = "Jobs" | "Competitions" | "Courses" | "Mentors";

const content: Record<DiscoveryType, {
  href: string;
  icon: typeof BriefcaseBusiness;
  metric: string;
  metricLabel: string;
  items: Array<{ title: string; subtitle: string; meta: string; tag: string }>;
}> = {
  Jobs: {
    href: "/jobs",
    icon: BriefcaseBusiness,
    metric: "84%",
    metricLabel: "average profile match",
    items: [
      { title: "Frontend Developer", subtitle: "CloudFactory", meta: "Kathmandu · Hybrid", tag: "Full-time" },
      { title: "Product Design Intern", subtitle: "Leapfrog Technology", meta: "Lalitpur · Hybrid", tag: "Internship" },
      { title: "Growth Associate", subtitle: "Khalti", meta: "Kathmandu · On-site", tag: "Entry level" },
    ],
  },
  Competitions: {
    href: "/competitions",
    icon: Trophy,
    metric: "5L+",
    metricLabel: "in active prize pools",
    items: [
      { title: "Nepal AI Challenge 2026", subtitle: "Build useful local AI", meta: "Registration open", tag: "Hackathon" },
      { title: "Code Sprint Nepal", subtitle: "Solve. Ship. Stand out.", meta: "Teams of 2–4", tag: "Coding" },
      { title: "Design Innovation Summit", subtitle: "Design for daily life", meta: "Remote submission", tag: "Design" },
    ],
  },
  Courses: {
    href: "/courses",
    icon: BookOpen,
    metric: "68",
    metricLabel: "skill tracks to explore",
    items: [
      { title: "Full-stack foundations", subtitle: "Project-based learning", meta: "8 weeks · 24 lessons", tag: "Popular" },
      { title: "Product design systems", subtitle: "From audit to handoff", meta: "6 weeks · Mentor led", tag: "New" },
      { title: "Career communication", subtitle: "Tell a stronger story", meta: "3 weeks · Self paced", tag: "Free" },
    ],
  },
  Mentors: {
    href: "/mentorship",
    icon: GraduationCap,
    metric: "4.9",
    metricLabel: "average session rating",
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
    <section id="discover" className="w-full bg-white py-6 sm:py-8">
      <div className="w-full overflow-hidden border-y border-[#eee7e2] bg-[#fffdfb]">
        <div className="flex flex-col gap-5 border-b border-[#f0ebe7] p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between lg:px-9">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#c2410c]">
              <Sparkles className="h-3.5 w-3.5" />
              Curated for forward motion
            </div>
            <h2 className="mt-3 text-balance font-display text-3xl font-black tracking-[-0.035em] text-[#172039] sm:text-4xl">
              A cleaner way to choose what comes next.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-[#817980] sm:text-sm">
              Browse high-signal work, challenges, learning and guidance without the noisy feed.
            </p>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[14px] border border-[#eee7e2] bg-[#faf7f5] p-1">
            {(Object.keys(content) as DiscoveryType[]).map((type) => {
              const Icon = content[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActive(type)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-black transition sm:px-4 ${
                    active === type
                      ? "bg-[#c2410c] text-white shadow-md shadow-[#c2410c]/15"
                      : "text-[#807882] hover:bg-white hover:text-[#3e4253]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-12 lg:p-7">
          <Link
            to={activeContent.href}
            className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[22px] bg-[#c2410c] p-5 text-white shadow-[0_18px_34px_rgba(249,115,22,0.20)] sm:p-6 lg:col-span-4"
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[34px] border-white/10" />
            <div className="absolute -bottom-16 right-14 h-36 w-36 rounded-full bg-[#d9600a] opacity-45" />
            <span className="relative grid h-12 w-12 place-items-center rounded-[15px] bg-white/15">
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div className="relative mt-auto">
              <p className="text-5xl font-black tracking-[-0.06em]">{activeContent.metric}</p>
              <p className="mt-1 text-xs font-bold text-white/65">{activeContent.metricLabel}</p>
              <h3 className="mt-5 max-w-[250px] text-xl font-black leading-tight">
                Find a next step that fits the work you want to do.
              </h3>
              <span className="mt-5 flex items-center gap-2 text-xs font-black">
                Explore {active.toLowerCase()}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            {activeContent.items.map((item, index) => (
              <Link
                key={item.title}
                to={activeContent.href}
                className={`group flex min-h-[148px] flex-col rounded-[22px] border border-[#f0e9e4] p-4 transition hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_14px_28px_rgba(85,52,32,0.08)] sm:p-5 ${
                  index === 0 ? "bg-[#fffaf7] sm:col-span-2" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-[13px] ${
                    index === 0 ? "bg-[#fff0e7] text-[#c2410c]" : index === 1 ? "bg-[#e8f7f1] text-[#268267]" : "bg-[#fff7d8] text-[#a46a00]"
                  }`}>
                    <ActiveIcon className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-[#eee7e2] bg-white px-2.5 py-1 text-xs font-black text-[#6f6973]">
                    {item.tag}
                  </span>
                </div>
                <div className={index === 0 ? "mt-5 sm:flex sm:items-end sm:justify-between" : "mt-5"}>
                  <div>
                    <h3 className="text-sm font-black text-[#20273c] sm:text-base">{item.title}</h3>
                    <p className="mt-1 text-xs font-medium text-[#8f8790]">{item.subtitle}</p>
                  </div>
                  <div className={`${index === 0 ? "mt-4 sm:mt-0" : "mt-4"} flex items-center justify-between gap-4 border-t border-[#f1ebe7] pt-3 text-xs text-[#8f8790]`}>
                    <span className="flex items-center gap-1.5">
                      {active === "Jobs" ? <MapPin className="h-3 w-3" /> : active === "Mentors" ? <Users className="h-3 w-3" /> : active === "Competitions" ? <CalendarDays className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                      {item.meta}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#c1b9bc] transition group-hover:translate-x-1 group-hover:text-[#c2410c]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid border-t border-[#f0ebe7] sm:grid-cols-3">
          {[
            ["Verified signals", "Skills backed by visible work"],
            ["Human guidance", "Mentors for the decisions that matter"],
            ["Less noise", "A focused path from discovery to action"],
          ].map(([title, copy], index) => (
            <div key={title} className={`flex items-start gap-3 px-5 py-4 sm:px-7 ${index > 0 ? "border-t border-[#f0ebe7] sm:border-l sm:border-t-0" : ""}`}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e8f7f1] text-[#268267]">
                <Check className="h-3 w-3" />
              </span>
              <div>
                <p className="text-xs font-black text-[#272d41]">{title}</p>
                <p className="mt-0.5 text-xs leading-4 text-[#918990]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscoveryHub;
