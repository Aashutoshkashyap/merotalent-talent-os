import { UserPlus, Trophy, Star, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Profile",
    description: "Sign up and build your comprehensive talent profile with skills, education, and interests.",
  },
  {
    number: "02",
    icon: Trophy,
    title: "Compete & Learn",
    description: "Participate in competitions, challenges, and bootcamps to showcase and improve your skills.",
  },
  {
    number: "03",
    icon: Star,
    title: "Earn Recognition",
    description: "Get ranked, earn badges, collect certificates, and build a verifiable track record of achievements.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Get Discovered",
    description: "Let companies find you through your performance. Land internships and jobs that match your abilities.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative w-full overflow-hidden bg-white py-24">
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Your Path to{" "}
            <span className="gradient-text">Success</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A simple, proven process to discover your potential and accelerate your career.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-secondary -translate-y-1/2" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Card */}
                <div className="bg-card rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 h-full">
                  {/* Number Badge */}
                  <div className="relative z-10 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <step.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
