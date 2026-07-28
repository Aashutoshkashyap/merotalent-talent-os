import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const roleLinks = [
  { label: "Talent", icon: Users, href: "/signup" },
  { label: "Mentor", icon: GraduationCap, href: "/mentorship" },
  { label: "Recruiter", icon: BriefcaseBusiness, href: "/company" },
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
    <section className="relative overflow-hidden bg-[#f8f8fc] pb-16 pt-[108px] sm:pb-20 sm:pt-[124px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#dcdafa]/70 blur-3xl" />
        <div className="absolute -right-28 top-8 h-96 w-96 rounded-full bg-[#dff7ef]/70 blur-3xl" />
        <svg className="absolute inset-x-0 bottom-0 h-64 w-full opacity-40" viewBox="0 0 1200 260" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-40 225C165 120 267 307 487 165C683 38 823 225 1248 40" stroke="#c9c6ec" strokeWidth="1.5" />
          <circle cx="1030" cy="92" r="5" fill="#655ee8" />
          <circle cx="175" cy="201" r="4" fill="#67c9aa" />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dedcf5] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#5d58c9] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Nepal. Ready for South Asia.
          </div>
          <h1 className="mt-6 text-balance font-display text-[44px] font-bold leading-[0.98] tracking-[-0.045em] text-[#17162e] sm:text-6xl lg:text-[72px]">
            Turn potential into{" "}
            <span className="relative inline-block text-[#625ce7]">
              proof.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 230 16" fill="none" aria-hidden="true">
                <path d="M4 11C58 3 154 4 226 8" stroke="#7dd8bc" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-7 text-[#6f6b7f] sm:text-lg lg:mx-0">
            Compete, learn, find mentors and get hired through work that shows what you can actually do.
          </p>

          <form
            onSubmit={submitSearch}
            className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-[#e0dfeb] bg-white p-2 shadow-[0_18px_45px_rgba(56,52,102,0.10)] lg:mx-0"
          >
            <Search className="ml-2 h-5 w-5 shrink-0 text-[#918da1]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search jobs, competitions and skills"
              placeholder="Try “UI design”, “AI” or “internship”"
              className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm text-[#2f2c43] outline-none placeholder:text-[#a6a3b2]"
            />
            <Button className="h-11 shrink-0 rounded-xl bg-[#625ce7] px-4 text-xs hover:bg-[#554fd2] sm:px-5">
              <span className="hidden sm:inline">Explore</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {roleLinks.map((role) => {
              const Icon = role.icon;
              return (
                <Link
                  key={role.label}
                  to={role.href}
                  className="group flex items-center gap-2 rounded-full border border-[#e2e1eb] bg-white px-3 py-2 text-xs font-semibold text-[#5f5b70] transition hover:border-[#aaa6ed] hover:text-[#625ce7]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {role.label}
                  <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-left lg:justify-start">
            <div>
              <p className="text-lg font-bold text-[#24213a]">10K+</p>
              <p className="text-[10px] text-[#8e8a9d]">Growing community</p>
            </div>
            <span className="h-8 w-px bg-[#dedde7]" />
            <div>
              <p className="text-lg font-bold text-[#24213a]">5 paths</p>
              <p className="text-[10px] text-[#8e8a9d]">One talent identity</p>
            </div>
            <span className="h-8 w-px bg-[#dedde7]" />
            <div>
              <p className="flex items-center gap-1 text-lg font-bold text-[#24213a]">
                4.9 <Star className="h-3.5 w-3.5 fill-[#f3b85f] text-[#f3b85f]" />
              </p>
              <p className="text-[10px] text-[#8e8a9d]">Mentor experience</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto w-full max-w-[720px]"
        >
          <div className="absolute -inset-4 rounded-[36px] bg-[#d8d7ed]/60 blur-2xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-white/80 bg-[#eeedf8] p-3 shadow-[0_30px_80px_rgba(52,48,98,0.18)] sm:p-4">
            <div className="overflow-hidden rounded-[21px] bg-[#fbfbfd]">
              <div className="flex h-12 items-center gap-2 border-b border-[#eeeeF4] px-3 sm:px-4">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#625ce7] text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-[#343148] sm:text-xs">Your talent workspace</p>
                  <p className="text-[8px] text-[#a09dac] sm:text-[9px]">Proof, progress and possibilities</p>
                </div>
                <span className="ml-auto hidden rounded-full bg-[#e4f7f0] px-2 py-1 text-[8px] font-bold text-[#2c8267] sm:inline">
                  Profile 82%
                </span>
                <div className="flex -space-x-1.5">
                  {["A", "S", "R"].map((initial, index) => (
                    <span key={initial} className={`grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[8px] font-bold ${["bg-[#f9dbdf] text-[#9b4353]", "bg-[#dff4ed] text-[#36735f]", "bg-[#e6e4fb] text-[#5c56be]"][index]}`}>
                      {initial}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-2.5 p-3 sm:grid-cols-[1.25fr_0.75fr] sm:p-4">
                <div className="space-y-2.5">
                  <div className="rounded-2xl bg-[#625ce7] p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-semibold text-white/60">GOOD MORNING, AARAV</p>
                        <p className="mt-1 max-w-[280px] font-display text-lg font-bold leading-tight sm:text-xl">
                          Ready to make today count?
                        </p>
                      </div>
                      <Award className="h-7 w-7 text-[#9ee7d0]" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-1.5">
                      {[
                        [Trophy, "12", "Challenges"],
                        [BookOpen, "4", "Courses"],
                        [Users, "#247", "Rank"],
                      ].map(([Icon, value, label]) => {
                        const TileIcon = Icon as typeof Trophy;
                        return (
                          <div key={String(label)} className="rounded-xl bg-white/10 p-2">
                            <TileIcon className="h-3.5 w-3.5 text-[#9ee7d0]" />
                            <p className="mt-2 text-sm font-bold">{value as string}</p>
                            <p className="text-[7px] text-white/60">{label as string}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-[#ededf3] bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold">Next challenge</p>
                        <Code2 className="h-3.5 w-3.5 text-[#625ce7]" />
                      </div>
                      <p className="mt-3 text-xs font-bold">Nepal AI Challenge</p>
                      <div className="mt-1.5 flex items-center gap-1 text-[8px] text-[#9a97a6]">
                        <CalendarDays className="h-2.5 w-2.5" /> Registration ends soon
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#ecebf2]">
                        <div className="h-full w-3/4 rounded-full bg-[#625ce7]" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#ededf3] bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold">Skill streak</p>
                        <Sparkles className="h-3.5 w-3.5 text-[#e99d47]" />
                      </div>
                      <div className="mt-3 flex items-end gap-1">
                        {[32, 48, 40, 68, 55, 82, 72].map((height, index) => (
                          <span key={`${height}-${index}`} className="flex-1 rounded-t bg-[#e8e6fb]" style={{ height: `${height / 2}px` }}>
                            <span className="block h-full rounded-t bg-[#7dd8bc]" style={{ opacity: 0.45 + index * 0.07 }} />
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[8px] text-[#9a97a6]">7 focused days in a row</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-2xl border border-[#ededf3] bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold">Best match</p>
                      <span className="rounded-full bg-[#e3f7ef] px-1.5 py-0.5 text-[7px] font-bold text-[#2d8267]">94%</span>
                    </div>
                    <div className="mt-3 grid h-9 w-9 place-items-center rounded-xl bg-[#fff0dd] text-[#c77928]">
                      <BriefcaseBusiness className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-[11px] font-bold leading-tight">Product Design Intern</p>
                    <p className="mt-1 flex items-center gap-1 text-[8px] text-[#9a97a6]">
                      <MapPin className="h-2.5 w-2.5" /> Kathmandu · Hybrid
                    </p>
                  </motion.div>

                  <div className="rounded-2xl bg-[#19182f] p-3 text-white">
                    <p className="text-[9px] font-semibold text-white/55">MENTOR SESSION</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f3dce1] text-[9px] font-bold text-[#8b4351]">PS</span>
                      <div>
                        <p className="text-[10px] font-bold">Priya Shrestha</p>
                        <p className="text-[7px] text-white/50">Design leadership</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/10 p-2 text-[8px]">
                      <Check className="h-3 w-3 text-[#7dd8bc]" /> Today · 4:30 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
