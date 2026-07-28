import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Plus, Shield, UserPlus, Pencil, Trash2, Mail, User,
  BookOpen, Briefcase, Trophy, MessageSquare, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockAdmins = [
  {
    id: "1",
    name: "Super Admin",
    email: "jhaaashutosh933@gmail.com",
    role: "super_admin",
    permissions: ["all"],
    status: "active",
    addedAt: "2025-01-01",
  },
  {
    id: "2",
    name: "Sarah Content",
    email: "sarah@merotalent.com",
    role: "admin",
    permissions: ["lms", "competitions"],
    status: "active",
    addedAt: "2025-01-15",
  },
  {
    id: "3",
    name: "Mike Jobs",
    email: "mike@merotalent.com",
    role: "admin",
    permissions: ["jobs", "queries"],
    status: "active",
    addedAt: "2025-01-20",
  },
];

const permissionOptions = [
  { id: "lms", label: "LMS Management", icon: BookOpen },
  { id: "jobs", label: "Job Board", icon: Briefcase },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "queries", label: "Contact Queries", icon: MessageSquare },
  { id: "users", label: "User Management", icon: Users },
  { id: "settings", label: "Platform Settings", icon: Settings },
];

const AdminManagement = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    name: "",
    permissions: [] as string[],
  });
  const { toast } = useToast();

  const handleAddAdmin = () => {
    toast({
      title: "Admin invited!",
      description: `An invitation has been sent to ${newAdmin.email}`,
    });
    setIsAddOpen(false);
    setNewAdmin({ email: "", name: "", permissions: [] });
  };

  const togglePermission = (permId: string) => {
    setNewAdmin((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Admin Management</h1>
          <p className="text-muted-foreground">Add and manage administrators with specific permissions</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Add New Administrator
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="admin@company.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    {permissionOptions.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <perm.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{perm.label}</span>
                        </div>
                        <Switch
                          checked={newAdmin.permissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleAddAdmin}
                disabled={!newAdmin.email || !newAdmin.name || newAdmin.permissions.length === 0}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 p-4">
          <Shield className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold">Role-Based Access Control</h3>
            <p className="text-sm text-muted-foreground">
              Assign specific permissions to each admin. Only the Super Admin has access to all features.
              New admins will receive an email invitation to set up their account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Administrators</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAdmins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {admin.role === "super_admin" ? (
                        <Shield className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={admin.role === "super_admin" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {admin.role.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {admin.permissions.includes("all") ? (
                      <Badge variant="outline" className="text-xs">
                        All Permissions
                      </Badge>
                    ) : (
                      admin.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs capitalize">
                          {perm}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-500">Active</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{admin.addedAt}</TableCell>
                <TableCell className="text-right">
                  {admin.role !== "super_admin" && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminManagement;
