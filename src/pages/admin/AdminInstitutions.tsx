import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building2, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  MoreHorizontal,
  Plus,
  Globe,
  GraduationCap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Institution {
  id: string;
  name: string;
  type: string;
  location: string;
  students: number;
  competitions: number;
  isVerified: boolean;
  joinedAt: string;
  logo: string;
  website?: string;
}

const AdminInstitutions = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const institutions: Institution[] = [
    {
      id: "1",
      name: "Tribhuvan University",
      type: "University",
      location: "Kathmandu, Nepal",
      students: 1234,
      competitions: 45,
      isVerified: true,
      joinedAt: "Jan 5, 2026",
      logo: "🏛️",
      website: "tu.edu.np",
    },
    {
      id: "2",
      name: "Kathmandu University",
      type: "University",
      location: "Dhulikhel, Nepal",
      students: 876,
      competitions: 38,
      isVerified: true,
      joinedAt: "Jan 10, 2026",
      logo: "🎓",
      website: "ku.edu.np",
    },
    {
      id: "3",
      name: "Pulchowk Engineering Campus",
      type: "Engineering College",
      location: "Lalitpur, Nepal",
      students: 543,
      competitions: 67,
      isVerified: true,
      joinedAt: "Jan 12, 2026",
      logo: "⚙️",
    },
    {
      id: "4",
      name: "Islington College",
      type: "College",
      location: "Kathmandu, Nepal",
      students: 432,
      competitions: 23,
      isVerified: true,
      joinedAt: "Jan 15, 2026",
      logo: "📚",
    },
    {
      id: "5",
      name: "Herald College",
      type: "College",
      location: "Kathmandu, Nepal",
      students: 321,
      competitions: 15,
      isVerified: false,
      joinedAt: "Jan 20, 2026",
      logo: "🎒",
    },
    {
      id: "6",
      name: "Softwarica College",
      type: "IT College",
      location: "Kathmandu, Nepal",
      students: 287,
      competitions: 28,
      isVerified: false,
      joinedAt: "Jan 22, 2026",
      logo: "💻",
    },
  ];

  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Institutions", value: institutions.length, icon: Building2, color: "text-primary" },
    { label: "Verified", value: institutions.filter(i => i.isVerified).length, icon: CheckCircle, color: "text-success" },
    { label: "Pending Verification", value: institutions.filter(i => !i.isVerified).length, icon: XCircle, color: "text-warning" },
    { label: "Total Students", value: institutions.reduce((sum, i) => sum + i.students, 0).toLocaleString(), icon: Users, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutions</h1>
          <p className="text-muted-foreground">Manage registered educational institutions</p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Add Institution
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
          placeholder="Search institutions..."
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
                <TableHead>Institution</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Competitions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                        {institution.logo}
                      </div>
                      <div>
                        <p className="font-medium">{institution.name}</p>
                        {institution.website && (
                          <a 
                            href={`https://${institution.website}`} 
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {institution.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <GraduationCap className="w-3 h-3" />
                      {institution.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {institution.location}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {institution.students.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {institution.competitions}
                  </TableCell>
                  <TableCell>
                    {institution.isVerified ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pending
                      </Badge>
                    )}
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
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {institution.isVerified ? "Revoke Verification" : "Verify"}
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
    </div>
  );
};

export default AdminInstitutions;
