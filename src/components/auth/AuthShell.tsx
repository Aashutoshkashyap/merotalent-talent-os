import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

const AuthShell = ({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) => (
  <div className="grid min-h-screen w-full bg-[#fafbfc] lg:grid-cols-[minmax(450px,0.9fr)_minmax(0,1.1fr)] font-sans">
    {/* Left Form Column */}
    <section className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-8 sm:py-10 lg:px-16 lg:py-12 bg-[#fafbfc] lg:bg-white">
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-1 flex-col justify-between">
        {/* Brand Logo Header */}
        <Link to="/" className="flex w-fit items-center gap-2.5 transition-transform hover:scale-102" aria-label="Merotalent home">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#0073e6] text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-[#17162e]">
            Mero<span className="text-[#0073e6]">talent</span>
          </span>
        </Link>

        {/* Working Screen Form Container with Margin & Responsiveness */}
        <div className="my-auto py-10 w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-lg lg:border-none lg:shadow-none lg:bg-transparent lg:p-0 mt-8 mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0073e6]" />
            <span className="uppercase tracking-wider">{eyebrow}</span>
          </div>
          <h1 className="mt-4 font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>

        {/* Footer */}
        {footer ? (
          <div className="border-t border-slate-100 lg:border-slate-100 pt-5 text-xs sm:text-sm text-slate-500 font-semibold">
            {footer}
          </div>
        ) : null}
      </div>
    </section>

    {/* Right Preview Column (Desktop Only) */}
    <section className="relative hidden min-h-screen overflow-hidden border-l border-slate-100 bg-[#fafbfc] p-8 lg:block">
      <div className="mx-auto grid h-full w-full max-w-[800px] grid-rows-[auto_1fr] gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl flex items-center gap-3 px-5 py-4 shadow-2xs">
          <span className="bg-blue-50 border border-blue-100 text-[#0073e6] h-9 w-9 rounded-xl flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-800">Your talent workspace</p>
            <p className="text-[11px] text-slate-400 font-bold">Proof, progress and possibilities</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-600 shadow-3xs">
            Profile 82%
          </span>
        </div>

        <div className="grid min-h-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid content-start gap-6">
            <div className="rounded-[28px] bg-[#0073e6] p-6 text-white shadow-[0_20px_40px_rgba(0,115,230,0.16)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">Good morning, Aarav</p>
                  <h2 className="mt-2.5 max-w-xs text-xl sm:text-2xl font-black leading-tight">
                    Ready to make today count?
                  </h2>
                </div>
                <Trophy className="h-6 w-6 text-white/90" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  [Trophy, "12", "Challenges"],
                  [BriefcaseBusiness, "4", "Matches"],
                  [Users, "#247", "Rank"],
                ].map(([Icon, value, label]) => {
                  const TileIcon = Icon as typeof Trophy;
                  return (
                    <div key={String(label)} className="rounded-[14px] bg-white/12 p-3.5 flex flex-col justify-between">
                      <TileIcon className="h-4.5 w-4.5 text-white/90" />
                      <div>
                        <p className="mt-3 text-lg font-black">{value as string}</p>
                        <p className="text-[10px] text-white/70 font-semibold">{label as string}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Today’s tasks</h3>
                  <p className="mt-0.5 text-xs text-slate-400 font-bold">Small moves, visible progress</p>
                </div>
                <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-black text-[#0073e6]">
                  3 active
                </span>
              </div>
              <div className="mt-5 space-y-2.5">
                {[
                  ["Finish portfolio story", "86%"],
                  ["Apply to design challenge", "62%"],
                  ["Prepare mentor questions", "38%"],
                ].map(([label, progress], index) => (
                  <div key={label} className="flex items-center gap-3.5 rounded-[14px] bg-slate-50 border border-slate-100 p-3.5">
                    <span className={`grid h-8 w-8 place-items-center rounded-xl ${index === 0 ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-blue-50 border border-blue-100 text-[#0073e6]"}`}>
                      {index === 0 ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 truncate">{label}</span>
                    <span className="text-xs font-black text-slate-400">{progress}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid content-start gap-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs hover:scale-102 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 border border-blue-100 text-[#0073e6] h-9 w-9 rounded-xl flex items-center justify-center">
                  <BriefcaseBusiness className="h-4.5 w-4.5" />
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-600 shadow-3xs">
                  94% match
                </span>
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.13em] text-[#0073e6]">Best opportunity</p>
              <h3 className="mt-1.5 text-base font-black text-slate-800 leading-snug">Product Design Intern</h3>
              <p className="mt-1 text-xs text-slate-400 font-bold">Kathmandu · Hybrid</p>
              <Link to="/jobs" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#0073e6] hover:underline">
                View opportunity <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-black">PS</span>
                <div>
                  <p className="text-xs font-black text-slate-800">Priya Shrestha</p>
                  <p className="text-[11px] text-slate-400 font-bold">Design mentor</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-slate-50 border border-slate-100 p-3 text-xs font-bold text-slate-700">
                <CalendarDays className="h-4 w-4 text-[#0073e6]" />
                Today · 4:30 PM
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default AuthShell;
