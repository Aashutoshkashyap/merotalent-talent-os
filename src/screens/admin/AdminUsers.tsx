import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  RefreshCw,
  Shield,
  UserPlus,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  UserRoundCog,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { listAdminResource } from "@/lib/admin/admin-client";

interface UserRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  account_status?: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("talent");
  const [isCreating, setIsCreating] = useState(false);

  // Manual Module Enrollment Modal State
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollUser, setEnrollUser] = useState<UserRecord | null>(null);
  const [enrollModuleKey, setEnrollModuleKey] = useState("college");
  const [enrollDurationDays, setEnrollDurationDays] = useState(30);
  const [enrollAmountPaid, setEnrollAmountPaid] = useState(0);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollUser) return;
    setIsEnrolling(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(enrollDurationDays));

      // Record entitlement
      await (supabase as any).from("module_entitlements").insert({
        user_id: enrollUser.user_id,
        module_key: enrollModuleKey,
        entity_type: enrollModuleKey,
        entity_id: enrollUser.user_id,
        source: "ADMIN_MANUAL",
        status: "active",
        start_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: `Superadmin manual enrollment. Received NPR ${enrollAmountPaid}`,
      });

      // Record payment transaction
      if (Number(enrollAmountPaid) > 0) {
        await (supabase as any).from("payments").insert({
          user_id: enrollUser.user_id,
          payment_type: "subscription",
          reference_id: enrollUser.user_id,
          amount: Number(enrollAmountPaid),
          currency: "NPR",
          status: "completed",
          payment_method: "cash_manual",
          transaction_id: `manual-${Date.now()}`,
          metadata: { module: enrollModuleKey, duration_days: enrollDurationDays },
        });
      }

      // Assign module role
      const targetRole = enrollModuleKey === "college" ? "institution" : enrollModuleKey === "jobs" ? "company" : enrollModuleKey === "mentor" ? "mentor" : "admin";
      await (supabase as any).from("user_roles").upsert({
        user_id: enrollUser.user_id,
        role: targetRole,
      });

      toast({ title: "Module Access Granted!", description: `Granted ${enrollModuleKey} access to ${enrollUser.email} for ${enrollDurationDays} days.` });
      setIsEnrollOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: err?.message || "Could not grant module access." });
    } finally {
      setIsEnrolling(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let profiles: any[] = [];
      try {
        profiles = await listAdminResource<any>("users");
      } catch {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        profiles = data || [];
      }

      if (profiles && profiles.length > 0) {
        let roles: any[] = [];
        try {
          roles = await listAdminResource<any>("user-roles");
        } catch {
          const userIds = profiles.map((p: any) => p.user_id);
          const { data: rolesData } = await (supabase as any)
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          roles = rolesData || [];
        }

        const usersWithRoles = profiles.map((profile: any) => ({
          ...profile,
          roles: roles?.filter((r: any) => r.user_id === profile.user_id).map((r: any) => r.role) || [],
        }));

        setUsers(usersWithRoles);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Fetch Failed", description: err?.message || "Could not fetch users." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim()) {
      toast({ variant: "destructive", title: "Email is required", description: "Enter an email address for the invitation." });
      return;
    }

    setIsCreating(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.access_token) throw new Error("Your administrator session has expired. Sign in again.");
      const response = await fetch("/api/v1/admin/auth-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.session.access_token}`,
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          role: createRole,
          metadata: createName.trim() ? { full_name: createName.trim() } : {},
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.error) throw new Error(payload?.error?.message || "The invitation could not be created.");

      toast({
        title: "Invitation created",
        description: `An onboarding invitation was created for ${createEmail}. Access remains server-side and role-scoped.`,
      });

      setIsCreateOpen(false);
      setCreateEmail("");
      setCreateName("");
      setCreateRole("talent");
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Creation Error", description: err?.message || "Could not create user account." });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Password Reset Email Sent!",
        description: `Password reset instructions delivered to ${email}.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Password reset could not be sent", description: err?.message || "Check the email provider configuration and try again." });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus?: string | null) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.access_token) throw new Error("Your administrator session has expired. Sign in again.");
      const response = await fetch(`/api/v1/admin/auth-users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` },
        body: JSON.stringify({ action: "set_access", account_status: nextStatus, banned: nextStatus === "suspended" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.error) throw new Error(payload?.error?.message || "The account status could not be updated.");

      toast({
        title: nextStatus === "suspended" ? "User Account Suspended" : "User Account Re-activated",
        description: `Account status updated to ${nextStatus}.`,
      });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err?.message });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete profile record for ${email}?`)) return;
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.access_token) throw new Error("Your administrator session has expired. Sign in again.");
      const response = await fetch(`/api/v1/admin/auth-users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.error) throw new Error(payload?.error?.message || "The user could not be deactivated.");
      toast({ title: "User Profile Removed", description: `Record for ${email} has been deleted.` });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err?.message });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
      case "super_admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "mentor":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "institution":
      case "college_admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "company":
        return "bg-[#071a3d]/10 text-[#071a3d] border-[#071a3d]/20";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchQuery || 
      (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || (roleFilter === "talent" ? u.roles.length === 0 || u.roles.includes("talent") : u.roles.includes(roleFilter));
    return matchesSearch && matchesRole;
  });

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  return (
    <OperationsPage>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">User Management</h1>
          <p className="text-muted-foreground text-sm">
            View registered members, create user accounts, send password resets, and manage role access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="bg-[#071a3d] hover:bg-[#05132d] text-white font-bold rounded-xl text-xs">
            <UserPlus className="mr-2 h-4 w-4" />
            Create New User
          </Button>
          <Button variant="outline" onClick={() => void fetchUsers()} disabled={isLoading} className="rounded-xl text-xs font-bold">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, phone, or account ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10 h-10 text-xs rounded-xl"
          />
        </div>
        <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 text-xs rounded-xl bg-white">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="talent">Students / Talent</SelectItem>
            <SelectItem value="institution">Institution Admins</SelectItem>
            <SelectItem value="mentor">Mentors</SelectItem>
            <SelectItem value="company">Company / Recruiters</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="border-border/50 rounded-2xl overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>User Profile</TableHead>
                <TableHead>Email & Contact</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#071a3d] to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-[#0f172a] block truncate">{user.full_name || "Member Profile"}</span>
                        <span className="text-[11px] text-slate-500 font-mono">ID: {user.user_id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900">{user.email}</p>
                      {user.phone && <p className="text-[#64748b] text-[11px]">📞 {user.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant="outline" className={`text-[10px] font-bold capitalize ${getRoleBadgeColor(role)}`}>
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                          student
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.account_status === "suspended" ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-extrabold">Suspended</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label={`Actions for ${user.email}`}>
                          <MoreHorizontal className="w-4 h-4 text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-xs font-bold">User Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSendPasswordReset(user.email)} className="text-xs font-semibold cursor-pointer">
                          <KeyRound className="w-4 h-4 mr-2 text-amber-600" />
                          Send Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user.user_id, user.account_status)} className="text-xs font-semibold cursor-pointer">
                          {user.account_status === "suspended" ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                              Unsuspend User
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4 mr-2 text-red-600" />
                              Suspend User
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEnrollUser(user);
                            setIsEnrollOpen(true);
                          }}
                          className="text-xs font-semibold text-[#071a3d] cursor-pointer"
                        >
                          <UserRoundCog className="w-4 h-4 mr-2 text-indigo-600" />
                          Manual Module Enrollment
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-xs font-semibold cursor-pointer">
                          <Link to="/admin/roles">
                            <Shield className="w-4 h-4 mr-2 text-blue-600" />
                            Manage Roles
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.user_id, user.email)} className="text-xs font-semibold text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t border-slate-100 px-4 bg-slate-50/50">
            <SystemPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredUsers.length / pageSize)}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemLabel="users"
            />
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {isLoading ? (
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#071a3d]" />
                  <span className="text-xs font-bold">Loading users database...</span>
                </div>
              ) : (
                "No user accounts match your search query."
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Invite User</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Send a secure onboarding invitation. This action never exposes or sets a user password in the admin browser.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                <Input
                  placeholder="e.g. Aarav Sharma"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="e.g. aarav@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Account Primary Role *</Label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="talent">Student / Talent</SelectItem>
                    <SelectItem value="institution">Institution / College Admin</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="company">Company / Recruiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>

              <Button type="submit" disabled={isCreating} className="rounded-xl bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-extrabold px-5">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Module Enrollment Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleManualEnroll} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Manual Module Enrollment</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Super Admin manual grant for <span className="font-bold text-slate-800">{enrollUser?.email}</span>. Grant module access and log cash/offline payment record.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Module to Grant *</Label>
                <Select value={enrollModuleKey} onValueChange={setEnrollModuleKey}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">Institution / College Admin</SelectItem>
                    <SelectItem value="jobs">Job / Career Admin</SelectItem>
                    <SelectItem value="mentor">Mentor Admin</SelectItem>
                    <SelectItem value="events">Event Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Access Duration (Days) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={enrollDurationDays}
                  onChange={(e) => setEnrollDurationDays(Number(e.target.value))}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Amount Received (NPR) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={enrollAmountPaid}
                  onChange={(e) => setEnrollAmountPaid(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="h-10 text-xs rounded-xl"
                />
                <p className="text-[10px] text-slate-500">Inputs 0 for free manual grant or custom amount received for transaction record keeping.</p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>

              <Button type="submit" disabled={isEnrolling} className="rounded-xl bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-extrabold px-5">
                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserRoundCog className="w-4 h-4 mr-2" />}
                Grant Access & Record Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default AdminUsers;
