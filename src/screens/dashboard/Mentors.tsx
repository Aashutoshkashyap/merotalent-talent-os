import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, Calendar, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [selectedDetailMentor, setSelectedDetailMentor] = useState<Mentor | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const res = await fetch("/api/v1/mentors");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to load mentors.");
      const data = json.data || [];
      const mentorsWithProfiles = data.map((m: any) => ({
        ...m,
        expertise: Array.isArray(m.expertise) ? m.expertise : [],
        profile: {
          user_id: m.user_id,
          full_name: m.full_name || m.profiles?.full_name || "Mentor",
          avatar_url: m.avatar_url || m.profiles?.avatar_url || null,
          bio: m.description || m.profiles?.bio || null,
          location: m.location || m.profiles?.location || null,
        },
      }));
      setMentors(mentorsWithProfiles as Mentor[]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load mentors",
        description: error instanceof Error ? error.message : "Failed to load mentors.",
      });
      setMentors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const displayMentors = mentors;

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
                  className="flex-1 rounded-xl text-xs font-bold border-[#e9dad0] bg-white hover:bg-slate-50"
                  onClick={() => setSelectedDetailMentor(mentor)}
                >
                  View Profile
                </Button>
                <Button 
                  variant="hero" 
                  className={`flex-1 text-xs font-extrabold ${dashboardPrimaryButton}`}
                  onClick={() => handleBookSession(mentor)}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
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

      {/* Individual Mentor Profile Detail Modal Dialog */}
      <Dialog open={selectedDetailMentor !== null} onOpenChange={(open) => { if (!open) setSelectedDetailMentor(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          {selectedDetailMentor && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[22px] bg-[#fff0e4] text-xl font-black text-[#e76509] ring-4 ring-[#fff8f2]">
                    {selectedDetailMentor.profile?.full_name?.charAt(0) || "M"}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black text-slate-900">
                      {selectedDetailMentor.profile?.full_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold text-slate-500 mt-0.5">
                      {selectedDetailMentor.profile?.location || "Nepal"} · {selectedDetailMentor.years_experience || 3}+ Years Experience
                    </DialogDescription>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-600 mt-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      <span>{selectedDetailMentor.rating || 5.0}</span>
                      <span className="text-slate-400 font-medium">({selectedDetailMentor.total_sessions || 12} sessions completed)</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="bg-[#fff7f2] p-3.5 rounded-2xl border border-[#ffe4d1] flex items-center justify-between text-xs font-bold">
                <span className="text-[#9a939c]">1-on-1 Session Rate</span>
                <span className="text-[#c2410c] text-sm font-black">NPR {selectedDetailMentor.hourly_rate || 1000} / hr</span>
              </div>

              {selectedDetailMentor.profile?.bio && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-1">About & Background</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedDetailMentor.profile.bio}</p>
                </div>
              )}

              {selectedDetailMentor.expertise.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">Areas of Expertise</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailMentor.expertise.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs font-semibold">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl text-xs font-bold"
                  onClick={() => {
                    const name = selectedDetailMentor.profile?.full_name || "Mentor";
                    setSelectedDetailMentor(null);
                    handleMessage(name);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button 
                  variant="hero" 
                  className={`flex-1 text-xs font-extrabold ${dashboardPrimaryButton}`}
                  onClick={() => {
                    const m = selectedDetailMentor;
                    setSelectedDetailMentor(null);
                    handleBookSession(m);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Session
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
