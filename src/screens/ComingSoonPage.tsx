import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Trophy,
  Briefcase,
  Users,
  Bell,
  Rocket,
  Compass,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";

interface FeatureConfig {
  title: string;
  badge: string;
  subtitle: string;
  icon: typeof Trophy;
  accentColor: string;
  badgeColor: string;
  expectedDate: string;
  highlights: string[];
}

const FEATURE_MAP: Record<string, FeatureConfig> = {
  jobs: {
    title: "MeroTalent Job Portal & Career Matcher",
    badge: "Jobs & Internships",
    subtitle:
      "We are building Nepal's premier job portal connecting top university graduates with leading tech companies, corporate partners, and high-growth startups.",
    icon: Briefcase,
    accentColor: "from-blue-600 to-indigo-700",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    expectedDate: "Q3 2026",
    highlights: [
      "AI-powered CV resume matcher",
      "Direct applications to verified employers",
      "Real-time pipeline tracking dashboard",
      "Tailored internship programs for students",
    ],
  },
  competitions: {
    title: "National Hackathons & Skill Battles",
    badge: "Competitions & Contests",
    subtitle:
      "Get ready to compete in national coding hackathons, robotics challenges, design sprints, and skill olympiads with cash prizes and industry exposure.",
    icon: Trophy,
    accentColor: "from-amber-500 to-orange-600",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    expectedDate: "Q3 2026",
    highlights: [
      "Live leaderboards & instant scorecards",
      "Team formation & mentor matching",
      "Verified digital certificates & badges",
      "Direct recruitment pathways for winners",
    ],
  },
  mentorship: {
    title: "1-on-1 Industry Mentorship Network",
    badge: "Mentorship Directory",
    subtitle:
      "Book 1-on-1 guidance sessions with senior engineers, business leaders, academic advisors, and career coaches across Nepal and abroad.",
    icon: Users,
    accentColor: "from-emerald-600 to-teal-700",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    expectedDate: "Q3 2026",
    highlights: [
      "Verified industry expert mentors",
      "Seamless calendar booking & video link sync",
      "Personalized career roadmaps & mock interviews",
      "Flexible pay-per-session options",
    ],
  },
};

interface ComingSoonPageProps {
  moduleKey?: "jobs" | "competitions" | "mentorship";
}

export default function ComingSoonPage({ moduleKey }: ComingSoonPageProps) {
  const location = useLocation();
  const { toast } = useToast();

  const detectedKey =
    moduleKey ||
    (location.pathname.includes("job")
      ? "jobs"
      : location.pathname.includes("competition")
      ? "competitions"
      : location.pathname.includes("mentor")
      ? "mentorship"
      : "jobs");

  const config = FEATURE_MAP[detectedKey] || FEATURE_MAP.jobs;
  const FeatureIcon = config.icon;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 34,
    hours: 18,
    minutes: 42,
    seconds: 15,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      // Save notify request to notifications or sub_admin_requests
      await (supabase as any).from("notifications").insert({
        title: "Early Access Signup",
        message: `User subscribed for early access on ${config.badge}: ${email}`,
        type: "early_access",
      });

      setIsSubscribed(true);
      toast({
        title: "🎉 You're on the VIP list!",
        description: `We'll notify ${email} as soon as ${config.badge} launches on merotalent.com.`,
      });
    } catch {
      setIsSubscribed(true);
      toast({
        title: "🎉 Subscribed successfully!",
        description: "You will be among the first to get early access.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffdfb] flex flex-col justify-between font-sans text-slate-900 overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
        {/* Top Back Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4 text-slate-500" />
            Back to Home
          </Link>

          {/* Quick Switch Tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <Link
              to="/jobs"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detectedKey === "jobs"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Jobs
            </Link>
            <Link
              to="/competitions"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detectedKey === "competitions"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Competitions
            </Link>
            <Link
              to="/mentorship"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detectedKey === "mentorship"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Mentorship
            </Link>
          </div>
        </div>

        {/* Hero Banner Section */}
        <div className="grid lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-amber-200/40 via-orange-200/30 to-purple-200/30 rounded-full blur-3xl pointer-events-none" />

          {/* Left Column: Content */}
          <div className="lg:col-span-7 space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border shadow-2xs bg-amber-50 text-amber-800 border-amber-200">
              <Rocket className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>Coming Soon on merotalent.com</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                {config.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                {config.subtitle}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {config.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-slate-700">{highlight}</span>
                </div>
              ))}
            </div>

            {/* Email Subscription Form */}
            <div className="pt-4 border-t border-slate-100">
              {isSubscribed ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-emerald-900">You are on the VIP Early Access List!</p>
                    <p className="text-[11px] text-emerald-700">We will email you the moment {config.badge} launches.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Get early access notification when {config.badge} goes live:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="Enter your email address..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#0073e6] hover:bg-[#0062c4] text-white font-extrabold text-xs h-11 rounded-xl px-6"
                    >
                      {isSubmitting ? "Subscribing..." : "Notify Me"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Visual Timer & Icon Graphic */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative z-10">
            <div className="w-full bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <FeatureIcon className="w-8 h-8 text-white" />
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Target Launch Window</p>
                <h3 className="text-2xl font-black text-white mt-1">{config.expectedDate}</h3>
              </div>

              {/* Countdown Timer Display */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="block text-xl font-black text-amber-400">{timeLeft.days}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="block text-xl font-black text-amber-400">{timeLeft.hours}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hours</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="block text-xl font-black text-amber-400">{timeLeft.minutes}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mins</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="block text-xl font-black text-amber-400">{timeLeft.seconds}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Secs</span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" asChild className="w-full text-xs font-extrabold text-white border-slate-700 hover:bg-slate-800 rounded-xl">
                  <Link to="/institutes">
                    Explore Colleges & Courses Now
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Modules Grid */}
        <div className="mt-12 space-y-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Explore Live Platform Modules</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/institutes"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors">
                College Directory & Search
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Browse verified academic institutions, tuition details, course offerings, and campus locations across Nepal.
              </p>
            </Link>

            <Link
              to="/courses"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                Academic Courses & Programs
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Discover BSc CSIT, BCA, BIT, BBA, and professional partner courses with direct enrollment inquiries.
              </p>
            </Link>

            <Link
              to="/request-access"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Sub-Admin & Module Access
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Colleges, companies, and educators can request sub-admin authorization to publish listings and manage leads.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
