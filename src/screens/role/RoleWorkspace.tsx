import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  LogOut,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Target,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoleWorkspaceProps {
  role: "company" | "mentor";
}

const workspaceContent = {
  company: {
    eyebrow: "Recruiter workspace",
    title: "Build a team around proof, not paperwork.",
    description:
      "Review verified skills, manage your hiring pipeline and turn challenges into high-signal recruiting moments.",
    icon: BriefcaseBusiness,
    stats: [
      ["Active roles", "08", "+2 this month"],
      ["Matched talent", "128", "24 new"],
      ["Shortlisted", "31", "76% fit"],
      ["Interviews", "12", "This week"],
    ],
    actions: [
      { label: "Browse job board", href: "/jobs" },
      { label: "Explore competitions", href: "/competitions" },
      { label: "View institutes", href: "/institutes" },
    ],
    queue: [
      {
        title: "Product Design Lead",
        detail: "14 matched profiles",
        action: "Open job board",
        href: "/jobs",
      },
      {
        title: "Frontend Engineer",
        detail: "9 shortlisted",
        action: "Explore challenges",
        href: "/competitions",
      },
      {
        title: "Growth Associate",
        detail: "38 applications",
        action: "View institutes",
        href: "/institutes",
      },
    ],
    viewAllHref: "/jobs",
  },
  mentor: {
    eyebrow: "Mentor workspace",
    title: "Make every conversation move a career forward.",
    description:
      "Keep sessions, mentee goals and follow-ups in one calm workspace built for meaningful progress.",
    icon: UserRoundSearch,
    stats: [
      ["Upcoming", "06", "3 this week"],
      ["Active mentees", "18", "+4 this month"],
      ["Mentor rating", "4.9", "82 reviews"],
      ["Hours guided", "124", "+8 this week"],
    ],
    actions: [
      { label: "Browse mentor directory", href: "/mentorship" },
      { label: "View messages", href: "/dashboard/messages" },
      { label: "Explore learning", href: "/courses" },
    ],
    queue: [
      {
        title: "Portfolio review",
        detail: "Aarav · Today, 2:30 PM",
        action: "Open sessions",
        href: "/dashboard/sessions",
      },
      {
        title: "Career direction",
        detail: "Sana · Tomorrow, 10:00 AM",
        action: "Open messages",
        href: "/dashboard/messages",
      },
      {
        title: "Mock interview",
        detail: "Rohan · Friday, 4:00 PM",
        action: "View sessions",
        href: "/dashboard/sessions",
      },
    ],
    viewAllHref: "/dashboard/sessions",
  },
};

const RoleWorkspace = ({ role }: RoleWorkspaceProps) => {
  const { profile, signOut } = useAuth();
  const content = workspaceContent[role];
  const WorkspaceIcon = content.icon;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3ebe5] p-3 text-[#17162e] sm:p-5 lg:p-7">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full border border-[#c2410c]/20" />
      <div className="pointer-events-none absolute -right-16 top-16 h-40 w-40 rounded-full bg-[#ffd9bd]/55 blur-3xl" />
      <div className="relative mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1500px] overflow-hidden rounded-[30px] border border-white/80 bg-[#fffaf7] shadow-[0_32px_90px_rgba(79,48,30,0.14)]">
        <header className="flex h-16 items-center gap-3 border-b border-[#f0e3da] bg-white/90 px-4 backdrop-blur sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c2410c] text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Merotalent</span>
          </Link>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8ba5]" />
            <Input
              aria-label="Search workspace"
              placeholder="Search talent, sessions or resources…"
              className="h-10 rounded-xl border border-[#f0e3da] bg-[#fff8f3] pl-10 shadow-none"
            />
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dff5ec] text-sm font-bold text-[#28725a]">
            {profile?.full_name?.charAt(0) || "M"}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          <section className="grid items-stretch gap-4 xl:grid-cols-[1fr_280px]">
            <article className="relative overflow-hidden rounded-[26px] border border-[#f0e3da] bg-white p-5 shadow-[0_18px_45px_rgba(79,48,30,0.07)] sm:p-7">
              <div className="mb-7 flex flex-wrap items-center gap-3 border-b border-[#f3e8e1] pb-5">
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#fff1e8] px-3 py-2 text-xs font-semibold text-[#c84f08]">
                  <WorkspaceIcon className="h-3.5 w-3.5" />
                  {content.eyebrow}
                </div>
                <div className="hidden h-6 w-px bg-[#eadfd7] sm:block" />
                <span className="text-xs font-medium text-[#8d8179]">On track</span>
                <span className="ml-auto text-xs text-[#8d8179]">Updated moments ago</span>
              </div>
              <h1 className="max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
                {content.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7f746d] sm:text-base">
                {content.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {content.actions.map((action, index) => (
                  <Button
                    key={action.label}
                    asChild
                    className={
                      index === 0
                        ? "rounded-xl bg-[#c2410c] text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)] hover:bg-[#9a3412]"
                        : "rounded-xl border border-[#eadfd7] bg-white text-[#17162e] hover:border-[#fdba74] hover:bg-[#fff8f3]"
                    }
                  >
                    <Link to={action.href}>
                      {action.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border-[24px] border-[#fff1e8]" />
            </article>

            <article className="relative overflow-hidden rounded-[26px] bg-[#c2410c] p-6 text-white shadow-[0_20px_45px_rgba(249,115,22,0.22)] xl:-rotate-1">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="mt-7 font-display text-2xl font-bold">Collaborate and share</h2>
              <p className="mt-2 max-w-[210px] text-sm leading-5 text-white/70">
                Move the right people forward without losing the conversation.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/20 pt-5">
                <div><strong className="block text-2xl">14</strong><span className="text-xs text-white/65">Done</span></div>
                <div><strong className="block text-2xl">45</strong><span className="text-xs text-white/65">In progress</span></div>
              </div>
              <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" />
            </article>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {content.stats.map(([label, value, note], index) => {
              const StatIcon = [Target, Users, Star, CalendarDays][index];
              return (
                <article
                  key={label}
                  className="rounded-[22px] border border-[#f0e3da] bg-white p-4 shadow-[0_12px_32px_rgba(79,48,30,0.06)] sm:p-5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1e8] text-[#c2410c]">
                      <StatIcon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium text-[#8d8179]">{note}</span>
                  </div>
                  <p className="text-2xl font-bold sm:text-3xl">{value}</p>
                  <p className="mt-1 text-xs text-[#8d8179] sm:text-sm">{label}</p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <article className="rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Focus queue</h2>
                  <p className="mt-1 text-sm text-[#8d8179]">What deserves your attention next</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={content.viewAllHref}>View all</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {content.queue.map((item) => (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#fff8f3] p-4 text-left transition hover:border-[#fdba74] hover:bg-[#fff2e8]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#c2410c] shadow-sm">
                      {role === "company" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#8d8179]">{item.detail}</span>
                    </span>
                    <span className="hidden text-xs font-semibold text-[#c2410c] sm:block">{item.action}</span>
                    <ChevronRight className="h-4 w-4 text-[#aaa8b9] transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[24px] bg-[#17162e] p-6 text-white shadow-[0_18px_40px_rgba(23,22,46,0.18)]">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#8be3c9]/15">
                <MessageCircle className="h-5 w-5 text-[#8be3c9]" />
              </div>
              <h2 className="mt-8 font-display text-2xl font-bold">One good follow-up changes everything.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                You have 4 conversations waiting for a response. Keep the momentum warm.
              </p>
              <Button asChild className="mt-8 w-full rounded-xl bg-[#8be3c9] text-[#17162e] hover:bg-[#76d8bb]">
                <Link to="/dashboard/messages">Open messages</Link>
              </Button>
              <div className="absolute -bottom-16 -right-14 h-40 w-40 rounded-full border-[22px] border-white/5" />
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default RoleWorkspace;
