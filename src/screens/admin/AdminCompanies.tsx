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
  Building2, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  MoreHorizontal,
  Plus,
  Globe,
  Briefcase
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  jobsPosted: number;
  isVerified: boolean;
  joinedAt: string;
  logo: string;
  website?: string;
}

const AdminCompanies = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const companies: Company[] = [
    {
      id: "1",
      name: "TechNP Solutions",
      industry: "Technology",
      location: "Kathmandu, Nepal",
      size: "50-100",
      jobsPosted: 12,
      isVerified: true,
      joinedAt: "Jan 5, 2026",
      logo: "🏢",
      website: "technp.com",
    },
    {
      id: "2",
      name: "AI Nepal Labs",
      industry: "AI/ML",
      location: "Lalitpur, Nepal",
      size: "20-50",
      jobsPosted: 8,
      isVerified: true,
      joinedAt: "Jan 8, 2026",
      logo: "🤖",
      website: "ainepallabs.com",
    },
    {
      id: "3",
      name: "DigitalKraft",
      industry: "Design Agency",
      location: "Kathmandu, Nepal",
      size: "10-20",
      jobsPosted: 5,
      isVerified: true,
      joinedAt: "Jan 10, 2026",
      logo: "🎨",
    },
    {
      id: "4",
      name: "CloudNP",
      industry: "Cloud Services",
      location: "Remote",
      size: "20-50",
      jobsPosted: 6,
      isVerified: true,
      joinedAt: "Jan 12, 2026",
      logo: "☁️",
      website: "cloudnp.io",
    },
    {
      id: "5",
      name: "StartupNP",
      industry: "Startup Studio",
      location: "Kathmandu, Nepal",
      size: "10-20",
      jobsPosted: 3,
      isVerified: false,
      joinedAt: "Jan 18, 2026",
      logo: "🚀",
    },
    {
      id: "6",
      name: "FinTech Nepal",
      industry: "Financial Technology",
      location: "Kathmandu, Nepal",
      size: "100-200",
      jobsPosted: 15,
      isVerified: false,
      joinedAt: "Jan 22, 2026",
      logo: "💰",
    },
  ];

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Companies", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Verified", value: companies.filter(c => c.isVerified).length, icon: CheckCircle, color: "text-success" },
    { label: "Pending", value: companies.filter(c => !c.isVerified).length, icon: XCircle, color: "text-warning" },
    { label: "Total Jobs Posted", value: companies.reduce((sum, c) => sum + c.jobsPosted, 0), icon: Briefcase, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage registered companies and recruiters</p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
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
          placeholder="Search companies..."
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
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Size</TableHead>
                <TableHead className="text-center">Jobs Posted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                        {company.logo}
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        {company.website && (
                          <a 
                            href={`https://${company.website}`} 
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {company.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{company.industry}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {company.location}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto">
                      <Users className="w-3 h-3" />
                      {company.size}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {company.jobsPosted}
                  </TableCell>
                  <TableCell>
                    {company.isVerified ? (
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
                          <Briefcase className="w-4 h-4 mr-2" />
                          View Jobs
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {company.isVerified ? "Revoke Verification" : "Verify"}
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

export default AdminCompanies;
