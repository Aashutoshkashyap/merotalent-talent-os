import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Building2, Briefcase, Users2 } from "lucide-react";

const roles = [
  {
    id: "talent",
    icon: GraduationCap,
    title: "For Students & Professionals",
    description: "Build your performance-based profile, compete in challenges, learn from mentors, and get discovered by top companies.",
    features: ["Unified talent profile", "Competition history & rankings", "Mentor booking", "Job applications"],
    cta: "Create Your Profile",
    gradient: "from-primary to-accent",
  },
  {
    id: "institution",
    icon: Building2,
    title: "For Colleges & Universities",
    description: "Host competitions, manage student participation, and showcase your institution's talent to the industry.",
    features: ["Host competitions", "Student management", "Analytics dashboard", "Certificate issuance"],
    cta: "Partner With Us",
    gradient: "from-accent to-primary",
  },
  {
    id: "company",
    icon: Briefcase,
    title: "For Companies & Recruiters",
    description: "Discover pre-vetted talent through performance, sponsor challenges, and build your employer brand.",
    features: ["Skill-based hiring", "Sponsored challenges", "Talent shortlisting", "Employer branding"],
    cta: "Start Hiring",
    gradient: "from-secondary to-primary",
  },
  {
    id: "mentor",
    icon: Users2,
    title: "For Mentors & Experts",
    description: "Share your expertise, conduct sessions, and help shape the next generation of talent.",
    features: ["1:1 & group sessions", "Flexible scheduling", "Earn from expertise", "Build your brand"],
    cta: "Become a Mentor",
    gradient: "from-primary to-secondary",
  },
];

const UserRoles = () => {
  return (
    <section id="roles" className="w-full bg-white py-24">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Built for{" "}
            <span className="gradient-text">Every Stakeholder</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A unified platform connecting students, institutions, companies, and mentors in one thriving ecosystem.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {roles.map((role, index) => (
            <div
              key={role.id}
              className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
            >
              {/* Background Gradient */}
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${role.gradient} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <role.icon className="w-8 h-8 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-display text-2xl font-bold mb-4">{role.title}</h3>
                <p className="text-muted-foreground mb-6">{role.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button variant="hero-secondary" className="group/btn">
                  {role.cta}
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserRoles;
