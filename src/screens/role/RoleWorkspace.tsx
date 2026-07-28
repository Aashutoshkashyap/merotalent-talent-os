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
    actions: ["Post a job", "Browse talent", "Host a challenge"],
    queue: [
      ["Product Design Lead", "14 matched profiles", "Review talent"],
      ["Frontend Engineer", "9 shortlisted", "Open pipeline"],
      ["Growth Associate", "38 applications", "Start screening"],
    ],
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
    actions: ["Set availability", "View messages", "Add a resource"],
    queue: [
      ["Portfolio review", "Aarav · Today, 2:30 PM", "Open session"],
      ["Career direction", "Sana · Tomorrow, 10:00 AM", "View notes"],
      ["Mock interview", "Rohan · Friday, 4:00 PM", "Prepare"],
    ],
  },
};

const RoleWorkspace = ({ role }: RoleWorkspaceProps) => {
  const { profile, signOut } = useAuth();
  const content = workspaceContent[role];
  const WorkspaceIcon = content.icon;

  return (
    <div className="min-h-screen bg-[#efeffa] p-3 text-[#17162e] sm:p-5 lg:p-7">
      <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1500px] overflow-hidden rounded-[28px] border border-white/70 bg-[#fbfbfe] shadow-[0_30px_80px_rgba(44,41,95,0.14)]">
        <header className="flex h-16 items-center gap-3 border-b border-[#ececf5] px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#655ee8] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Merotalent</span>
          </Link>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8ba5]" />
            <Input
              aria-label="Search workspace"
              placeholder="Search talent, sessions or resources…"
              className="h-10 rounded-xl border-0 bg-[#f1f1f8] pl-10"
            />
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dff5ec] text-sm font-bold text-[#28725a]">
            {profile?.full_name?.charAt(0) || "M"}
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="relative overflow-hidden rounded-[26px] bg-[#625ce7] p-6 text-white sm:p-8">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <WorkspaceIcon className="h-3.5 w-3.5" />
                {content.eyebrow}
              </div>
              <h1 className="max-w-xl font-display text-3xl font-bold leading-tight sm:text-4xl">
                {content.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                {content.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {content.actions.map((action, index) => (
                  <Button
                    key={action}
                    className={
                      index === 0
                        ? "rounded-xl bg-white text-[#4e48ca] hover:bg-white/90"
                        : "rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    }
                  >
                    {action}
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
            <div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border-[40px] border-white/10" />
            <div className="absolute -bottom-24 right-28 h-52 w-52 rounded-full bg-[#7ddbc0]/20 blur-2xl" />
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {content.stats.map(([label, value, note], index) => {
              const StatIcon = [Target, Users, Star, CalendarDays][index];
              return (
                <article
                  key={label}
                  className="rounded-2xl border border-[#ececf5] bg-white p-4 shadow-[0_10px_25px_rgba(56,53,104,0.05)] sm:p-5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0effe] text-[#625ce7]">
                      <StatIcon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium text-[#7c7892]">{note}</span>
                  </div>
                  <p className="text-2xl font-bold sm:text-3xl">{value}</p>
                  <p className="mt-1 text-xs text-[#7c7892] sm:text-sm">{label}</p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <article className="rounded-[24px] border border-[#ececf5] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Focus queue</h2>
                  <p className="mt-1 text-sm text-[#8a879e]">What deserves your attention next</p>
                </div>
                <Button variant="ghost" size="sm">View all</Button>
              </div>
              <div className="space-y-2">
                {content.queue.map(([title, detail, action]) => (
                  <button
                    key={title}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#f8f8fc] p-4 text-left transition hover:border-[#dcdaf8] hover:bg-[#f4f3ff]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#625ce7] shadow-sm">
                      {role === "company" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#8a879e]">{detail}</span>
                    </span>
                    <span className="hidden text-xs font-semibold text-[#625ce7] sm:block">{action}</span>
                    <ChevronRight className="h-4 w-4 text-[#aaa8b9] transition group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] bg-[#18172f] p-6 text-white">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
                <MessageCircle className="h-5 w-5 text-[#8be3c9]" />
              </div>
              <h2 className="mt-8 font-display text-2xl font-bold">One good follow-up changes everything.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                You have 4 conversations waiting for a response. Keep the momentum warm.
              </p>
              <Button className="mt-8 w-full rounded-xl bg-[#8be3c9] text-[#17162e] hover:bg-[#76d8bb]">
                Open messages
              </Button>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default RoleWorkspace;
