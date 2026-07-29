import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTA = () => (
  <section className="bg-[#f4dfd4] px-3 py-6 sm:px-5 sm:py-8 lg:px-8">
    <div className="relative mx-auto max-w-[1420px] overflow-hidden rounded-[26px] bg-[#c2410c] px-6 py-12 text-white shadow-[0_28px_70px_rgba(194,65,12,0.22)] sm:rounded-[32px] sm:px-10 lg:px-14 lg:py-16">
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#9ce6cf]">
          <Sparkles className="h-3.5 w-3.5" />
          Your next chapter can start small
        </div>
        <h2 className="mt-5 text-balance font-display text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
          Make one skill visible. Let the right opportunity find it.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
          Create a free account, choose your path and build momentum from real work.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button className="h-11 rounded-xl bg-white px-5 text-[#c2410c] hover:bg-[#fff7ed]" asChild>
            <Link to="/signup">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button className="h-11 rounded-xl border border-white/15 bg-white/5 px-5 text-white hover:bg-white/10" asChild>
            <Link to="/jobs">Browse opportunities</Link>
          </Button>
        </div>
      </div>
      <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[52px] border-white/10" />
      <div className="absolute -bottom-36 right-36 h-72 w-72 rounded-full bg-[#bd4d05]/35 blur-3xl" />
      <svg className="absolute bottom-0 right-0 h-full w-1/2 opacity-25" viewBox="0 0 600 400" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M40 360C160 180 245 330 330 140C390 7 494 125 630 30" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  </section>
);

export default CTA;
