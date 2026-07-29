import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  MoreHorizontal,
  Star,
  Clock,
  MessageCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OperationsPage } from "./OperationsUI";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Mentor {
  id: string;
  name: string;
  expertise: string[];
  location: string;
  rating: number;
  totalSessions: number;
  hourlyRate: number;
  isAvailable: boolean;
  isVerified: boolean;
  joinedAt: string;
  yearsExp: number;
}

const AdminMentors = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const mentors: Mentor[] = [
    {
      id: "1",
      name: "Dr. Aarav Sharma",
      expertise: ["Machine Learning", "Python", "Data Science"],
      location: "Kathmandu, Nepal",
      rating: 4.9,
      totalSessions: 156,
      hourlyRate: 2500,
      isAvailable: true,
      isVerified: true,
      joinedAt: "Jan 5, 2026",
      yearsExp: 8,
    },
    {
      id: "2",
      name: "Priya Thapa",
      expertise: ["UI/UX Design", "Product Design", "Figma"],
      location: "Pokhara, Nepal",
      rating: 4.8,
      totalSessions: 98,
      hourlyRate: 2000,
      isAvailable: true,
      isVerified: true,
      joinedAt: "Jan 8, 2026",
      yearsExp: 6,
    },
    {
      id: "3",
      name: "Bikash Gurung",
      expertise: ["Full Stack", "React", "Node.js"],
      location: "Lalitpur, Nepal",
      rating: 4.7,
      totalSessions: 72,
      hourlyRate: 1800,
      isAvailable: true,
      isVerified: true,
      joinedAt: "Jan 10, 2026",
      yearsExp: 5,
    },
    {
      id: "4",
      name: "Suman Maharjan",
      expertise: ["DevOps", "AWS", "Kubernetes"],
      location: "Kathmandu, Nepal",
      rating: 4.6,
      totalSessions: 45,
      hourlyRate: 2200,
      isAvailable: false,
      isVerified: true,
      joinedAt: "Jan 12, 2026",
      yearsExp: 7,
    },
    {
      id: "5",
      name: "Anita Shrestha",
      expertise: ["Product Management", "Agile", "Strategy"],
      location: "Kathmandu, Nepal",
      rating: 4.5,
      totalSessions: 23,
      hourlyRate: 2800,
      isAvailable: true,
      isVerified: false,
      joinedAt: "Jan 18, 2026",
      yearsExp: 10,
    },
    {
      id: "6",
      name: "Rajesh Koirala",
      expertise: ["Leadership", "Team Management", "Startups"],
      location: "Bhaktapur, Nepal",
      rating: 4.4,
      totalSessions: 18,
      hourlyRate: 3000,
      isAvailable: true,
      isVerified: false,
      joinedAt: "Jan 22, 2026",
      yearsExp: 12,
    },
  ];

  const filteredMentors = mentors.filter(
    (mentor) =>
      mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mentor.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Mentors", value: mentors.length, icon: Users, color: "text-primary" },
    { label: "Verified", value: mentors.filter(m => m.isVerified).length, icon: CheckCircle, color: "text-success" },
    { label: "Available", value: mentors.filter(m => m.isAvailable).length, icon: Clock, color: "text-accent" },
    { label: "Total Sessions", value: mentors.reduce((sum, m) => sum + m.totalSessions, 0), icon: MessageCircle, color: "text-secondary" },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mentors</h1>
          <p className="text-muted-foreground">Manage platform mentors and their availability</p>
        </div>
        <Button variant="hero">
          Invite Mentor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search mentors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentor</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMentors.map((mentor) => (
                <TableRow key={mentor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                          {mentor.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{mentor.name}</p>
                        <p className="text-xs text-muted-foreground">{mentor.yearsExp} years exp.</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {mentor.expertise.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{mentor.expertise.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{mentor.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {mentor.totalSessions}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">NPR {mentor.hourlyRate.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/hr</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {mentor.isVerified ? (
                        <Badge className="bg-success/10 text-success border-success/20 w-fit">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 w-fit">
                          Pending
                        </Badge>
                      )}
                      {mentor.isAvailable ? (
                        <Badge variant="outline" className="w-fit text-xs">Available</Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-xs text-muted-foreground">Unavailable</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          View Sessions
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {mentor.isVerified ? "Revoke Verification" : "Verify"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </OperationsPage>
  );
};

export default AdminMentors;
