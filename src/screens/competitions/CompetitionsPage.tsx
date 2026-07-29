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
import { 
  Trophy, 
  Calendar, 
  Users, 
  Search, 
  Clock, 
  Award,
  Target,
  Zap,
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
        return <Badge className="rounded-full border border-[#fed7aa] bg-[#fff7ed] text-[8px] font-black text-[#c2410c] hover:bg-[#fff7ed]">Upcoming</Badge>;
      case "active":
        return <Badge className="rounded-full bg-[#e8f7f1] text-[8px] font-black text-[#238366] hover:bg-[#e8f7f1]">Live Now</Badge>;
      case "completed":
        return <Badge variant="secondary" className="rounded-full text-[8px] font-black">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4dfd4]">
      <Navbar />
      <main className="px-3 pb-6 pt-[84px] sm:px-5 sm:pb-8 sm:pt-[96px] lg:px-8">
        <section className="mx-auto max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] p-5 shadow-[0_28px_70px_rgba(99,55,29,0.11)] sm:rounded-[32px] sm:p-7 lg:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-[9px] font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
                <Trophy className="mr-1 h-3 w-3" />
                Compete & Win
              </Badge>
              <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
                Put your skills where people can <span className="text-[#c2410c]">see them.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
                Join hackathons, coding challenges and design competitions. Win prizes, earn badges and get noticed.
              </p>
              <div className="relative mt-7 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
                <Input
                  placeholder="Search competitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                [competitions?.length || 0, "Total challenges", "orange"],
                [competitions?.filter(c => c.status === "active").length || 0, "Live now", "mint"],
                ["NPR 5L+", "Active prizes", "plain"],
                ["2K+", "Participants", "plain"],
              ].map(([value, label, tone]) => (
                <div key={String(label)} className={`min-h-[96px] rounded-[18px] border p-4 ${tone === "mint" ? "border-[#d9eee6] bg-[#e8f7f1]" : tone === "orange" ? "border-[#f7dfd1] bg-[#fff3ec]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                  <p className={`text-xl font-black ${tone === "mint" ? "text-[#238366]" : tone === "orange" ? "text-[#c2410c]" : "text-[#172039]"}`}>{value}</p>
                  <p className="mt-3 text-[9px] font-bold text-[#8e868e]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-3 max-w-[1420px] rounded-[22px] border border-white/80 bg-[#fffdfb] px-4 py-4 shadow-[0_16px_38px_rgba(99,55,29,0.07)] sm:px-6">
          <div className="flex flex-wrap gap-2">
            {competitionTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.id)}
                className={`h-8 rounded-full border-[#ece3de] px-3 text-[9px] font-black ${selectedType === type.id ? "bg-[#c2410c] hover:bg-[#9a3412]" : "bg-white text-[#746d75] hover:border-[#fdba74] hover:text-[#c2410c]"}`}
              >
                <type.icon className="mr-1 h-3.5 w-3.5" />
                {type.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-3 max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] p-3 shadow-[0_24px_60px_rgba(99,55,29,0.09)] sm:rounded-[32px] sm:p-5 lg:p-7">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse rounded-[22px] border-[#f0e8e3]">
                  <div className="h-40 rounded-t-[22px] bg-[#f5efeb]" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-[#f5efeb]" />
                    <div className="h-3 w-1/2 rounded bg-[#f5efeb]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCompetitions && filteredCompetitions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              {filteredCompetitions.map((competition) => (
                <Card key={competition.id} className="group overflow-hidden rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)] lg:col-span-4">
                  <div className="flex h-36 items-center justify-center bg-[#fff3ec]">
                    <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white text-[#c2410c] shadow-[0_12px_25px_rgba(249,115,22,0.14)]">
                      <Trophy className="h-7 w-7 transition-transform group-hover:scale-110" />
                    </span>
                  </div>
                  <CardHeader className="px-5 pb-2 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      {getStatusBadge(competition.status)}
                      {competition.prize_pool && (
                        <Badge variant="outline" className="rounded-full border-[#f7dfd1] text-[8px] font-black text-[#c2410c]">
                          {competition.prize_pool}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2 text-base font-black text-[#20273c] transition-colors group-hover:text-[#c2410c]">
                      {competition.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-[10px] leading-5 text-[#8f8790]">
                      {competition.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 pb-5">
                    <div className="flex items-center justify-between text-[9px] text-[#8f8790]">
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
                      <div className="flex items-center gap-1 text-[9px] font-bold text-[#c2410c]">
                        <Clock className="w-4 h-4" />
                        Register by {format(new Date(competition.registration_deadline), "MMM d")}
                      </div>
                    )}

                    <Button className="h-9 w-full rounded-xl bg-[#c2410c] text-[9px] font-black hover:bg-[#9a3412]" asChild>
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
            <div className="py-14 text-center">
              <Trophy className="mx-auto mb-4 h-14 w-14 text-[#d9cfc9]" />
              <h3 className="mb-2 text-lg font-black text-[#20273c]">No competitions found</h3>
              <p className="text-sm text-[#8f8790]">
                {searchQuery ? "Try adjusting your search" : "Check back soon for new competitions"}
              </p>
            </div>
          )}
        </section>

        <section className="mx-auto mt-3 flex max-w-[1420px] flex-col items-start justify-between gap-5 rounded-[26px] bg-[#c2410c] px-6 py-8 text-white shadow-[0_22px_48px_rgba(194,65,12,0.20)] sm:flex-row sm:items-center sm:rounded-[32px] sm:px-9">
          <div>
            <h2 className="text-xl font-black">Ready to put your talent on the board?</h2>
            <p className="mt-1 text-xs text-white/65">Join a live challenge and create proof that travels with you.</p>
          </div>
          <Button className="rounded-xl bg-white text-[10px] font-black text-[#c2410c] hover:bg-[#fff7ed]" asChild>
            <Link to="/signup">Get started free <Zap className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CompetitionsPage;
