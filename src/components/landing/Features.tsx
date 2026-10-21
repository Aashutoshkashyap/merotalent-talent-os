import { Trophy, Users, GraduationCap, Briefcase, Star, Zap, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Trophy,
    title: "Compete & Prove",
    path: "/competitions",
    description: "Participate in hackathons, coding challenges, case studies, and innovation contests to showcase your real skills.",
    color: "primary",
  },
  {
    icon: Star,
    title: "Build Your Profile",
    path: "/dashboard/profile",
    description: "Create a performance-based talent profile that highlights your achievements, rankings, and verified skills.",
    color: "secondary",
  },
  {
    icon: Users,
    title: "Learn from Mentors",
    path: "/mentorship",
    description: "Connect with industry experts for 1:1 mentorship sessions and accelerate your career growth.",
    color: "accent",
  },
  {
    icon: Briefcase,
    title: "Get Hired",
    path: "/jobs",
    description: "Let companies discover you through your performance. Get hired based on what you can do, not just degrees.",
    color: "primary",
  },
  {
    icon: GraduationCap,
    title: "Upskill Yourself",
    path: "/courses",
    description: "Access bootcamps, courses, and learning paths designed by industry experts.",
    color: "secondary",
  },
  {
    icon: Target,
    title: "Track Progress",
    path: "/dashboard",
    description: "Monitor your growth with detailed analytics, leaderboards, and personalized insights.",
    color: "accent",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative w-full overflow-hidden bg-white py-24">
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-6">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">Why MeroTalent?</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-slate-900">
            Why <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MeroTalent?</span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            A complete ecosystem empowering Nepalese talent, connecting students, mentors, institutions, and companies seamlessly.
          </p>
        </div>

        {/* Hero Feature Banner Image */}
        <div className="max-w-5xl mx-auto mb-16 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-blue-500/10 bg-slate-100">
          <img
            src="https://plus.unsplash.com/premium_photo-1712952354748-0c51436e7dc7?q=80&w=2357&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Why MeroTalent Platform Ecosystem"
            referrerPolicy="no-referrer"
            loading="eager"
            onError={(e) => {
              e.currentTarget.src = "/images/why-merotalent.jpg";
            }}
            className="w-full h-[320px] sm:h-[420px] object-cover object-center transform hover:scale-105 transition-transform duration-700"
          />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              to={feature.path}
              className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110 ${
                feature.color === 'primary' ? 'bg-primary/10' :
                feature.color === 'secondary' ? 'bg-secondary/10' : 'bg-accent/10'
              }`}>
                <feature.icon className={`w-7 h-7 ${
                  feature.color === 'primary' ? 'text-primary' :
                  feature.color === 'secondary' ? 'text-secondary' : 'text-accent'
                }`} />
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {[
            { value: "50K+", label: "Students Registered", icon: Users },
            { value: "250+", label: "Active Competitions", icon: Trophy },
            { value: "100+", label: "Partner Companies", icon: Briefcase },
            { value: "500+", label: "Expert Mentors", icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-muted/50 border border-border">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
