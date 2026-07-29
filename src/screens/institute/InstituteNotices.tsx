import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Megaphone,
  GraduationCap,
  PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { OperationsPage } from "@/screens/admin/OperationsUI";

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

const InstituteNotices = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [instituteId, setInstituteId] = useState<string | null>(null);
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

    const { data } = await supabase
      .from("institute_admins")
      .select("institute_id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setInstituteId(data.institute_id);
      fetchNotices(data.institute_id);
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
        fetchNotices(instituteId);
      }
    }

    setIsDialogOpen(false);
    setEditingNotice(null);
    setFormData({ title: "", content: "", notice_type: "general", is_pinned: false });
  };

  const handleDelete = async (noticeId: string) => {
    const { error } = await supabase.from("institute_notices").delete().eq("id", noticeId);

    if (!error) {
      toast({ title: "Notice deleted" });
      if (instituteId) fetchNotices(instituteId);
    }
  };

  const togglePin = async (notice: Notice) => {
    const { error } = await supabase
      .from("institute_notices")
      .update({ is_pinned: !notice.is_pinned })
      .eq("id", notice.id);

    if (!error && instituteId) {
      fetchNotices(instituteId);
    }
  };

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Notices</h1>
          <p className="text-muted-foreground">Manage and publish notices for students</p>
        </div>
        <Button
          className="rounded-xl bg-[#c2410c] text-white shadow-[0_10px_24px_rgba(249,115,22,0.24)] hover:bg-[#9a3412]"
          onClick={() => {
            setEditingNotice(null);
            setFormData({ title: "", content: "", notice_type: "general", is_pinned: false });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Notice
        </Button>
      </div>

      {/* Notice Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(noticeTypeConfig).map(([type, config]) => {
          const count = notices.filter((n) => n.notice_type === type).length;
          return (
            <Card key={type} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                  <config.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : notices.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notices yet. Create your first notice!</p>
            </CardContent>
          </Card>
        ) : (
          notices.map((notice) => {
            const config = noticeTypeConfig[notice.notice_type] || noticeTypeConfig.general;
            return (
              <Card key={notice.id} className={`border-border/50 ${notice.is_pinned ? "ring-2 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                        <config.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {notice.is_pinned && (
                            <Pin className="w-4 h-4 text-primary" />
                          )}
                          <h3 className="font-semibold">{notice.title}</h3>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        {notice.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notice.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(notice.published_at), "PPp")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePin(notice)}
                        title={notice.is_pinned ? "Unpin" : "Pin"}
                        aria-label={notice.is_pinned ? `Unpin ${notice.title}` : `Pin ${notice.title}`}
                      >
                        <Pin className={`w-4 h-4 ${notice.is_pinned ? "text-primary" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${notice.title}`}
                        onClick={() => {
                          setEditingNotice(notice);
                          setFormData({
                            title: notice.title,
                            content: notice.content || "",
                            notice_type: notice.notice_type,
                            is_pinned: notice.is_pinned,
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(notice.id)}
                        aria-label={`Delete ${notice.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNotice ? "Edit Notice" : "Create Notice"}</DialogTitle>
            <DialogDescription>
              {editingNotice
                ? "Update the notice details"
                : "Create a new notice to publish to students"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Notice title..."
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Notice content..."
                rows={4}
              />
            </div>
            <div>
              <Label>Notice Type</Label>
              <Select
                value={formData.notice_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, notice_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(noticeTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Pin Notice</Label>
                <p className="text-sm text-muted-foreground">Keep this notice at the top</p>
              </div>
              <Switch
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_pinned: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title}>
              {editingNotice ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default InstituteNotices;
