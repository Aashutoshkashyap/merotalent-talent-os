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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Star, 
  Search, 
  Clock, 
  Award,
  Briefcase,
  MessageSquare,
  Video,
  CheckCircle
} from "lucide-react";

const MentorshipPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");

  const { data: mentors, isLoading } = useQuery({
    queryKey: ["public-mentors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq("is_available", true)
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const expertiseAreas = [
    { id: "all", label: "All Areas" },
    { id: "software", label: "Software Engineering" },
    { id: "product", label: "Product Management" },
    { id: "design", label: "UI/UX Design" },
    { id: "data", label: "Data Science" },
    { id: "career", label: "Career Growth" },
  ];

  const filteredMentors = mentors?.filter((mentor) => {
    const name = (mentor.profiles as any)?.full_name || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise?.some((e: string) => e.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesExpertise = selectedExpertise === "all" || 
      mentor.expertise?.some((e: string) => e.toLowerCase().includes(selectedExpertise));
    return matchesSearch && matchesExpertise;
  });

  const benefits = [
    { icon: Video, title: "1:1 Video Sessions", description: "Personal guidance from industry experts" },
    { icon: MessageSquare, title: "Chat Support", description: "Get answers to your questions anytime" },
    { icon: Award, title: "Career Advice", description: "Navigate your career path with confidence" },
    { icon: Briefcase, title: "Industry Insights", description: "Learn what top companies are looking for" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">
              <Users className="w-3 h-3 mr-1" />
              Learn from the Best
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Get <span className="text-primary">Mentored</span> by Industry Experts
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with experienced professionals who can guide your career, 
              review your work, and help you achieve your goals.
            </p>
            
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search mentors by name or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mentors List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {expertiseAreas.map((area) => (
              <Button
                key={area.id}
                variant={selectedExpertise === area.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedExpertise(area.id)}
              >
                {area.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMentors && filteredMentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor) => {
                const profile = mentor.profiles as any;
                return (
                  <Card key={mentor.id} className="overflow-hidden hover:shadow-lg transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-16 h-16 border-2 border-primary/20">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="text-lg">
                            {profile?.full_name?.charAt(0) || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                            {profile?.full_name || "Mentor"}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {profile?.bio || "Industry Expert"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              <span className="font-medium">{mentor.rating || 5.0}</span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {mentor.total_sessions || 0} sessions
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {mentor.expertise?.slice(0, 3).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {(mentor.expertise?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.expertise!.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          {mentor.years_experience || 0}+ years exp.
                        </div>
                        <div className="text-lg font-bold text-primary">
                          NPR {mentor.hourly_rate || 1500}/hr
                        </div>
                      </div>

                      <Button className="w-full" variant="hero" asChild>
                        <Link to="/login">
                          <Video className="w-4 h-4 mr-2" />
                          Book Session
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No mentors found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Check back soon for available mentors"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">How Mentorship Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Choose a Mentor</h3>
              <p className="text-sm text-muted-foreground">
                Browse profiles and find a mentor who matches your goals
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Book a Session</h3>
              <p className="text-sm text-muted-foreground">
                Select a time slot and describe what you'd like to discuss
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Meet via video call and receive personalized advice
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Accelerate Your Career?</h2>
          <p className="text-muted-foreground mb-6">
            Sign up to book sessions with industry experts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/login">Already have an account?</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MentorshipPage;
