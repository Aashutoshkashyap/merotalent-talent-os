import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  UserCog,
  Building2,
  Users,
  Loader2,
  Trash2,
  PlusCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OperationsPage } from "./OperationsUI";
import { SystemPagination } from "@/components/ui/SystemPagination";

type AppRole = "admin" | "talent" | "institution" | "company" | "mentor" | "instructor";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

interface InstituteAdminRow {
  id: string;
  user_id: string;
  institute_id: string;
  can_edit_profile: boolean | null;
  can_manage_courses: boolean | null;
  can_post_notices: boolean | null;
  created_at: string;
  institute_name?: string;
  user_email?: string;
  user_name?: string;
}

const ALL_ROLES: AppRole[] = ["talent", "mentor", "institution", "company", "instructor", "admin"];

const roleBadgeClass = (role: string) => {
  switch (role) {
    case "admin": return "bg-red-100 text-red-800 border-red-200";
    case "mentor": return "bg-amber-100 text-amber-800 border-amber-200";
    case "institution": return "bg-blue-100 text-blue-800 border-blue-200";
    case "company": return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "instructor": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
};

export default function AdminAccessMatrix() {
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [instituteAdmins, setInstituteAdmins] = useState<InstituteAdminRow[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Filters ───────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ── Grant Role Dialog ─────────────────────────────────────
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<UserRow | null>(null);
  const [grantRole, setGrantRole] = useState<AppRole>("talent");

  // ── Institute Admin Dialog ────────────────────────────────
  const [iaOpen, setIAOpen] = useState(false);
  const [iaUser, setIAUser] = useState<UserRow | null>(null);
  const [iaInstituteId, setIAInstituteId] = useState("");
  const [iaCanEditProfile, setIACanEditProfile] = useState(true);
  const [iaCanManageCourses, setIACanManageCourses] = useState(false);
  const [iaCanPostNotices, setIACanPostNotices] = useState(false);

  // ── Load ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profilesRes, rolesRes, iaRes, insRes] = await Promise.all([
        (supabase as any).from("profiles").select("user_id,email,full_name,created_at").order("created_at", { ascending: false }).limit(500),
        (supabase as any).from("user_roles").select("user_id,role"),
        (supabase as any).from("institute_admins").select("id,user_id,institute_id,can_edit_profile,can_manage_courses,can_post_notices,created_at"),
        (supabase as any).from("institutes").select("id,name").order("name"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap: Record<string, AppRole[]> = {};
      for (const r of rolesRes.data || []) {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role as AppRole);
      }

      const profilesData = (profilesRes.data || []) as UserRow[];
      setUsers(profilesData.map((p) => ({ ...p, roles: rolesMap[p.user_id] || [] })));

      // Build lookup maps for institute admins display
      const insData: { id: string; name: string }[] = insRes.data || [];
      const insMap: Record<string, string> = {};
      for (const ins of insData) insMap[ins.id] = ins.name;
      const profMap: Record<string, { email: string; name: string | null }> = {};
      for (const p of profilesData) profMap[p.user_id] = { email: p.email, name: p.full_name };

      const iaData: InstituteAdminRow[] = (iaRes.data || []).map((row: any) => ({
        ...row,
        institute_name: insMap[row.institute_id] || row.institute_id,
        user_email: profMap[row.user_id]?.email || row.user_id,
        user_name: profMap[row.user_id]?.name,
      }));

      setInstituteAdmins(iaData);
      setInstitutes(insData);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not load access matrix", description: err?.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  // ── Filtered & Paginated Users ────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.roles.includes(roleFilter as AppRole);
      return matchSearch && matchRole;
    });
  }, [users, query, roleFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // ── Role Grant ────────────────────────────────────────────
  const handleGrantRole = async () => {
    if (!grantUser) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").upsert({ user_id: grantUser.user_id, role: grantRole }, { onConflict: "user_id,role" });
      if (error) throw error;
      toast({ title: "Role granted", description: `${grantRole} role assigned to ${grantUser.email}.` });
      setGrantOpen(false);
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Role grant failed", description: err?.message });
    } finally { setBusy(false); }
  };

  const handleRevokeRole = async (userId: string, role: AppRole) => {
    if (!confirm(`Remove role "${role}" from this user?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").delete().match({ user_id: userId, role });
      if (error) throw error;
      toast({ title: "Role revoked" });
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Revoke failed", description: err?.message });
    } finally { setBusy(false); }
  };

  // ── Institute Admin ───────────────────────────────────────
  const handleGrantIA = async () => {
    if (!iaUser || !iaInstituteId) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("institute_admins").upsert({
        user_id: iaUser.user_id,
        institute_id: iaInstituteId,
        can_edit_profile: iaCanEditProfile,
        can_manage_courses: iaCanManageCourses,
        can_post_notices: iaCanPostNotices,
      }, { onConflict: "user_id,institute_id" });
      if (error) throw error;
      toast({ title: "Institute admin access granted" });
      setIAOpen(false);
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Institute admin grant failed", description: err?.message });
    } finally { setBusy(false); }
  };

  const handleRevokeIA = async (id: string) => {
    if (!confirm("Remove this institute admin assignment?")) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).from("institute_admins").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Institute admin removed" });
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Removal failed", description: err?.message });
    } finally { setBusy(false); }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <OperationsPage>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#071a3d]" /> Access Matrix
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage user roles and institution admin permissions across the platform.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading} className="rounded-xl text-xs font-bold self-start sm:self-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Mentors", value: users.filter(u => u.roles.includes("mentor")).length, icon: UserCog, color: "text-amber-600 bg-amber-50" },
          { label: "Institutions", value: users.filter(u => u.roles.includes("institution")).length, icon: Building2, color: "text-indigo-600 bg-indigo-50" },
          { label: "Admins", value: users.filter(u => u.roles.includes("admin")).length, icon: Shield, color: "text-red-600 bg-red-50" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#0f172a]">{stat.value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Role Matrix */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5 bg-gradient-to-r from-[#071a3d] to-[#1e3a8a] text-white">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> User Role Assignments
          </CardTitle>
          <CardDescription className="text-blue-200 text-xs">
            View and manage which roles each user holds. Use the dropdown menus to search, filter, or grant new roles.
          </CardDescription>
        </CardHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 pt-4 pb-2 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name or email…"
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs rounded-xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>User</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading access data…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : paginated.map((user) => (
                  <TableRow key={user.user_id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#071a3d] to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0f172a] truncate">{user.full_name || "—"}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">no role</Badge>
                        ) : user.roles.map((role) => (
                          <span key={role} className="inline-flex items-center gap-1">
                            <Badge variant="outline" className={`text-[10px] font-bold capitalize ${roleBadgeClass(role)}`}>{role}</Badge>
                            <button
                              onClick={() => handleRevokeRole(user.user_id, role)}
                              disabled={busy}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title={`Remove ${role} role`}
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">Active</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] rounded-lg px-2 font-bold"
                          onClick={() => { setGrantUser(user); setGrantRole("talent"); setGrantOpen(true); }}
                          disabled={busy}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" /> Grant Role
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] rounded-lg px-2 font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => { setIAUser(user); setIAInstituteId(""); setIAOpen(true); }}
                          disabled={busy || institutes.length === 0}
                        >
                          <Building2 className="h-3 w-3 mr-1" /> Inst. Admin
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-slate-100 px-4 bg-slate-50/50">
            <SystemPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / pageSize)}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              itemLabel="users"
            />
          </div>
        </CardContent>
      </Card>

      {/* Institute Admin Assignments */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" /> Institution Admin Permissions
          </CardTitle>
          <CardDescription className="text-xs">
            Users with institute-level admin privileges and their specific permission grants.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {instituteAdmins.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No institution admin assignments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>User</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Edit Profile</TableHead>
                    <TableHead>Manage Courses</TableHead>
                    <TableHead>Post Notices</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instituteAdmins.map((ia) => (
                    <TableRow key={ia.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">
                        <p className="font-semibold text-[#0f172a]">{ia.user_name || "—"}</p>
                        <p className="text-[11px] text-slate-500">{ia.user_email}</p>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{ia.institute_name}</TableCell>
                      <TableCell>
                        {ia.can_edit_profile ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                      </TableCell>
                      <TableCell>
                        {ia.can_manage_courses ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                      </TableCell>
                      <TableCell>
                        {ia.can_post_notices ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(ia.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-red-600 hover:bg-red-50 rounded-lg px-2"
                          onClick={() => handleRevokeIA(ia.id)}
                          disabled={busy}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Role Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-[#0f172a]">Grant Role</DialogTitle>
            <DialogDescription className="text-xs">
              Assign a new platform role to <strong>{grantUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold">Role</Label>
            <Select value={grantRole} onValueChange={(v) => setGrantRole(v as AppRole)}>
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)} className="rounded-xl text-xs">Cancel</Button>
            <Button
              disabled={busy}
              onClick={handleGrantRole}
              className="rounded-xl bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-bold"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
              Grant Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Institution Admin Dialog */}
      <Dialog open={iaOpen} onOpenChange={setIAOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black text-[#0f172a]">Assign Institution Admin</DialogTitle>
            <DialogDescription className="text-xs">
              Grant <strong>{iaUser?.email}</strong> admin access to a specific institution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold mb-1 block">Institution</Label>
              <Select value={iaInstituteId} onValueChange={setIAInstituteId}>
                <SelectTrigger className="text-xs rounded-xl h-10">
                  <SelectValue placeholder="Select an institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutes.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id} className="text-xs">{ins.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Permissions</p>
              {[
                { label: "Can Edit Profile", value: iaCanEditProfile, set: setIACanEditProfile },
                { label: "Can Manage Courses", value: iaCanManageCourses, set: setIACanManageCourses },
                { label: "Can Post Notices", value: iaCanPostNotices, set: setIACanPostNotices },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="font-medium text-slate-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => set(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#071a3d]"
                  />
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIAOpen(false)} className="rounded-xl text-xs">Cancel</Button>
            <Button
              disabled={busy || !iaInstituteId}
              onClick={handleGrantIA}
              className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Building2 className="h-4 w-4 mr-1" />}
              Assign Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
