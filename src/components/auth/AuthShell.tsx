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
  <div className="grid min-h-screen w-full bg-white lg:grid-cols-[minmax(430px,0.86fr)_minmax(0,1.14fr)]">
      <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10 sm:py-9 lg:px-12">
        <div className="mx-auto flex h-full w-full max-w-[520px] flex-1 flex-col">
        <Link to="/" className="flex w-fit items-center gap-2.5" aria-label="Merotalent home">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-primary text-white shadow-lg shadow-orange-500/20">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-[#17162e]">
            Mero<span className="text-primary">talent</span>
          </span>
        </Link>

        <div className="my-auto py-10">
          <div className="workspace-kicker">
            <span className="workspace-dot" />
            {eyebrow}
          </div>
          <h1 className="workspace-heading mt-4 max-w-xl text-4xl sm:text-[52px]">{title}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#8b8592]">{description}</p>
          <div className="mt-8 max-w-md">{children}</div>
        </div>

        {footer ? <div className="border-t border-[#f0e9e4] pt-5 text-sm text-[#8b8592]">{footer}</div> : null}
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden border-l border-[#eee7e1] bg-[#faf9f8] p-6 lg:block">
        <div className="mx-auto grid h-full w-full max-w-[820px] grid-rows-[auto_1fr] gap-4">
          <div className="workspace-card flex items-center gap-3 px-4 py-3.5">
            <span className="workspace-icon h-9 w-9 rounded-xl">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold">Your talent workspace</p>
              <p className="text-xs text-[#aaa3aa]">Proof, progress and possibilities</p>
            </div>
            <span className="ml-auto rounded-full bg-[#e5f7f0] px-2 py-1 text-xs font-bold text-[#36866d]">
              Profile 82%
            </span>
          </div>

          <div className="grid min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid content-start gap-4">
              <div className="rounded-[24px] bg-primary p-5 text-white shadow-[0_20px_40px_rgba(249,115,22,0.22)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Good morning, Aarav</p>
                    <h2 className="mt-2 max-w-xs font-display text-2xl font-bold leading-tight">
                      Ready to make today count?
                    </h2>
                  </div>
                  <Trophy className="h-7 w-7 text-[#ffe0c2]" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    [Trophy, "12", "Challenges"],
                    [BriefcaseBusiness, "4", "Matches"],
                    [Users, "#247", "Rank"],
                  ].map(([Icon, value, label]) => {
                    const TileIcon = Icon as typeof Trophy;
                    return (
                      <div key={String(label)} className="rounded-[14px] bg-white/12 p-3">
                        <TileIcon className="h-3.5 w-3.5 text-[#ffe0c2]" />
                        <p className="mt-3 text-base font-bold">{value as string}</p>
                        <p className="mt-0.5 text-xs text-white/60">{label as string}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="workspace-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold">Today’s tasks</h3>
                    <p className="mt-1 text-xs text-[#9f98a2]">Small moves, visible progress</p>
                  </div>
                  <span className="rounded-full bg-[#fff1e8] px-2.5 py-1 text-xs font-bold text-primary">3 active</span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ["Finish portfolio story", "86%"],
                    ["Apply to design challenge", "62%"],
                    ["Prepare mentor questions", "38%"],
                  ].map(([label, progress], index) => (
                    <div key={label} className="flex items-center gap-3 rounded-[14px] bg-[#fbf9f7] p-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-xl ${index === 0 ? "bg-[#e5f7f0] text-[#36866d]" : "bg-[#fff1e8] text-primary"}`}>
                        {index === 0 ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                      </span>
                      <span className="min-w-0 flex-1 text-xs font-semibold">{label}</span>
                      <span className="text-xs font-bold text-[#8e8792]">{progress}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="workspace-card rotate-[1.5deg] p-5">
                <div className="flex items-center justify-between">
                  <span className="workspace-icon">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-[#e5f7f0] px-2 py-1 text-xs font-bold text-[#36866d]">94% match</span>
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.13em] text-primary">Best opportunity</p>
                <h3 className="mt-2 font-display text-lg font-bold">Product Design Intern</h3>
                <p className="mt-2 text-xs text-[#99929e]">Kathmandu · Hybrid</p>
                <Link to="/jobs" className="mt-5 flex items-center gap-1 text-xs font-bold text-primary">
                  View opportunity <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="workspace-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f7f0] text-xs font-bold text-[#36866d]">PS</span>
                  <div>
                    <p className="text-xs font-bold">Priya Shrestha</p>
                    <p className="text-xs text-[#99929e]">Design mentor</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-[14px] bg-[#fbf9f7] p-3 text-xs font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
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
