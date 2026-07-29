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
    <main className="min-h-screen w-full bg-white">
      <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1.05fr_0.95fr]">
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

        <section className="relative hidden overflow-hidden border-l border-[#eee7e1] bg-[#faf9f8] p-8 lg:grid lg:place-items-center">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border-[40px] border-primary/10" />
          <div className="relative w-full max-w-[310px]">
            <div className="workspace-card rotate-[-3deg] p-6">
              <span className="workspace-icon"><Compass className="h-5 w-5" /></span>
              <p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-primary">Error 404</p>
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
