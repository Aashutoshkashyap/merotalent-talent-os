import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Calendar, 
  Users, 
  Search, 
  Clock, 
  Award,
  Target,
  Zap,
  Filter
} from "lucide-react";
import { format } from "date-fns";

const CompetitionsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const { data: competitions, isLoading } = useQuery({
    queryKey: ["public-competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("start_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const competitionTypes = [
    { id: "all", label: "All", icon: Trophy },
    { id: "hackathon", label: "Hackathons", icon: Zap },
    { id: "coding", label: "Coding", icon: Target },
    { id: "design", label: "Design", icon: Award },
  ];

  const filteredCompetitions = competitions?.filter((comp) => {
    const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || comp.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-primary/10 text-primary">Upcoming</Badge>;
      case "active":
        return <Badge className="bg-success/10 text-success">Live Now</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">
              <Trophy className="w-3 h-3 mr-1" />
              Compete & Win
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Prove Your Skills in <span className="text-primary">Competitions</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join hackathons, coding challenges, and design competitions. 
              Win prizes, earn badges, and get noticed by top companies.
            </p>
            
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search competitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{competitions?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Competitions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">
                {competitions?.filter(c => c.status === "active").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Live Now</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">NPR 5L+</p>
              <p className="text-sm text-muted-foreground">Total Prize Pool</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">2000+</p>
              <p className="text-sm text-muted-foreground">Participants</p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitions List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {competitionTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.id)}
              >
                <type.icon className="w-4 h-4 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCompetitions && filteredCompetitions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompetitions.map((competition) => (
                <Card key={competition.id} className="overflow-hidden hover:shadow-lg transition-all group">
                  <div className="h-40 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-primary/50 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      {getStatusBadge(competition.status)}
                      {competition.prize_pool && (
                        <Badge variant="outline" className="text-warning">
                          {competition.prize_pool}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {competition.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {competition.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {competition.start_date 
                          ? format(new Date(competition.start_date), "MMM d, yyyy")
                          : "TBA"}
                      </div>
                      {competition.is_team_based && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Team ({competition.team_size_min}-{competition.team_size_max})
                        </div>
                      )}
                    </div>
                    
                    {competition.registration_deadline && (
                      <div className="flex items-center gap-1 text-sm text-warning">
                        <Clock className="w-4 h-4" />
                        Register by {format(new Date(competition.registration_deadline), "MMM d")}
                      </div>
                    )}

                    <Button className="w-full" variant="hero" asChild>
                      <Link to="/login">
                        <Zap className="w-4 h-4 mr-2" />
                        Register Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No competitions found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Check back soon for new competitions"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Compete?</h2>
          <p className="text-muted-foreground mb-6">
            Sign up to participate in competitions and showcase your talent
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CompetitionsPage;
