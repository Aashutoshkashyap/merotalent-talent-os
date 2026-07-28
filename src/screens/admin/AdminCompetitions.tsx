import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, Users, Trophy, Loader2 } from "lucide-react";

interface Competition {
  id: string;
  title: string;
  type: string | null;
  format: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  prize_pool: string | null;
  created_at: string;
}

const AdminCompetitions = () => {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [newCompetition, setNewCompetition] = useState({
    title: "",
    description: "",
    type: "hackathon",
    format: "online",
    start_date: "",
    end_date: "",
    registration_deadline: "",
    max_participants: "",
    prize_pool: "",
    is_team_based: false,
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setCompetitions(data);
    setIsLoading(false);
  };

  const createCompetition = async () => {
    if (!user) return;
    setIsCreating(true);

    const { error } = await supabase.from("competitions").insert({
      ...newCompetition,
      max_participants: newCompetition.max_participants ? parseInt(newCompetition.max_participants) : null,
      organizer_id: user.id,
      organizer_type: "admin",
      status: "draft",
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating competition",
        description: error.message,
      });
    } else {
      toast({
        title: "Competition created!",
        description: "The competition has been created as a draft.",
      });
      setIsDialogOpen(false);
      setNewCompetition({
        title: "",
        description: "",
        type: "hackathon",
        format: "online",
        start_date: "",
        end_date: "",
        registration_deadline: "",
        max_participants: "",
        prize_pool: "",
        is_team_based: false,
      });
      fetchCompetitions();
    }
    setIsCreating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("competitions")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: error.message,
      });
    } else {
      toast({
        title: "Status updated",
        description: `Competition status changed to ${status}.`,
      });
      fetchCompetitions();
    }
  };

  const filteredCompetitions = competitions.filter((comp) =>
    comp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "upcoming":
        return "bg-primary/10 text-primary";
      case "ongoing":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-secondary/10 text-secondary";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Manage Competitions</h1>
          <p className="text-muted-foreground">Create and manage platform competitions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Competition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Competition</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new competition.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newCompetition.title}
                  onChange={(e) => setNewCompetition({ ...newCompetition, title: e.target.value })}
                  placeholder="Competition title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCompetition.description}
                  onChange={(e) => setNewCompetition({ ...newCompetition, description: e.target.value })}
                  placeholder="Describe the competition..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newCompetition.type}
                    onValueChange={(value) => setNewCompetition({ ...newCompetition, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hackathon">Hackathon</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="coding">Coding Challenge</SelectItem>
                      <SelectItem value="case_study">Case Study</SelectItem>
                      <SelectItem value="design">Design Challenge</SelectItem>
                      <SelectItem value="project">Project Competition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={newCompetition.format}
                    onValueChange={(value) => setNewCompetition({ ...newCompetition, format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newCompetition.start_date}
                    onChange={(e) => setNewCompetition({ ...newCompetition, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newCompetition.end_date}
                    onChange={(e) => setNewCompetition({ ...newCompetition, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={newCompetition.max_participants}
                    onChange={(e) => setNewCompetition({ ...newCompetition, max_participants: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_pool">Prize Pool</Label>
                  <Input
                    id="prize_pool"
                    value={newCompetition.prize_pool}
                    onChange={(e) => setNewCompetition({ ...newCompetition, prize_pool: e.target.value })}
                    placeholder="e.g., NPR 100,000"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createCompetition} disabled={isCreating || !newCompetition.title}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Competition"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search competitions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Competitions Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competition</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompetitions.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{comp.title}</p>
                        <p className="text-xs text-muted-foreground">{comp.prize_pool}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{comp.type}</TableCell>
                  <TableCell className="capitalize">{comp.format}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(comp.status)}>
                      {comp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {comp.start_date ? new Date(comp.start_date).toLocaleDateString() : "TBD"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={comp.status || "draft"}
                      onValueChange={(value) => updateStatus(comp.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCompetitions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {isLoading ? "Loading competitions..." : "No competitions found. Create one to get started!"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCompetitions;
