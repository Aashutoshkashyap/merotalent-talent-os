import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Calendar, Users, Trophy, MapPin, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardPrimaryButton,
  dashboardSearch,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [selectedDetailCompetition, setSelectedDetailCompetition] = useState<Competition | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompetitions();
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const fetchCompetitions = async () => {
    try {
      const res = await fetch("/api/v1/competitions");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setCompetitions(json.data);
      }
    } catch {
      setCompetitions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/v1/competitions/registrations");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setRegisteredIds(new Set(json.data));
      }
    } catch {
      setRegisteredIds(new Set());
    }
  };

  const handleRegister = async () => {
    if (!user || !selectedCompetition) return;
    setIsRegistering(true);

    try {
      const res = await fetch("/api/v1/competitions/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId: selectedCompetition.id,
          teamName: selectedCompetition.is_team_based ? teamName : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Registration failed.");

      toast({
        title: "Registered successfully!",
        description: `You're now registered for ${selectedCompetition.title}. You can track it in your dashboard.`,
      });
      setRegisteredIds(prev => new Set([...prev, selectedCompetition.id]));
      setIsRegisterOpen(false);
      setTeamName("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err.message || "Failed to register.",
      });
    } finally {
      setIsRegistering(false);
    }
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
      case "hackathon": return "🚀";
      case "quiz": return "📝";
      case "coding": return "💻";
      case "case_study": return "📊";
      case "design": return "🎨";
      case "project": return "🔨";
      default: return "🏆";
    }
  };

  const displayCompetitions = filteredCompetitions;

  const openRegistration = (comp: Competition) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please log in to register for competitions.",
      });
      return;
    }
    setSelectedCompetition(comp);
    setIsRegisterOpen(true);
  };

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Compete & grow"
        title="Competitions"
        description="Find a challenge that matches your strengths, build with others and turn your work into proof."
      />

      <div className="flex flex-col gap-4 rounded-[22px] border border-[#f0e2d7] bg-white p-3 shadow-[0_14px_40px_rgba(69,42,21,0.045)] md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99919a]" />
          <Input
            type="search"
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${dashboardSearch} border-transparent bg-[#fff8f2] pl-10 shadow-none`}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className={dashboardTabs}>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="registered">My Registrations</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {displayCompetitions.map((comp) => (
              <Card key={comp.id} className={`${dashboardInteractiveSurface} group overflow-hidden`}>
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-[#fff0e4]">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#ffd8bb]" />
                  <div className="absolute bottom-5 left-7 h-3 w-3 rounded-full bg-[#68c9ad]" />
                  <span className="relative text-5xl drop-shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">{getTypeIcon(comp.type)}</span>
                  <Badge className={`absolute top-3 right-3 ${getStatusColor(comp.status)}`}>
                    {comp.status}
                  </Badge>
                  {registeredIds.has(comp.id) && (
                    <Badge className="absolute top-3 left-3 bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  )}
                </div>

                <CardHeader className="px-5 pb-2 pt-5">
                  <CardTitle className="text-lg font-black tracking-[-0.025em] transition-colors group-hover:text-[#c2410c]">
                    {comp.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {comp.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-5 pb-5">
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
                      <div className="flex items-center gap-1 text-sm font-bold text-[#e76509]">
                        <Trophy className="w-4 h-4" />
                        {comp.prize_pool}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 items-center justify-between">
                      <div className="flex gap-1.5">
                        {comp.is_team_based && (
                          <Badge variant="outline" className="text-xs">Team</Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">{comp.type}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => setSelectedDetailCompetition(comp)}
                      >
                        View Details
                      </Button>
                    </div>

                    <Button 
                      className={`mt-2 w-full rounded-xl ${registeredIds.has(comp.id) ? "" : dashboardPrimaryButton}`}
                      variant={registeredIds.has(comp.id) ? "outline" : "hero"}
                      onClick={() => openRegistration(comp)}
                      disabled={registeredIds.has(comp.id)}
                    >
                      {registeredIds.has(comp.id) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Already Registered
                        </>
                      ) : (
                        <>
                          Register Now
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {displayCompetitions
              .filter((c) => c.status === "upcoming")
              .map((comp) => (
                <Card key={comp.id} className={dashboardSurface}>
                  <CardHeader>
                    <CardTitle>{comp.title}</CardTitle>
                    <CardDescription>{comp.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2 rounded-xl text-xs font-bold"
                        onClick={() => setSelectedDetailCompetition(comp)}
                      >
                        View Details
                      </Button>
                      <Button 
                        className={`w-1/2 rounded-xl ${dashboardPrimaryButton}`}
                        variant="hero"
                        size="sm"
                        onClick={() => openRegistration(comp)}
                        disabled={registeredIds.has(comp.id)}
                      >
                        {registeredIds.has(comp.id) ? "Registered" : "Register"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="registered" className="mt-6">
          {Array.from(registeredIds).length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {displayCompetitions
                .filter((c) => registeredIds.has(c.id))
                .map((comp) => (
                  <Card key={comp.id} className={`${dashboardSurface} border-[#68c9ad]/60`}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <CardTitle className="text-lg">{comp.title}</CardTitle>
                      </div>
                      <CardDescription>{comp.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Starts: {comp.start_date ? new Date(comp.start_date).toLocaleDateString() : "TBD"}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => setSelectedDetailCompetition(comp)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              You haven't registered for any competitions yet.
            </p>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <p className="text-muted-foreground text-center py-8">No completed competitions yet.</p>
        </TabsContent>
      </Tabs>

      {/* Individual Competition Detail Modal Dialog */}
      <Dialog open={selectedDetailCompetition !== null} onOpenChange={(open) => { if (!open) setSelectedDetailCompetition(null); }}>
        <DialogContent className="max-w-xl rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          {selectedDetailCompetition && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize text-xs font-bold">
                    {selectedDetailCompetition.type || "Competition"}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary capitalize text-xs font-bold">
                    {selectedDetailCompetition.status}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-black text-slate-900 mt-2">
                  {selectedDetailCompetition.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-slate-500 mt-1">
                  Format: {selectedDetailCompetition.format || "Online"} · {selectedDetailCompetition.is_team_based ? "Team Participation" : "Individual Event"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 bg-[#fff7f2] p-3 rounded-2xl border border-[#ffe3d1] text-center text-xs font-bold">
                <div>
                  <span className="text-[10px] uppercase text-[#9a939c] block font-extrabold">Prize Pool</span>
                  <span className="text-[#c2410c]">{selectedDetailCompetition.prize_pool || "Recognition Award"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#9a939c] block font-extrabold">Start Date</span>
                  <span className="text-slate-800">
                    {selectedDetailCompetition.start_date ? new Date(selectedDetailCompetition.start_date).toLocaleDateString() : "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#9a939c] block font-extrabold">Spots Limit</span>
                  <span className="text-slate-800">{selectedDetailCompetition.max_participants || "Open"}</span>
                </div>
              </div>

              {selectedDetailCompetition.description && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-1">Competition Details</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedDetailCompetition.description}</p>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-3">
                <Button
                  className={`rounded-xl px-6 ${registeredIds.has(selectedDetailCompetition.id) ? "" : dashboardPrimaryButton}`}
                  variant={registeredIds.has(selectedDetailCompetition.id) ? "outline" : "hero"}
                  disabled={registeredIds.has(selectedDetailCompetition.id)}
                  onClick={() => {
                    const comp = selectedDetailCompetition;
                    setSelectedDetailCompetition(null);
                    openRegistration(comp);
                  }}
                >
                  {registeredIds.has(selectedDetailCompetition.id) ? "Already Registered" : "Register / Participate Now"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registration Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for {selectedCompetition?.title}</DialogTitle>
            <DialogDescription>
              {selectedCompetition?.is_team_based 
                ? "This is a team-based competition. Enter your team name below."
                : "Confirm your registration for this competition."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Full Name *</Label>
                <Input value={user?.user_metadata?.full_name || profile?.full_name || ""} disabled className="bg-slate-100 text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Email *</Label>
                <Input value={user?.email || ""} disabled className="bg-slate-100 text-xs h-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contact Phone (Nepal) *</Label>
                <Input placeholder="e.g. 9801010802" className="text-xs h-9" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Address *</Label>
                <Input placeholder="e.g. Lalitpur, Nepal" className="text-xs h-9" required />
              </div>
            </div>

            {selectedCompetition?.is_team_based && (
              <div className="space-y-2">
                <Label htmlFor="team-name" className="text-xs font-bold">Team Name *</Label>
                <Input
                  id="team-name"
                  placeholder="Enter your team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            )}

            <div className="space-y-2 rounded-2xl bg-[#fff6ef] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Competition</span>
                <span className="font-medium">{selectedCompetition?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">
                  {selectedCompetition?.start_date 
                    ? new Date(selectedCompetition.start_date).toLocaleDateString() 
                    : "TBD"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prize Pool</span>
                <span className="font-medium text-primary">{selectedCompetition?.prize_pool}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              className={dashboardPrimaryButton}
              onClick={handleRegister}
              disabled={isRegistering || (selectedCompetition?.is_team_based && !teamName.trim())}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                "Confirm Registration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Competitions;
