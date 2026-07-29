import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Star, 
  Search, 
  Award,
  Briefcase,
  MessageSquare,
  Video,
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pb-6 pt-[68px] sm:pb-8">
      <section className="w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_22px_56px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:p-7 lg:p-9">
        <div className="grid gap-7 lg:grid-cols-[1fr_0.95fr] lg:items-end">
          <div>
            <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-xs font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
              <Users className="mr-1 h-3 w-3" />
              Human guidance
            </Badge>
            <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
              One good conversation can change your <span className="text-[#c2410c]">direction.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
              Connect with experienced people who can review your work, sharpen your choices and help you move.
            </p>
            <div className="relative mt-7 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
              <Input
                placeholder="Search mentors by name or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {benefits.map((benefit, idx) => (
              <div key={idx} className={`min-h-[118px] rounded-[18px] border p-4 ${idx === 1 ? "border-[#d9eee6] bg-[#e8f7f1]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${idx === 1 ? "bg-white/70 text-[#238366]" : "bg-[#fff0e7] text-[#c2410c]"}`}>
                  <benefit.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-xs font-black text-[#2a3044]">{benefit.title}</h3>
                <p className="mt-1 text-xs leading-4 text-[#8f8790]">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-3 w-full rounded-[22px] border border-[#eee7e2] bg-[#fffdfb] px-4 py-4 shadow-[0_14px_32px_rgba(99,55,29,0.05)] sm:px-6">
          <div className="flex flex-wrap gap-2">
            {expertiseAreas.map((area) => (
              <Button
                key={area.id}
                variant={selectedExpertise === area.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedExpertise(area.id)}
                className={`h-8 rounded-full border-[#ece3de] px-3 text-xs font-black ${selectedExpertise === area.id ? "bg-[#c2410c] hover:bg-[#9a3412]" : "bg-white text-[#746d75] hover:border-[#fdba74] hover:text-[#c2410c]"}`}
              >
                {area.label}
              </Button>
            ))}
          </div>
      </section>

      <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-3 shadow-[0_18px_46px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-5 lg:p-7">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse rounded-[22px] border-[#f0e8e3]">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-[#f5efeb]" />
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-[#f5efeb]" />
                        <div className="h-3 w-32 rounded bg-[#f5efeb]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMentors && filteredMentors.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredMentors.map((mentor) => {
                const profile = mentor.profiles as any;
                return (
                  <Card key={mentor.id} className="group overflow-hidden rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)]">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16 border-2 border-[#fed7aa]">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="text-lg">
                            {profile?.full_name?.charAt(0) || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate text-base font-black text-[#20273c] transition-colors group-hover:text-[#c2410c]">
                            {profile?.full_name || "Mentor"}
                          </h3>
                          <p className="line-clamp-1 text-xs text-[#8f8790]">
                            {profile?.bio || "Industry Expert"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="h-3.5 w-3.5 fill-[#c2410c] text-[#c2410c]" />
                              <span className="font-medium">{mentor.rating || 5.0}</span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-[#8f8790]">
                              {mentor.total_sessions || 0} sessions
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {mentor.expertise?.slice(0, 3).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="rounded-lg bg-[#faf7f5] text-xs font-bold text-[#777078]">
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
                        <div className="flex items-center gap-1 text-xs text-[#8f8790]">
                          <Briefcase className="w-4 h-4" />
                          {mentor.years_experience || 0}+ years exp.
                        </div>
                        <div className="text-sm font-black text-[#c2410c]">
                          NPR {mentor.hourly_rate || 1500}/hr
                        </div>
                      </div>

                      <Button className="h-9 w-full rounded-xl bg-[#c2410c] text-xs font-black hover:bg-[#9a3412]" asChild>
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
            <div className="py-14 text-center">
              <Users className="mx-auto mb-4 h-14 w-14 text-[#d9cfc9]" />
              <h3 className="mb-2 text-lg font-black text-[#20273c]">No mentors found</h3>
              <p className="text-sm text-[#8f8790]">
                {searchQuery ? "Try adjusting your search" : "Check back soon for available mentors"}
              </p>
            </div>
          )}
      </section>

      {/* How It Works */}
      <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_18px_44px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-8">
          <h2 className="text-xl font-black text-[#172039]">How mentorship works</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-[#f0e8e3] bg-[#fffaf7] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#c2410c] text-sm font-black text-white">
                1
              </div>
              <h3 className="mt-5 text-sm font-black text-[#20273c]">Choose a mentor</h3>
              <p className="mt-2 text-xs leading-5 text-[#8f8790]">
                Browse profiles and find a mentor who matches your goals
              </p>
            </div>
            <div className="rounded-[20px] border border-[#d9eee6] bg-[#e8f7f1] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-white text-sm font-black text-[#238366]">
                2
              </div>
              <h3 className="mt-5 text-sm font-black text-[#20273c]">Book a session</h3>
              <p className="mt-2 text-xs leading-5 text-[#687b75]">
                Select a time slot and describe what you'd like to discuss
              </p>
            </div>
            <div className="rounded-[20px] border border-[#f0e8e3] bg-white p-5">
              <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#fff0e7] text-sm font-black text-[#c2410c]">
                3
              </div>
              <h3 className="mt-5 text-sm font-black text-[#20273c]">Get guidance</h3>
              <p className="mt-2 text-xs leading-5 text-[#8f8790]">
                Meet via video call and receive personalized advice
              </p>
            </div>
          </div>
      </section>

      <section className="mt-3 flex w-full flex-col items-start justify-between gap-5 rounded-[26px] bg-[#c2410c] px-6 py-8 text-white shadow-[0_22px_48px_rgba(194,65,12,0.20)] sm:flex-row sm:items-center sm:rounded-[32px] sm:px-9">
          <div>
            <h2 className="text-xl font-black">Your next breakthrough may be a conversation away.</h2>
            <p className="mt-1 text-xs text-white/65">Create your account and meet someone who has been there.</p>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl bg-white text-xs font-black text-[#c2410c] hover:bg-[#fff7ed]" asChild>
              <Link to="/signup">Get started free</Link>
            </Button>
            <Button className="rounded-xl border border-white/20 bg-white/10 text-xs font-black text-white hover:bg-white/15" asChild>
              <Link to="/login">Already have an account?</Link>
            </Button>
          </div>
      </section>
      </main>

      <Footer />
    </div>
  );
};

export default MentorshipPage;
