import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Users, Trophy, MapPin, ArrowRight } from "lucide-react";

interface Competition {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  prize_pool: string | null;
  status: string | null;
  is_team_based: boolean | null;
  cover_image: string | null;
}

const Competitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    
    if (data) setCompetitions(data);
    setIsLoading(false);
  };

  const filteredCompetitions = competitions.filter((comp) =>
    comp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "upcoming":
        return "bg-primary/10 text-primary";
      case "ongoing":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "hackathon":
        return "🚀";
      case "quiz":
        return "📝";
      case "coding":
        return "💻";
      case "case_study":
        return "📊";
      case "design":
        return "🎨";
      case "project":
        return "🔨";
      default:
        return "🏆";
    }
  };

  // Mock data for demonstration
  const mockCompetitions: Competition[] = [
    {
      id: "1",
      title: "Nepal AI Challenge 2026",
      description: "Build innovative AI solutions to solve real-world problems in Nepal. Cash prizes and internship opportunities await!",
      type: "hackathon",
      format: "hybrid",
      start_date: "2026-02-15",
      end_date: "2026-02-17",
      registration_deadline: "2026-02-10",
      max_participants: 500,
      prize_pool: "NPR 500,000",
      status: "upcoming",
      is_team_based: true,
      cover_image: null,
    },
    {
      id: "2",
      title: "Code Sprint Nepal",
      description: "48-hour coding marathon. Solve algorithmic challenges and compete with the best programmers in Nepal.",
      type: "coding",
      format: "online",
      start_date: "2026-02-20",
      end_date: "2026-02-22",
      registration_deadline: "2026-02-18",
      max_participants: 300,
      prize_pool: "NPR 200,000",
      status: "upcoming",
      is_team_based: false,
      cover_image: null,
    },
    {
      id: "3",
      title: "Design Innovation Summit",
      description: "Showcase your UI/UX design skills. Create solutions that make a difference.",
      type: "design",
      format: "online",
      start_date: "2026-03-01",
      end_date: "2026-03-05",
      registration_deadline: "2026-02-25",
      max_participants: 200,
      prize_pool: "NPR 150,000",
      status: "upcoming",
      is_team_based: false,
      cover_image: null,
    },
  ];

  const displayCompetitions = competitions.length > 0 ? filteredCompetitions : mockCompetitions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Competitions</h1>
        <p className="text-muted-foreground">Discover and participate in exciting competitions</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCompetitions.map((comp) => (
              <Card key={comp.id} className="border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Cover Image */}
                <div className="h-40 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 relative flex items-center justify-center">
                  <span className="text-6xl">{getTypeIcon(comp.type)}</span>
                  <Badge className={`absolute top-3 right-3 ${getStatusColor(comp.status)}`}>
                    {comp.status}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {comp.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {comp.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {comp.start_date ? new Date(comp.start_date).toLocaleDateString() : "TBD"}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {comp.format}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{comp.max_participants || "Unlimited"} spots</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-secondary">
                        <Trophy className="w-4 h-4" />
                        {comp.prize_pool}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {comp.is_team_based && (
                        <Badge variant="outline" className="text-xs">Team</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">{comp.type}</Badge>
                    </div>

                    <Button className="w-full mt-2" variant="hero">
                      Register Now
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCompetitions
              .filter((c) => c.status === "upcoming")
              .map((comp) => (
                <Card key={comp.id} className="border-border/50">
                  <CardHeader>
                    <CardTitle>{comp.title}</CardTitle>
                    <CardDescription>{comp.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="ongoing" className="mt-6">
          <p className="text-muted-foreground text-center py-8">No ongoing competitions at the moment.</p>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <p className="text-muted-foreground text-center py-8">No completed competitions yet.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Competitions;
