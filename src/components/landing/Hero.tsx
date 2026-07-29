import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Compass,
  GraduationCap,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  Trophy,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    title: "Find your fit",
    copy: "Roles matched to your proof",
    icon: BriefcaseBusiness,
    href: "/jobs",
    tone: "bg-[#fff3ec] text-[#c2410c]",
  },
  {
    title: "Show your skills",
    copy: "Live challenges this week",
    icon: Trophy,
    href: "/competitions",
    tone: "bg-[#e9f8f2] text-[#238366]",
  },
  {
    title: "Grow with guidance",
    copy: "Meet a mentor who gets it",
    icon: UserRoundSearch,
    href: "/mentorship",
    tone: "bg-[#fff8de] text-[#a66b00]",
  },
];

const taskRows = [
  { label: "Complete portfolio story", date: "Today", progress: 78 },
  { label: "Practice product interview", date: "Tomorrow", progress: 52 },
  { label: "Submit AI challenge concept", date: "04 Aug", progress: 24 },
];

const Hero = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const search = query.trim();
    navigate(search ? `/jobs?search=${encodeURIComponent(search)}` : "/jobs");
  };

  return (
    <section className="relative w-full overflow-hidden bg-white pb-12 pt-[68px] sm:pb-16">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full overflow-hidden border-y border-[#eee7e2] bg-[#fffdfb]"
      >
        <header className="flex h-[62px] items-center gap-4 border-b border-[#f0ebe7] px-4 sm:px-6 lg:pl-[104px] lg:pr-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#2563eb] text-white shadow-sm shadow-[#2563eb]/25">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-black text-[#172039]">Talent OS</span>
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <span className="flex items-center gap-1.5 border-b-2 border-[#2563eb] py-5 text-xs font-black text-[#172039]">
              <LayoutGrid className="h-3.5 w-3.5" />
              My space
            </span>
            <Link to="/jobs" className="flex items-center gap-1.5 text-xs font-bold text-[#8d8793] transition hover:text-[#2563eb]">
              <Compass className="h-3.5 w-3.5" />
              Discover
            </Link>
            <Link to="/mentorship" className="flex items-center gap-1.5 text-xs font-bold text-[#8d8793] transition hover:text-[#2563eb]">
              <Users className="h-3.5 w-3.5" />
              Community
            </Link>
          </div>
          <form onSubmit={submitSearch} className="relative ml-auto hidden w-full max-w-[300px] sm:block">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a29aa1]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search opportunities"
              placeholder="Search or type a skill"
              className="h-11 w-full rounded-xl border border-[#eee8e4] bg-[#faf7f5] pl-9 pr-3 text-xs text-[#2b3247] outline-none transition focus:border-[#fdba74] focus:bg-white"
            />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link to="/login" className="hidden text-xs font-bold text-[#696575] sm:block">Sign in</Link>
            <Button className="h-11 rounded-xl bg-[#c2410c] px-4 text-xs font-bold shadow-md shadow-[#c2410c]/15 hover:bg-[#9a3412]" asChild>
              <Link to="/signup">Join free <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </header>

        <aside
          aria-label="Quick navigation"
          className="absolute bottom-7 left-5 top-[86px] z-10 hidden w-[58px] flex-col items-center rounded-[22px] bg-[#071a3d] py-4 text-white shadow-[0_18px_38px_rgba(7,26,61,0.3)] ring-1 ring-inset ring-[#2563eb]/30 lg:flex"
        >
          <Link
            to="/dashboard"
            aria-label="Open dashboard"
            className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#2563eb] text-white shadow-[0_8px_18px_rgba(37,99,235,0.38)] transition hover:-translate-y-0.5 hover:bg-[#3b82f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <div className="mt-4 flex flex-1 flex-col items-center gap-1.5">
            {[Compass, Trophy, BookOpen, CalendarDays, MessageCircle, Bell].map((Icon, index) => (
              <Link
                key={index}
                to={["/jobs", "/competitions", "/courses", "/mentorship", "/login", "/login"][index]}
                aria-label={["Jobs", "Competitions", "Courses", "Mentorship", "Messages", "Notifications"][index]}
                className="grid h-9 w-9 place-items-center rounded-xl text-[#b8cff1] transition hover:-translate-y-0.5 hover:bg-[#2563eb] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
          <Link
            to="/signup"
            aria-label="Create account"
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#dbeafe] text-[#1d4ed8] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <CircleUserRound className="h-4 w-4" />
          </Link>
        </aside>

        <div className="p-3 sm:p-5 lg:pl-[104px] lg:pr-7 lg:pt-6">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[1.05fr_1.55fr]">
            <div className="flex min-h-[210px] flex-col justify-center rounded-[22px] bg-[#fffaf7] p-5 sm:p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#fed7aa] bg-white px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#c2410c]">
                <Sparkles className="h-3 w-3" />
                Built for ambitious talent
              </span>
              <h1 className="mt-4 max-w-[560px] text-balance font-display text-[36px] font-black leading-[1.02] tracking-[-0.04em] text-[#172039] sm:text-[48px] lg:text-[52px]">
                Hi, future you. What will you <span className="text-[#c2410c]">prove today?</span>
              </h1>
              <p className="mt-3 max-w-md text-xs leading-5 text-[#7b7480] sm:text-xs">
                Turn learning, challenges and real work into opportunities people can trust.
              </p>
            </div>

            <div className="grid min-w-0 max-w-full snap-x snap-mandatory auto-cols-[minmax(220px,82vw)] grid-flow-col gap-2.5 overflow-x-auto pb-2 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + index * 0.08 }}
                    className="snap-start"
                  >
                    <Link
                      to={action.href}
                      className="group flex h-full min-h-[210px] flex-col rounded-[22px] border border-[#f0ebe7] bg-white p-3 transition hover:-translate-y-1 hover:border-[#fdba74] hover:shadow-[0_18px_35px_rgba(85,52,32,0.09)] sm:p-4"
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-[13px] sm:h-12 sm:w-12 ${action.tone}`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                      <h2 className="mt-auto text-xs font-black leading-tight text-[#172039] sm:text-sm">{action.title}</h2>
                      <p className="mt-1 hidden text-xs leading-5 text-[#9a9299] sm:block">{action.copy}</p>
                      <ChevronRight className="mt-2 h-3.5 w-3.5 text-[#c1b8bb] transition group-hover:translate-x-1 group-hover:text-[#c2410c]" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-12">
            <div className="min-w-0 rounded-[22px] border border-[#f0ebe7] bg-white p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#172039]">Opportunity inbox</h2>
                <Link to="/jobs" className="text-xs font-bold text-[#c2410c]">View all</Link>
              </div>
              <div className="mt-3 rounded-[16px] border border-[#f3e5dc] bg-[#fffaf7] p-3 shadow-[0_9px_20px_rgba(85,52,32,0.06)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0e7] text-[#c2410c]">
                    <BriefcaseBusiness className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-black text-[#252b40]">Product Design Intern</p>
                      <span className="h-2 w-2 rounded-full bg-[#56c7a3]" />
                    </div>
                    <p className="mt-0.5 text-xs text-[#9a9299]">Leapfrog Technology · 94% fit</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#746e79]">
                      <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />Lalitpur</span>
                      <span className="flex items-center gap-1"><Clock3 className="h-2.5 w-2.5" />2h ago</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-[14px] bg-[#faf8f6] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e8f7f1] text-[#268267]">
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#34394c]">A mentor replied to your question</p>
                  <p className="mt-0.5 truncate text-xs text-[#a0999f]">“Your case study already has a strong hook…”</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[22px] border border-[#f0ebe7] bg-white p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#172039]">Featured challenge</h2>
                <span className="rounded-full bg-[#fff0e7] px-2 py-1 text-xs font-black text-[#c2410c]">8 days left</span>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#c2410c] text-white shadow-lg shadow-[#c2410c]/20">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black leading-tight text-[#172039]">Nepal AI Impact Challenge</p>
                  <p className="mt-1 text-xs text-[#8f8791]">Build one useful tool for everyday Nepal.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[14px] bg-[#faf8f6] px-3 py-2.5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#a0989f]">Prize pool</p>
                  <p className="mt-0.5 text-xs font-black text-[#172039]">NPR 500,000</p>
                </div>
                <div className="flex -space-x-1.5">
                  {["A", "S", "N"].map((initial, index) => (
                    <span key={initial} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white text-xs font-black ${["bg-[#ffd9c2] text-[#9a3f08]", "bg-[#dff5ed] text-[#28785f]", "bg-[#f4e6d9] text-[#685445]"][index]}`}>{initial}</span>
                  ))}
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#172039] text-xs font-black text-white">+2K</span>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[22px] border border-[#f0ebe7] bg-white p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#172039]">Your week</h2>
                <div className="flex gap-1">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#faf8f6] text-xs text-[#948d95]">‹</span>
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#faf8f6] text-xs text-[#948d95]">›</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <div key={`${day}-${index}`}>
                    <p className="text-xs text-[#aaa3aa]">{day}</p>
                    <span className={`mx-auto mt-1 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index === 2 ? "bg-[#c2410c] text-white" : "text-[#5d5864]"}`}>
                      {[27, 28, 29, 30, 31, 1, 2][index]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 border-t border-dashed border-[#ddd4d0] pt-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e8f7f1] text-[#268267]"><Users className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#34394c]">Portfolio review</p>
                    <p className="text-xs text-[#a0999f]">10:30 – 11:00 · Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-dashed border-[#ddd4d0] pt-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fff0e7] text-[#c2410c]"><GraduationCap className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#34394c]">Mentor session</p>
                    <p className="text-xs text-[#a0999f]">16:00 – 16:30 · Career clarity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-12">
            <div className="min-w-0 rounded-[22px] border border-[#f0ebe7] bg-white p-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#172039]">Today&apos;s momentum</h2>
                  <span className="rounded-full bg-[#e8f7f1] px-2 py-1 text-xs font-black text-[#268267]">3 actions</span>
                </div>
                <Link to="/signup" className="text-xs font-bold text-[#c2410c]">Open workspace</Link>
              </div>
              <div className="mt-3 divide-y divide-[#f0ebe7]">
                {taskRows.map((task) => (
                  <div key={task.label} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[1.3fr_0.5fr_1fr]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-lg border border-[#eadfd9] text-[#c2410c]"><Check className="h-3 w-3" /></span>
                      <p className="truncate text-xs font-bold text-[#3b3f51]">{task.label}</p>
                    </div>
                    <p className="hidden text-xs text-[#9b949b] sm:block">{task.date}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#746e79]">{task.progress}%</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1ece9]">
                        <span className="block h-full rounded-full bg-[#c2410c]" style={{ width: `${task.progress}%` }} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/signup"
              className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-[22px] bg-[#c2410c] p-5 text-white shadow-[0_20px_38px_rgba(249,115,22,0.24)] lg:col-span-3"
            >
              <div className="absolute -right-9 -top-9 h-32 w-32 rounded-full border-[22px] border-white/10" />
              <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/15"><Target className="h-5 w-5" /></span>
              <h2 className="mt-auto max-w-[190px] text-xl font-black leading-tight">Make your next move visible.</h2>
              <span className="mt-3 flex items-center gap-1.5 text-xs font-black text-white/80">
                Build your proof profile <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>

            <div className="grid min-w-0 gap-3 lg:col-span-3">
              <div className="rounded-[22px] border border-[#f0ebe7] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-12 w-12 place-items-center rounded-full bg-[conic-gradient(#56c7a3_0_82%,#f0ebe7_82%_100%)]">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-[#172039]">82%</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#56a98e]">Talent profile</p>
                    <p className="mt-0.5 text-xs font-black text-[#172039]">Ready to be found</p>
                    <p className="mt-1 text-xs text-[#9b949b]">Add one case study to stand out.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] border border-[#f0ebe7] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#172039] text-xs font-black text-white">PS</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#172039]">Priya is available</p>
                    <p className="mt-0.5 text-xs text-[#9b949b]">Design leadership · 4:30 PM</p>
                  </div>
                  <Link to="/mentorship" className="rounded-lg bg-[#fff0e7] px-2 py-1.5 text-xs font-black text-[#c2410c]">Book</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative mt-4 flex w-full items-center justify-center gap-5 text-xs font-bold text-[#8c6653] sm:gap-8">
        <span>10K+ learners</span>
        <span className="h-1 w-1 rounded-full bg-[#c2410c]" />
        <span>350+ opportunities</span>
        <span className="h-1 w-1 rounded-full bg-[#56c7a3]" />
        <span>Built in Nepal</span>
      </div>
    </section>
  );
};

export default Hero;
