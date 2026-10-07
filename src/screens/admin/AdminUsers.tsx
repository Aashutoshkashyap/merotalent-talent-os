import { useState, useEffect, useMemo, useCallback } from "react";
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
import { getPasswordResetUrl } from "@/lib/auth/public-origin";

interface UserRecord {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  account_status?: string | null;
  email_verified: boolean;
  created_at: string;
  roles: string[];
}

interface EntityOption {
  id: string;
  label: string;
}

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const defaultSubscriptionDates = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return { start: formatDateInput(start), end: formatDateInput(end) };
};

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
  const [isCreating, setIsCreating] = useState(false);

  // This is the single Super Admin surface for operational module assignment.
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollUser, setEnrollUser] = useState<UserRecord | null>(null);
  const [enrollModuleKey, setEnrollModuleKey] = useState("college");
  const [enrollEntityId, setEnrollEntityId] = useState("");
  const [enrollEntityOptions, setEnrollEntityOptions] = useState<EntityOption[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const initialDates = defaultSubscriptionDates();
  const [enrollStartDate, setEnrollStartDate] = useState(initialDates.start);
  const [enrollEndDate, setEnrollEndDate] = useState(initialDates.end);
  const [enrollAmountPaid, setEnrollAmountPaid] = useState(0);
  const [enrollTransactionId, setEnrollTransactionId] = useState("");
  const [enrollNote, setEnrollNote] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const loadEntityOptions = useCallback(async (moduleKey: string) => {
    setIsLoadingEntities(true);
    setEnrollEntityId("");
    try {
      if (moduleKey === "college") {
        const { data, error } = await (supabase as any).from("institutes").select("id,name").is("deleted_at", null).order("name").limit(500);
        if (error) throw error;
        setEnrollEntityOptions((data ?? []).map((row: any) => ({ id: row.id, label: row.name })));
      } else if (moduleKey === "jobs") {
        const { data, error } = await (supabase as any).from("companies").select("id,name").is("deleted_at", null).order("name").limit(500);
        if (error) throw error;
        setEnrollEntityOptions((data ?? []).map((row: any) => ({ id: row.id, label: row.name })));
      } else if (moduleKey === "mentor") {
        const { data, error } = await (supabase as any).from("mentors").select("id,user_id,headline").is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        const mentorRows = data ?? [];
        const userIds = mentorRows.map((row: any) => row.user_id).filter(Boolean);
        const { data: profiles } = userIds.length
          ? await (supabase as any).from("profiles").select("user_id,full_name,email").in("user_id", userIds)
          : { data: [] };
        const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
        setEnrollEntityOptions(mentorRows.map((row: any) => {
          const profile = profileMap.get(row.user_id) as any;
          return { id: row.id, label: profile?.full_name || profile?.email || row.headline || `Mentor ${row.id.slice(0, 8)}` };
        }));
      } else {
        const { data, error } = await (supabase as any).from("events").select("id,title").is("deleted_at", null).order("title").limit(500);
        if (error) throw error;
        setEnrollEntityOptions((data ?? []).map((row: any) => ({ id: row.id, label: row.title })));
      }
    } catch (error: any) {
      setEnrollEntityOptions([]);
      toast({ variant: "destructive", title: "Entities unavailable", description: error?.message || "Could not load assignable records." });
    } finally {
      setIsLoadingEntities(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isEnrollOpen) void loadEntityOptions(enrollModuleKey);
  }, [enrollModuleKey, isEnrollOpen, loadEntityOptions]);

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollUser || !enrollEntityId) {
      toast({ variant: "destructive", title: "Entity required", description: "Select the college, company, mentor, or event this person may manage." });
      return;
    }
    setIsEnrolling(true);
    try {
      const startAt = new Date(`${enrollStartDate}T00:00:00`);
      const expiresAt = new Date(`${enrollEndDate}T23:59:59`);
      if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= startAt) {
        throw new Error("Choose a subscription end date after its start date.");
      }
      const entityType = enrollModuleKey === "college" ? "college" : enrollModuleKey === "jobs" ? "company" : enrollModuleKey === "mentor" ? "mentor" : "event";
      const { error } = await (supabase as any).rpc("admin_assign_module_access_with_payment", {
        p_target_user_id: enrollUser.user_id,
        p_module_key: enrollModuleKey,
        p_entity_type: entityType,
        p_entity_id: enrollEntityId,
        p_start_at: startAt.toISOString(),
        p_expires_at: expiresAt.toISOString(),
        p_amount: Number(enrollAmountPaid) || 0,
        p_transaction_id: enrollTransactionId.trim() || null,
        p_note: enrollNote.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Module access assigned", description: `Granted ${enrollModuleKey} access to ${enrollUser.email}. The subscription and any received payment were recorded together.` });
      setIsEnrollOpen(false);
      setEnrollEntityId("");
      setEnrollAmountPaid(0);
      setEnrollTransactionId("");
      setEnrollNote("");
      void fetchUsers(currentPage, pageSize, searchQuery);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: err?.message || "Could not grant module access." });
    } finally {
      setIsEnrolling(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async (targetPage: number, targetPageSize: number, targetSearch: string) => {
    setIsLoading(true);
    try {
      try {
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session?.access_token) throw new Error("Your administrator session has expired. Sign in again.");

        const params = new URLSearchParams({ page: String(targetPage), page_size: String(targetPageSize) });
        if (targetSearch.trim()) params.set("search", targetSearch.trim());
        const response = await fetch(`/api/v1/admin/auth-users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${auth.session.access_token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.error || !Array.isArray(payload?.data)) {
          throw new Error(payload?.error?.message || "Could not load registered Auth users.");
        }

        setUsers(payload.data.map((account: any) => ({
          id: account.id,
          user_id: account.id,
          email: account.email || "Email unavailable",
          full_name: account.profile?.metadata?.fullName || null,
          phone: null,
          account_status: account.profile?.accountStatus || (account.banned ? "suspended" : "active"),
          email_verified: Boolean(account.emailVerified),
          created_at: account.createdAt,
          roles: Array.isArray(account.roles) ? account.roles : [],
        })));
        setTotalCount(Number(payload?.meta?.total) || payload.data.length);
        setTotalPages(Number(payload?.meta?.totalPages) || 1);
      } catch (authListError: any) {
        try {
          const profiles = await listAdminResource<any>("users");
          const roles = await listAdminResource<any>("user-roles");
          const mapped = profiles.map((profile: any) => ({
            ...profile,
            email_verified: true,
            roles: roles.filter((role: any) => role.user_id === profile.user_id).map((role: any) => role.role),
          }));
          setUsers(mapped);
          setTotalCount(mapped.length);
          setTotalPages(Math.ceil(mapped.length / targetPageSize) || 1);
        } catch {
          throw authListError;
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Fetch Failed", description: err?.message || "Could not fetch users." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      void fetchUsers(1, pageSize, searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fetchUsers, pageSize, searchQuery]);

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
          role: "talent",
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
      void fetchUsers(currentPage, pageSize, searchQuery);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Creation Error", description: err?.message || "Could not create user account." });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetUrl(),
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
      void fetchUsers(currentPage, pageSize, searchQuery);
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
      void fetchUsers(currentPage, pageSize, searchQuery);
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "talent"
          ? u.roles.length === 0 || u.roles.includes("talent")
          : u.roles.includes(roleFilter));
      return matchesRole;
    });
  }, [users, roleFilter]);

  return (
    <OperationsPage>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">
            User Management
            {totalCount > 0 && (
              <span className="ml-2 text-base font-normal text-slate-400">
                ({totalCount})
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            View registered members, create user accounts, send password resets, and manage role access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="bg-[#071a3d] hover:bg-[#05132d] text-white font-bold rounded-xl text-xs">
            <UserPlus className="mr-2 h-4 w-4" />
            Create New User
          </Button>
          <Button variant="outline" onClick={() => void fetchUsers(currentPage, pageSize, searchQuery)} disabled={isLoading} className="rounded-xl text-xs font-bold">
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredUsers.map((user) => (
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
                    <div className="flex flex-col gap-1">
                      {user.account_status === "suspended" ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-extrabold">Suspended</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold">Active</Badge>
                      )}
                      {!user.email_verified && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Unconfirmed</Badge>
                      )}
                    </div>
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
                          disabled={user.roles.includes("admin") || user.roles.includes("super_admin")}
                          onClick={() => {
                            const dates = defaultSubscriptionDates();
                            setEnrollUser(user);
                            setEnrollStartDate(dates.start);
                            setEnrollEndDate(dates.end);
                            setIsEnrollOpen(true);
                          }}
                          className="text-xs font-semibold text-[#071a3d] cursor-pointer"
                        >
                          <UserRoundCog className="w-4 h-4 mr-2 text-indigo-600" />
                          Assign Module Access
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
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={(nextPage) => {
                setCurrentPage(nextPage);
                void fetchUsers(nextPage, pageSize, searchQuery);
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
                void fetchUsers(1, size, searchQuery);
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

              <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
                Invitations create a standard Student / Talent account. Assign operational module access from this user's action menu after the account exists.
              </p>
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

      {/* The only Super Admin module-assignment workflow. */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleManualEnroll} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Assign Module Access</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Assign one person to a specific record, set the subscription period, and record any offline payment in the same audited action.
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
                <Label className="text-xs font-bold text-slate-700">Assigned record *</Label>
                <Select value={enrollEntityId} onValueChange={setEnrollEntityId} disabled={isLoadingEntities}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder={isLoadingEntities ? "Loading records..." : "Choose the exact record"} />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollEntityOptions.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>{entity.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoadingEntities && enrollEntityOptions.length === 0 ? (
                  <p className="text-[10px] text-amber-700">Create the module record first, then assign its administrator here.</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700" htmlFor="subscription-start">Subscription starts *</Label>
                  <Input id="subscription-start" type="date" value={enrollStartDate} onChange={(e) => setEnrollStartDate(e.target.value)} required className="h-10 text-xs rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700" htmlFor="subscription-end">Subscription ends *</Label>
                  <Input id="subscription-end" type="date" min={enrollStartDate} value={enrollEndDate} onChange={(e) => setEnrollEndDate(e.target.value)} required className="h-10 text-xs rounded-xl" />
                </div>
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
                <p className="text-[10px] text-slate-500">Use 0 for a complimentary grant. Positive amounts are added to Payments as successful manual transactions.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700" htmlFor="transaction-reference">Payment reference</Label>
                <Input id="transaction-reference" value={enrollTransactionId} onChange={(e) => setEnrollTransactionId(e.target.value)} maxLength={180} placeholder="Receipt or bank reference (optional)" className="h-10 text-xs rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700" htmlFor="assignment-note">Internal note</Label>
                <Input id="assignment-note" value={enrollNote} onChange={(e) => setEnrollNote(e.target.value)} maxLength={1000} placeholder="Reason or collection note (optional)" className="h-10 text-xs rounded-xl" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>

              <Button type="submit" disabled={isEnrolling} className="rounded-xl bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-extrabold px-5">
                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserRoundCog className="w-4 h-4 mr-2" />}
                Assign Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default AdminUsers;
