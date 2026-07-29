import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Ellipsis,
  Flame,
  Medal,
  MessageCircle,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const surface =
  "rounded-[24px] border border-[#f0e2d7] bg-white shadow-[0_18px_55px_rgba(69,42,21,0.065)]";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
};

const taskRows = [
  {
    title: "Polish your talent profile",
    meta: "Portfolio · 20 min",
    progress: 82,
    icon: CheckCircle2,
    tone: "bg-[#fff0e4] text-[#c2410c]",
  },
  {
    title: "Prepare AI challenge brief",
    meta: "Competition · Due Friday",
    progress: 55,
    icon: Trophy,
    tone: "bg-[#e8faf4] text-[#30987c]",
  },
  {
    title: "Complete product design lesson",
    meta: "Learning · 35 min",
    progress: 34,
    icon: BookOpen,
    tone: "bg-[#f3ecff] text-[#7758b5]",
  },
];

const ProgressRing = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0">
        <svg className="-rotate-90" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r={radius} fill="none" stroke="#f2ebe5" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#19172b]">
          {value}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#a098a3]">Progress</p>
        <p className="truncate text-sm font-extrabold text-[#19172b]">{label}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Talent";

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-3 sm:space-y-5"
    >
      <motion.section variants={rise} className="grid gap-4 xl:grid-cols-12">
        <div className={`${surface} relative overflow-hidden p-5 sm:p-6 xl:col-span-9`}>
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#fff0e5]" />
          <div className="pointer-events-none absolute right-8 top-7 hidden h-28 w-28 rotate-6 rounded-[30px] border border-[#ffd9bd] bg-[#fff8f2] sm:block">
            <div className="absolute left-5 top-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c2410c] text-white shadow-[0_12px_28px_rgba(249,115,22,0.25)]">
              <Target className="h-6 w-6" />
            </div>
            <span className="absolute bottom-3 right-3 h-3 w-3 rounded-full bg-[#68c9ad]" />
          </div>

          <div className="relative max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9c949e]">
              <span className="rounded-full bg-[#fff0e5] px-3 py-1.5 text-[#c2410c]">Wednesday</span>
              <span>29 July 2026</span>
            </div>
            <h1 className="max-w-xl text-[2rem] font-black leading-[1.04] tracking-[-0.055em] text-[#19172b] sm:text-[2.6rem]">
              Hi, {firstName}.
              <br />
              What will you <span className="text-[#c2410c]">achieve today?</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#77717f]">
              Your competitions, learning and mentor plans are organised into one focused workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button
                asChild
                className="h-10 rounded-xl bg-[#c2410c] px-4 text-xs text-white shadow-[0_10px_22px_rgba(249,115,22,0.22)] hover:bg-[#ea690c]"
              >
                <Link to="/dashboard/competitions">
                  Explore opportunities <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-[#eadbd0] bg-white px-4 text-xs hover:border-[#c2410c]/50 hover:bg-[#fff6ef]"
              >
                <Link to="/dashboard/profile">Complete profile</Link>
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`${surface} relative overflow-hidden bg-[#19172b] p-5 text-white xl:col-span-3`}
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#c2410c]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Users className="h-5 w-5 text-[#68c9ad]" />
              </div>
              <Sparkles className="h-5 w-5 text-[#ffd7b9]" />
            </div>
            <p className="mt-8 text-xl font-black leading-tight tracking-[-0.04em]">Grow with your people.</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              5 mentor and community touchpoints are ready this week.
            </p>
            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
              <div>
                <span className="text-2xl font-black">14</span>
                <span className="ml-1.5 text-[10px] text-white/55">connections</span>
              </div>
              <Link
                to="/dashboard/mentors"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#19172b] transition-transform hover:translate-x-0.5"
                aria-label="View mentors"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid gap-4 lg:grid-cols-3">
        <div className={`${surface} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <div>
              <p className="text-base font-black tracking-[-0.025em]">Notifications</p>
              <p className="text-[11px] text-[#9a939c]">Your latest activity</p>
            </div>
            <button className="text-[10px] font-bold text-[#9a939c] hover:text-[#c2410c]">Clear</button>
          </div>
          <div className="space-y-2.5 px-3 pb-3">
            <div className="rounded-[19px] border border-[#f0dfd2] bg-[#fff9f4] p-3.5 shadow-[0_10px_28px_rgba(69,42,21,0.05)]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c2410c] text-white">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-extrabold">AI Challenge deadline</p>
                    <Ellipsis className="h-4 w-4 text-[#99919a]" />
                  </div>
                  <p className="mt-1 text-[10px] text-[#918a94]">Submission closes in 3 days</p>
                  <div className="mt-2 flex items-center gap-3 text-[9px] font-semibold text-[#5e5865]">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Fri, 31 Jul</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> 11:59 PM</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[17px] bg-[#f8f4f0] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5f8f1] text-[#30987c]">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">New message from Priya</p>
                <p className="mt-0.5 truncate text-[10px] text-[#9b949c]">Your portfolio direction is looking strong...</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${surface} flex flex-col p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-black tracking-[-0.025em]">Today&apos;s focus</p>
              <p className="text-[11px] text-[#9a939c]">One clear next move</p>
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-red-500">High</span>
          </div>
          <div className="my-4 h-px bg-[#f1e5dc]" />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#c2410c]">
              <span>Competition</span>
              <span className="text-[#c3bbc1]">•</span>
              <span className="text-[#6f6976]">AI Challenge</span>
            </div>
            <p className="mt-2 max-w-xs text-lg font-black leading-snug tracking-[-0.03em]">
              Shape the problem statement and draft your solution story.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-[#e5f8f1] px-3 py-1.5 text-[9px] font-bold text-[#287f69]">Research sprint</span>
              <div className="flex -space-x-2">
                {["AS", "PT", "+2"].map((name, index) => (
                  <span
                    key={name}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[8px] font-black ${
                      index === 2 ? "bg-[#19172b] text-white" : "bg-[#ffdfc8] text-[#9d430c]"
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e7d6c8] bg-[#fff9f4] text-[11px] font-bold text-[#5f5965] hover:border-[#c2410c]/60 hover:text-[#c2410c]">
            <Plus className="h-4 w-4" /> Add a focus item
          </button>
        </div>

        <div className={`${surface} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-black tracking-[-0.025em]">July 2026</p>
              <p className="text-[11px] text-[#9a939c]">Your week at a glance</p>
            </div>
            <div className="rounded-xl bg-[#fff1e5] px-2.5 py-1.5 text-[9px] font-black text-[#c2410c]">TODAY 29</div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="text-center text-[9px] font-bold text-[#aaa2aa]">{day}</span>
            ))}
            {[27, 28, 29, 30, 31, 1, 2].map((day) => (
              <span
                key={day}
                className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-bold ${
                  day === 29 ? "bg-[#c2410c] text-white shadow-[0_7px_14px_rgba(249,115,22,0.25)]" : "text-[#47414e]"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="my-4 border-t border-dashed border-[#dcd0c7]" />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#68c9ad]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold">Mentor portfolio review</p>
                <p className="mt-0.5 text-[9px] text-[#9b949d]">10:00–10:45 · Video call</p>
              </div>
              <Ellipsis className="h-4 w-4 text-[#aaa2aa]" />
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#c2410c]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold">Design sprint check-in</p>
                <p className="mt-0.5 text-[9px] text-[#9b949d]">2:30–3:00 · Community</p>
              </div>
              <Ellipsis className="h-4 w-4 text-[#aaa2aa]" />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid gap-4 xl:grid-cols-12">
        <div className={`${surface} p-4 sm:p-5 xl:col-span-7`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black tracking-[-0.025em]">Today&apos;s tasks</p>
              <p className="text-[11px] text-[#9a939c]">3 actions selected for momentum</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-[#f8f2ed] p-1">
              <button className="rounded-lg bg-white px-3 py-1.5 text-[9px] font-bold text-[#c2410c] shadow-sm">List</button>
              <button className="px-3 py-1.5 text-[9px] font-bold text-[#938b94]">Board</button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {taskRows.map((task) => (
              <div
                key={task.title}
                className="grid items-center gap-3 rounded-[17px] border border-transparent bg-[#fbf8f5] p-3 transition-all hover:border-[#f0dfd2] hover:bg-white hover:shadow-[0_9px_26px_rgba(69,42,21,0.05)] sm:grid-cols-[auto_minmax(0,1fr)_150px_auto]"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${task.tone}`}>
                  <task.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold">{task.title}</p>
                  <p className="mt-0.5 text-[9px] text-[#9c959d]">{task.meta}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 text-right text-[9px] font-black">{task.progress}%</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eee7e1]">
                    <div className="h-full rounded-full bg-[#c2410c]" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
                <button className="hidden h-8 w-8 items-center justify-center rounded-xl text-[#99919a] hover:bg-[#fff0e5] hover:text-[#c2410c] sm:flex">
                  <Ellipsis className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-[#c2410c] p-5 text-white shadow-[0_20px_44px_rgba(249,115,22,0.23)] xl:col-span-2">
          <div className="absolute -right-9 -top-9 h-28 w-28 rounded-full border-[18px] border-white/10" />
          <div className="relative flex h-full min-h-56 flex-col">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Flame className="h-5 w-5" />
            </div>
            <p className="mt-5 text-xl font-black leading-tight tracking-[-0.04em]">Keep your streak alive.</p>
            <p className="mt-2 text-[11px] leading-5 text-white/75">You&apos;re on a 15-day learning streak.</p>
            <Link
              to="/dashboard/learning"
              className="mt-auto flex items-center justify-between rounded-2xl bg-[#19172b] px-3.5 py-3 text-[10px] font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Continue lesson <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <div className={`${surface} grid grid-cols-2 gap-3 p-4`}>
            <ProgressRing value={90} label="Profile" color="#68c9ad" />
            <ProgressRing value={65} label="Learning" color="#c2410c" />
          </div>
          <div className={`${surface} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-black">Career coaching</p>
                <p className="mt-1 text-[9px] text-[#9a939c]">31 July · 11:00 AM</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-[#68c9ad]" />
            </div>
            <p className="mt-3 text-[10px] leading-4 text-[#746e79]">Session with Dr. Aarav Sharma about your AI career roadmap.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="h-8 flex-1 rounded-xl border-[#eadbd0] px-2 text-[9px]">Reschedule</Button>
              <Button className="h-8 flex-1 rounded-xl bg-[#c2410c] px-2 text-[9px] text-white hover:bg-[#9a3412]">Join</Button>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Trophy, value: "12", label: "Competitions", color: "bg-[#fff0e4] text-[#c2410c]" },
          { icon: Medal, value: "8", label: "Badges earned", color: "bg-[#e8faf4] text-[#30987c]" },
          { icon: BriefcaseBusiness, value: "6", label: "Saved jobs", color: "bg-[#f3ecff] text-[#7758b5]" },
          { icon: Check, value: "#247", label: "Global rank", color: "bg-[#19172b] text-white" },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.label === "Saved jobs" ? "/dashboard/jobs" : stat.label === "Badges earned" ? "/dashboard/badges" : "/dashboard/competitions"}
            className={`${surface} group flex items-center gap-3 p-3.5 transition-transform hover:-translate-y-1`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black leading-none tracking-[-0.03em]">{stat.value}</p>
              <p className="mt-1 truncate text-[9px] font-semibold text-[#98919a]">{stat.label}</p>
            </div>
          </Link>
        ))}
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;
