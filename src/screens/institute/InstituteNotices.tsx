import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Plus,
  Pin,
  Calendar,
  Edit,
  Trash2,
  FileText,
  GraduationCap,
  PartyPopper,
  ChevronLeft,
  Building2,
  Users,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";

interface Notice {
  id: string;
  title: string;
  content: string | null;
  notice_type: string;
  is_pinned: boolean;
  attachment_url: string | null;
  published_at: string;
  created_at: string;
}

const noticeTypeConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  general: { icon: Bell, color: "bg-primary/10 text-primary", label: "General" },
  admission: { icon: GraduationCap, color: "bg-success/10 text-success", label: "Admission" },
  event: { icon: PartyPopper, color: "bg-accent/10 text-accent", label: "Event" },
  result: { icon: FileText, color: "bg-warning/10 text-warning", label: "Result" },
};

const navItems = [
  { path: "/institute", icon: LayoutDashboard, label: "Overview" },
  { path: "/institute#applications", icon: Users, label: "Applications" },
  { path: "/institute#subscription", icon: CreditCard, label: "Subscription" },
  { path: "/dashboard/payments", icon: CreditCard, label: "Payments" },
  { path: "/institute/notices", icon: Bell, label: "Notices" },
  { path: "/institutes", icon: Building2, label: "Public listing" },
];

const InstituteNotices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [instituteName, setInstituteName] = useState<string>("College Notices");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    notice_type: "general",
    is_pinned: false,
  });

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;

    setEditingNotice(null);
    setFormData({ title: "", content: "", notice_type: "general", is_pinned: false });
    setIsDialogOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      fetchInstituteAccess();
    }
  }, [user]);

  const fetchInstituteAccess = async () => {
    if (!user) return;
    const db = supabase as any;

    const { data: adminData } = await db
      .from("institute_admins")
      .select("institute_id, institutes(name)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminData?.institute_id) {
      setInstituteId(adminData.institute_id);
      if (adminData.institutes?.name) setInstituteName(adminData.institutes.name);
      fetchNotices(adminData.institute_id);
    } else {
      const { data: ownerData } = await db
        .from("institutes")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownerData) {
        setInstituteId(ownerData.id);
        setInstituteName(ownerData.name);
        fetchNotices(ownerData.id);
      } else {
        const { data: anyInst } = await db.from("institutes").select("id, name").limit(1).maybeSingle();
        if (anyInst) {
          setInstituteId(anyInst.id);
          setInstituteName(anyInst.name);
          fetchNotices(anyInst.id);
        } else {
          setIsLoading(false);
        }
      }
    }
  };

  const fetchNotices = async (instId: string) => {
    const { data } = await supabase
      .from("institute_notices")
      .select("*")
      .eq("institute_id", instId)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false });

    if (data) {
      setNotices(data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!instituteId || !formData.title) return;

    if (editingNotice) {
      const { error } = await supabase
        .from("institute_notices")
        .update({
          title: formData.title,
          content: formData.content,
          notice_type: formData.notice_type,
          is_pinned: formData.is_pinned,
        })
        .eq("id", editingNotice.id);

      if (!error) {
        toast({ title: "Notice updated" });
        setIsDialogOpen(false);
        fetchNotices(instituteId);
      }
    } else {
      const { error } = await supabase.from("institute_notices").insert({
        institute_id: instituteId,
        title: formData.title,
        content: formData.content,
        notice_type: formData.notice_type,
        is_pinned: formData.is_pinned,
      });

      if (!error) {
        toast({ title: "Notice published" });
        setIsDialogOpen(false);
        fetchNotices(instituteId);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("institute_notices").delete().eq("id", id);
    if (!error && instituteId) {
      toast({ title: "Notice deleted" });
      fetchNotices(instituteId);
    }
  };

  const openCreateDialog = () => {
    setEditingNotice(null);
    setFormData({ title: "", content: "", notice_type: "general", is_pinned: false });
    setIsDialogOpen(true);
  };

  const openEditDialog = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content || "",
      notice_type: notice.notice_type,
      is_pinned: notice.is_pinned,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#17162e]">
      {/* Header */}
      <header className="border-b border-[#f0e3da] bg-white/90 backdrop-blur">
        <div className="mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]"
                onClick={() => navigate("/institute")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1e8]">
                  <Bell className="h-5 w-5 text-[#c2410c]" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">{instituteName} · Notice Board</h1>
                  <p className="text-xs text-muted-foreground">Manage announcements and notices</p>
                </div>
              </div>
            </div>
            <Button onClick={openCreateDialog} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Notice
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 py-5 sm:px-6 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <Card className="rounded-[22px] border-[#f0e3da] bg-white shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardContent className="p-2.5">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = item.path === "/institute/notices";
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-[#fff1e8] text-[#c84f08] font-bold"
                            : "text-[#746a64] hover:bg-[#fff1e8] hover:text-[#c84f08]"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1 space-y-4">
            {isLoading ? (
              <Card className="rounded-[24px] border-[#f0e3da] p-8 text-center text-muted-foreground">
                Loading notices...
              </Card>
            ) : notices.length === 0 ? (
              <Card className="rounded-[24px] border-[#f0e3da] p-12 text-center text-muted-foreground">
                <Bell className="mx-auto mb-3 h-10 w-10 opacity-40 text-[#c2410c]" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No notices published yet</h3>
                <p className="text-xs text-slate-500 mb-4">Post announcements, admission alerts, or results for students.</p>
                <Button onClick={openCreateDialog} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Publish First Notice
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {notices.map((notice) => {
                  const config = noticeTypeConfig[notice.notice_type] || noticeTypeConfig.general;
                  const Icon = config.icon;
                  return (
                    <Card key={notice.id} className="rounded-[22px] border-[#f0e3da] shadow-2xs hover:shadow-md transition">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className={`p-2.5 rounded-xl ${config.color} shrink-0 h-fit`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {notice.is_pinned && (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                                    <Pin className="w-3 h-3 mr-1 inline" />
                                    Pinned
                                  </Badge>
                                )}
                                <h3 className="font-bold text-slate-900 text-base">{notice.title}</h3>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                              <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(notice.published_at), "PPP")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(notice)} className="h-8 w-8 text-slate-500 hover:text-slate-900">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(notice.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Notice Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingNotice ? "Edit Announcement" : "Create New Notice"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Publish announcements to the student college portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Notice Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. BBA Admissions 2026 Open"
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Notice Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write full announcement details..."
                rows={4}
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Category</Label>
              <Select
                value={formData.notice_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, notice_type: value }))}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(noticeTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2 text-xs">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
              <div>
                <Label className="text-xs font-bold text-slate-900">Pin Notice</Label>
                <p className="text-[11px] text-slate-500">Display notice at top of student portal</p>
              </div>
              <Switch
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_pinned: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs px-5">
              {editingNotice ? "Save Changes" : "Publish Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstituteNotices;
