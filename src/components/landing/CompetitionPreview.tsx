import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Users, Trophy, Tag } from "lucide-react";

const competitions = [
  {
    id: 1,
    title: "Code Quest 2024",
    organizer: "Kathmandu University",
    type: "Hackathon",
    prize: "NPR 500,000",
    deadline: "15 Days Left",
    participants: "2,340+",
    tags: ["Coding", "Innovation", "Team"],
    featured: true,
  },
  {
    id: 2,
    title: "Business Case Challenge",
    organizer: "Nepal Bank Ltd",
    type: "Case Study",
    prize: "NPR 200,000",
    deadline: "7 Days Left",
    participants: "890+",
    tags: ["Business", "Strategy"],
    featured: false,
  },
  {
    id: 3,
    title: "Design Sprint Nepal",
    organizer: "Creative Hub",
    type: "Design",
    prize: "NPR 150,000",
    deadline: "21 Days Left",
    participants: "560+",
    tags: ["UI/UX", "Product"],
    featured: false,
  },
  {
    id: 4,
    title: "AI Innovation Challenge",
    organizer: "Tech Nepal",
    type: "AI/ML",
    prize: "NPR 750,000",
    deadline: "30 Days Left",
    participants: "1,200+",
    tags: ["AI", "Machine Learning"],
    featured: true,
  },
];

const CompetitionPreview = () => {
  return (
    <section id="competitions" className="w-full bg-white py-24">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Active <span className="gradient-text">Competitions</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Join live challenges and prove your skills. From hackathons to case studies, find the perfect opportunity.
            </p>
          </div>
          <Button variant="outline" className="shrink-0">
            View All Competitions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Competitions Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className={`group relative bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                comp.featured ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-border'
              }`}
            >
              {/* Featured Badge */}
              {comp.featured && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  Featured
                </div>
              )}

              <div className="p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                    comp.featured ? 'bg-gradient-to-br from-primary to-accent' : 'bg-primary/10'
                  }`}>
                    <Trophy className={`w-7 h-7 ${comp.featured ? 'text-primary-foreground' : 'text-primary'}`} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">
                      {comp.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{comp.organizer}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {comp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {comp.deadline}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {comp.participants}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Prize Pool</p>
                    <p className="font-display text-lg font-bold text-secondary">{comp.prize}</p>
                  </div>
                  <Button variant={comp.featured ? "hero" : "default"} size="sm">
                    Participate
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompetitionPreview;
