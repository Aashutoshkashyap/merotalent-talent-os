import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MessageSquare, Search, Mail, User, Clock, CheckCircle, AlertCircle,
  Eye, Reply, Trash2, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockQueries = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    subject: "Course enrollment issue",
    message: "I'm having trouble enrolling in the Full Stack Web Development course. The payment went through but I can't access the course.",
    status: "pending",
    created_at: "2 hours ago",
    assigned_to: null,
  },
  {
    id: "2",
    name: "Sarah Smith",
    email: "sarah@example.com",
    subject: "Question about competitions",
    message: "I want to know more about how the competition scoring works and how winners are selected.",
    status: "in_progress",
    created_at: "1 day ago",
    assigned_to: "Mike Manager",
  },
  {
    id: "3",
    name: "Alex Johnson",
    email: "alex@example.com",
    subject: "Partnership inquiry",
    message: "Our company is interested in partnering with Merotalent for campus recruitment. Please provide more details.",
    status: "resolved",
    created_at: "3 days ago",
    assigned_to: "Lisa Lead",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "resolved":
      return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Resolved</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />In Progress</Badge>;
    default:
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  }
};

const AdminQueries = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuery, setSelectedQuery] = useState<typeof mockQueries[0] | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const { toast } = useToast();

  const filteredQueries = mockQueries.filter((query) => {
    const matchesSearch =
      query.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || query.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsReplying(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Reply sent!",
      description: "Your response has been emailed to the user.",
    });

    setIsReplying(false);
    setReplyText("");
    setSelectedQuery(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Contact Queries</h1>
        <p className="text-muted-foreground">Manage and respond to user inquiries from the contact form</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Pending", value: mockQueries.filter((q) => q.status === "pending").length, color: "text-amber-500" },
          { label: "In Progress", value: mockQueries.filter((q) => q.status === "in_progress").length, color: "text-primary" },
          { label: "Resolved", value: mockQueries.filter((q) => q.status === "resolved").length, color: "text-green-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queries Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueries.map((query) => (
              <TableRow key={query.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{query.name}</p>
                      <p className="text-sm text-muted-foreground">{query.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium line-clamp-1">{query.subject}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{query.message}</p>
                </TableCell>
                <TableCell>{getStatusBadge(query.status)}</TableCell>
                <TableCell>
                  {query.assigned_to ? (
                    <span className="text-sm">{query.assigned_to}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{query.created_at}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedQuery(query)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedQuery(query)}>
                      <Reply className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Query Detail Dialog */}
      <Dialog open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Query Details
            </DialogTitle>
          </DialogHeader>

          {selectedQuery && (
            <div className="space-y-6 py-4">
              {/* Sender Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedQuery.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {selectedQuery.email}
                  </div>
                </div>
                {getStatusBadge(selectedQuery.status)}
              </div>

              {/* Message */}
              <div>
                <h4 className="font-semibold mb-2">{selectedQuery.subject}</h4>
                <p className="text-muted-foreground">{selectedQuery.message}</p>
              </div>

              {/* Reply Section */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold">Send Reply</h4>
                <Textarea
                  placeholder="Type your response here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <Select defaultValue="resolve">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolve">Mark as Resolved</SelectItem>
                      <SelectItem value="progress">Keep In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="hero" onClick={handleReply} disabled={isReplying || !replyText.trim()}>
                    {isReplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Reply className="w-4 h-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQueries;
