import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bell, Plus, Send, Users, User, AlertTriangle, Info, CheckCircle, Clock,
  MessageSquare, Trash2, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockNotifications = [
  {
    id: "1",
    title: "New Competition Announced",
    message: "A new AI Challenge competition has been scheduled for next month.",
    type: "info",
    category: "competition",
    recipients: "All Admins",
    sentAt: "2 hours ago",
    readCount: 8,
    totalRecipients: 12,
  },
  {
    id: "2",
    title: "System Maintenance Scheduled",
    message: "Platform will undergo maintenance on Sunday 2-4 AM.",
    type: "warning",
    category: "admin",
    recipients: "All Admins",
    sentAt: "1 day ago",
    readCount: 12,
    totalRecipients: 12,
  },
  {
    id: "3",
    title: "New Course Published",
    message: "The Machine Learning course is now live and accepting enrollments.",
    type: "success",
    category: "course",
    recipients: "LMS Managers",
    sentAt: "3 days ago",
    readCount: 5,
    totalRecipients: 6,
  },
];

const mockAdmins = [
  { id: "1", name: "Sarah Admin", email: "sarah@merotalent.com", role: "Content Manager", lastActive: "2 hours ago" },
  { id: "2", name: "Mike Manager", email: "mike@merotalent.com", role: "LMS Manager", lastActive: "5 hours ago" },
  { id: "3", name: "Lisa Lead", email: "lisa@merotalent.com", role: "Job Manager", lastActive: "1 day ago" },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "success":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    default:
      return <Info className="w-4 h-4 text-primary" />;
  }
};

const AdminNotifications = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    recipients: "all",
  });
  const { toast } = useToast();

  const handleSendNotification = () => {
    toast({
      title: "Notification sent!",
      description: "Your message has been delivered to the selected recipients.",
    });
    setIsCreateOpen(false);
    setNewNotification({ title: "", message: "", type: "info", recipients: "all" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Notification Center</h1>
          <p className="text-muted-foreground">Send announcements and manage admin communications</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Send New Notification
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Notification title"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your message here..."
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select
                    value={newNotification.recipients}
                    onValueChange={(value) => setNewNotification({ ...newNotification, recipients: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Admins</SelectItem>
                      <SelectItem value="content">Content Managers</SelectItem>
                      <SelectItem value="lms">LMS Managers</SelectItem>
                      <SelectItem value="jobs">Job Managers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="hero" className="w-full" onClick={handleSendNotification}>
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: "156", icon: Bell, color: "text-primary" },
          { label: "Active Admins", value: "12", icon: Users, color: "text-secondary" },
          { label: "Unread Messages", value: "8", icon: MessageSquare, color: "text-amber-500" },
          { label: "This Week", value: "23", icon: Clock, color: "text-green-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sent">
        <TabsList>
          <TabsTrigger value="sent" className="gap-2">
            <Bell className="w-4 h-4" />
            Sent Notifications
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <Users className="w-4 h-4" />
            Admin Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Read Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockNotifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {getTypeIcon(notification.type)}
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {notification.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{notification.recipients}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(notification.readCount / notification.totalRecipients) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {notification.readCount}/{notification.totalRecipients}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{notification.sentAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Team Members</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{admin.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{admin.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotifications;
