import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Star, Clock, Video, ArrowRight, Award, MessageCircle } from "lucide-react";

const mentors = [
  {
    id: "1",
    name: "Dr. Ramesh Sharma",
    title: "AI/ML Expert",
    company: "Google",
    image: "👨‍💼",
    expertise: ["Machine Learning", "Deep Learning", "Python"],
    rating: 4.9,
    sessions: 120,
    hourlyRate: 2500,
  },
  {
    id: "2",
    name: "Sita Thapa",
    title: "Product Designer",
    company: "Microsoft",
    image: "👩‍💼",
    expertise: ["UI/UX", "Figma", "Design Systems"],
    rating: 4.8,
    sessions: 85,
    hourlyRate: 2000,
  },
  {
    id: "3",
    name: "Bikash Poudel",
    title: "Full Stack Developer",
    company: "Meta",
    image: "👨‍💻",
    expertise: ["React", "Node.js", "System Design"],
    rating: 4.9,
    sessions: 200,
    hourlyRate: 3000,
  },
  {
    id: "4",
    name: "Anita Rai",
    title: "Data Scientist",
    company: "Amazon",
    image: "👩‍🔬",
    expertise: ["Data Analysis", "SQL", "Tableau"],
    rating: 4.7,
    sessions: 65,
    hourlyRate: 1800,
  },
];

const MentorshipPreview = () => {
  return (
    <section id="mentorship" className="w-full bg-white py-20 md:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Users className="w-3 h-3 mr-1" />
            Mentorship Marketplace
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Learn from <span className="text-primary">Industry Experts</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Book 1:1 sessions with experienced professionals from top tech companies. 
            Get personalized guidance for your career growth.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Expert Mentors", value: "500+", icon: Users },
            { label: "Sessions Completed", value: "10K+", icon: Video },
            { label: "Avg. Rating", value: "4.8★", icon: Star },
            { label: "Countries", value: "15+", icon: Award },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 text-center">
              <CardContent className="p-4">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mentor Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="border-border/50 hover:shadow-lg hover:border-primary/30 transition-all group">
              <CardContent className="p-5 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {mentor.image}
                </div>
                <h3 className="font-semibold">{mentor.name}</h3>
                <p className="text-sm text-primary">{mentor.title}</p>
                <p className="text-xs text-muted-foreground mb-3">@ {mentor.company}</p>
                
                <div className="flex flex-wrap justify-center gap-1 mb-4">
                  {mentor.expertise.slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    {mentor.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {mentor.sessions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    NPR {mentor.hourlyRate.toLocaleString()}/hr
                  </span>
                  <Button variant="outline" size="sm">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup">
              Find Your Mentor
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MentorshipPreview;
