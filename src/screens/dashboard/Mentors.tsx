import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, Calendar, MessageCircle } from "lucide-react";
import BookingDialog from "@/components/mentors/BookingDialog";
import { useToast } from "@/hooks/use-toast";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSearch,
} from "@/components/dashboard/dashboardStyles";

interface Mentor {
  id: string;
  user_id: string;
  expertise: string[];
  hourly_rate: number | null;
  is_available: boolean;
  years_experience: number | null;
  rating: number | null;
  total_sessions: number | null;
  profile?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
  } | null;
}

const Mentors = () => {
  const { toast } = useToast();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<{
    id: string;
    name: string;
    hourlyRate: number;
    expertise: string[];
  } | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    const { data } = await supabase
      .from("mentors")
      .select("*")
      .eq("is_available", true);
    
    if (data) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio, location")
        .in("user_id", userIds);
      
      const mentorsWithProfiles = data.map(mentor => ({
        ...mentor,
        profile: profiles?.find(p => p.user_id === mentor.user_id) || null
      }));
      setMentors(mentorsWithProfiles as Mentor[]);
    }
    setIsLoading(false);
  };

  // Mock data for demonstration
  const mockMentors: Mentor[] = [
    {
      id: "1",
      user_id: "1",
      expertise: ["Machine Learning", "Python", "Data Science"],
      hourly_rate: 2500,
      is_available: true,
      years_experience: 8,
      rating: 4.9,
      total_sessions: 156,
      profile: {
        user_id: "1",
        full_name: "Dr. Aarav Sharma",
        avatar_url: null,
        bio: "Senior ML Engineer at Google. PhD in Computer Science. Passionate about teaching and mentoring the next generation of tech talent.",
        location: "Kathmandu, Nepal",
      },
    },
    {
      id: "2",
      user_id: "2",
      expertise: ["UI/UX Design", "Product Design", "Figma"],
      hourly_rate: 2000,
      is_available: true,
      years_experience: 6,
      rating: 4.8,
      total_sessions: 98,
      profile: {
        user_id: "2",
        full_name: "Priya Thapa",
        avatar_url: null,
        bio: "Lead Product Designer at a Y Combinator startup. Former design lead at Daraz. Love helping designers grow.",
        location: "Pokhara, Nepal",
      },
    },
    {
      id: "3",
      user_id: "3",
      expertise: ["Full Stack Development", "React", "Node.js"],
      hourly_rate: 1800,
      is_available: true,
      years_experience: 5,
      rating: 4.7,
      total_sessions: 72,
      profile: {
        user_id: "3",
        full_name: "Bikash Gurung",
        avatar_url: null,
        bio: "Full Stack Developer with experience at multiple startups. Love building products and teaching others to code.",
        location: "Lalitpur, Nepal",
      },
    },
  ];

  const displayMentors = mentors.length > 0 ? mentors : mockMentors;

  const filteredMentors = displayMentors.filter(
    (mentor) =>
      mentor.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleBookSession = (mentor: Mentor) => {
    setSelectedMentor({
      id: mentor.id,
      name: mentor.profile?.full_name || "Mentor",
      hourlyRate: mentor.hourly_rate || 0,
      expertise: mentor.expertise,
    });
    setIsBookingOpen(true);
  };

  const handleMessage = (mentorName: string) => {
    toast({
      title: "Message sent",
      description: `Opening chat with ${mentorName}...`,
    });
  };

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Guidance, on demand"
        title="Find a mentor"
        description="Book focused time with experienced builders who can unblock your next career move."
      />

      <div className="relative max-w-xl rounded-[22px] border border-[#f0e2d7] bg-white p-3 shadow-[0_14px_40px_rgba(69,42,21,0.045)]">
        <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99919a]" />
        <Input
          type="search"
          placeholder="Search by name or expertise..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${dashboardSearch} border-transparent bg-[#fff8f2] pl-10 shadow-none`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className={`${dashboardInteractiveSurface} overflow-hidden`}>
            <div className="h-1.5 bg-[#c2410c]" />
            <CardHeader className="px-5 pb-4 pt-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[22px] bg-[#fff0e4] text-xl font-black text-[#e76509] ring-4 ring-[#fff8f2]">
                  {mentor.profile?.full_name?.charAt(0) || "M"}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{mentor.profile?.full_name}</CardTitle>
                  <CardDescription className="text-sm">
                    {mentor.profile?.location}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{mentor.rating}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      ({mentor.total_sessions} sessions)
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-5 pb-5">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {mentor.profile?.bio}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {mentor.expertise.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {mentor.expertise.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{mentor.expertise.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {mentor.years_experience} years exp.
                </div>
                <div className="font-bold text-[#e76509]">
                  NPR {mentor.hourly_rate}/hr
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl border-[#e9dad0] bg-white hover:border-[#c2410c]/50 hover:bg-[#fff7f0]"
                  onClick={() => handleMessage(mentor.profile?.full_name || "Mentor")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button 
                  variant="hero" 
                  className={`flex-1 ${dashboardPrimaryButton}`}
                  onClick={() => handleBookSession(mentor)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No mentors found matching your search.</p>
        </div>
      )}

      {/* Booking Dialog */}
      {selectedMentor && (
        <BookingDialog
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            setSelectedMentor(null);
          }}
          mentor={selectedMentor}
        />
      )}
    </div>
  );
};

export default Mentors;
