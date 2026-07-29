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
    description: "Turn learning and real work into proof that opens doors.",
    icon: GraduationCap,
    href: "/signup",
    cta: "Build your profile",
    tone: "bg-[#c2410c] text-white border-[#c2410c]",
    iconTone: "bg-white/15 text-white",
  },
  {
    title: "Mentor",
    description: "Guide focused conversations and make progress visible.",
    icon: UserRoundSearch,
    href: "/signup",
    cta: "Become a mentor",
    tone: "bg-[#e8f7f1] text-[#1c4e40] border-[#d8eee6]",
    iconTone: "bg-white/60 text-[#2e8066]",
  },
  {
    title: "Company",
    description: "Hire from visible skills and run a cleaner talent pipeline.",
    icon: BriefcaseBusiness,
    href: "/signup",
    cta: "Find proven talent",
    tone: "bg-[#fff3ec] text-[#7c2d12] border-[#f7dfd1]",
    iconTone: "bg-white/70 text-[#c2410c]",
  },
  {
    title: "Institution",
    description: "Publish programs and strengthen student career outcomes.",
    icon: Building2,
    href: "/signup",
    cta: "Enable your campus",
    tone: "bg-white text-[#31364a] border-[#efe8e3]",
    iconTone: "bg-white/70 text-[#c2410c]",
  },
];

const RolePathways = () => (
  <section className="bg-[#f4dfd4] px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
    <div className="mx-auto max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] p-5 shadow-[0_26px_70px_rgba(99,55,29,0.09)] sm:rounded-[32px] sm:p-7 lg:p-9">
      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.7fr] lg:items-end">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#c2410c]">Four focused workspaces</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-black tracking-[-0.035em] text-[#172039] sm:text-4xl">
            Your side of the talent story.
          </h2>
          <p className="mt-3 max-w-md text-xs leading-5 text-[#817980] sm:text-sm">
            The right actions and signals for the role you play.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.title}
                to={`${role.href}?role=${role.title.toLowerCase()}`}
                className={`group flex min-h-[230px] flex-col rounded-[22px] border p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(85,52,32,0.10)] ${role.tone}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-[13px] ${role.iconTone}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-[9px] font-black opacity-45">0{index + 1}</span>
                </div>
                <h3 className="mt-8 font-display text-xl font-black">{role.title}</h3>
                <p className="mt-2 text-[11px] leading-5 opacity-70">{role.description}</p>
                <span className="mt-auto flex items-center gap-1.5 pt-5 text-[9px] font-black">
                  {role.cta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  </section>
);

export default RolePathways;
