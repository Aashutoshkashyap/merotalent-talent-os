import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  UserRoundSearch,
} from "lucide-react";

const roles = [
  {
    title: "Talent",
    description: "Turn projects, challenges and learning into a profile that proves your ability.",
    icon: GraduationCap,
    href: "/signup",
    cta: "Build your profile",
    tone: "bg-[#f97316] text-white",
    iconTone: "bg-white/15 text-white",
  },
  {
    title: "Mentor",
    description: "Guide focused conversations, share resources and make progress visible.",
    icon: UserRoundSearch,
    href: "/signup",
    cta: "Become a mentor",
    tone: "bg-[#e2f6ef] text-[#1c4e40]",
    iconTone: "bg-white/60 text-[#2e8066]",
  },
  {
    title: "Company",
    description: "Hire from verified skills, host challenges and manage a cleaner talent pipeline.",
    icon: BriefcaseBusiness,
    href: "/signup",
    cta: "Find proven talent",
    tone: "bg-[#ffedd5] text-[#7c2d12]",
    iconTone: "bg-white/70 text-[#f97316]",
  },
  {
    title: "Institution",
    description: "Create programs, publish opportunities and strengthen student outcomes.",
    icon: Building2,
    href: "/signup",
    cta: "Enable your campus",
    tone: "bg-[#fff7ed] text-[#5b2c12]",
    iconTone: "bg-white/70 text-[#f97316]",
  },
];

const RolePathways = () => (
  <section className="bg-[#f8f8fc] py-16 sm:py-20">
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f97316]">One ecosystem, four workspaces</p>
        <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-[#1b1932] sm:text-4xl">
          A useful home for every side of talent.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#777389] sm:text-base">
          Each account sees the tools, signals and next actions that matter to its role.
        </p>
      </div>

      <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role, index) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.title}
              to={`${role.href}?role=${role.title.toLowerCase()}`}
              className={`group flex min-h-[260px] flex-col rounded-[24px] p-5 transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(54,50,98,0.11)] sm:p-6 ${role.tone}`}
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-[15px] ${role.iconTone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold opacity-50">0{index + 1}</span>
              </div>
              <h3 className="mt-10 font-display text-2xl font-bold">{role.title}</h3>
              <p className="mt-2 text-sm leading-6 opacity-70">{role.description}</p>
              <span className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-bold">
                {role.cta}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

export default RolePathways;
