import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="workspace-canvas grid min-h-screen place-items-center p-0 sm:p-5 lg:p-8">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70" viewBox="0 0 1500 900" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-100 690C190 430 430 760 730 465C1010 190 1260 430 1600 210" stroke="white" strokeWidth="2" />
        <circle cx="115" cy="160" r="7" stroke="#c2410c" />
        <circle cx="1375" cy="720" r="7" fill="#66c7a8" />
      </svg>

      <div className="workspace-shell relative z-10 grid min-h-screen w-full max-w-[980px] bg-white lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col p-6 sm:p-10 lg:p-12">
          <Link to="/" className="flex w-fit items-center gap-2.5 font-display text-lg font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Mero<span className="text-primary">talent</span></span>
          </Link>

          <div className="my-auto py-16">
            <div className="workspace-kicker">
              <span className="workspace-dot" />
              Lost, not stuck
            </div>
            <h1 className="workspace-heading mt-4 text-5xl sm:text-6xl">This path ends here.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#8d8792]">
              We could not find <span className="font-semibold text-[#373347]">{location.pathname}</span>. Head back and keep exploring opportunities that are actually live.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/"><ArrowLeft className="h-4 w-4" /> Back home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/jobs"><Compass className="h-4 w-4 text-primary" /> Explore jobs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#fff4ec] p-8 lg:grid lg:place-items-center">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border-[40px] border-primary/10" />
          <div className="relative w-full max-w-[310px]">
            <div className="workspace-card rotate-[-3deg] p-6">
              <span className="workspace-icon"><Compass className="h-5 w-5" /></span>
              <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Error 404</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#19172f]">Try another route</h2>
              <div className="mt-6 space-y-2">
                {[
                  ["/jobs", "Find your next role"],
                  ["/competitions", "Test your skills"],
                  ["/mentorship", "Meet a mentor"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} className="flex items-center justify-between rounded-[14px] bg-[#fbf9f7] px-4 py-3 text-xs font-bold text-[#57515e] transition-colors hover:bg-[#fff1e8] hover:text-primary">
                    {label}
                    <span className="text-primary">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NotFound;
