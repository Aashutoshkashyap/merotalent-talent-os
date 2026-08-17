import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { PartnerCourseThumbnail } from "@/components/courses/PartnerCourseThumbnail";
import { SignedMediaUploader } from "@/components/media/SignedMediaUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getPartnerCourseRedirect, type PartnerCourse } from "@/lib/courses/partnered-courses";
import { OperationsPage } from "./OperationsUI";

type CourseStatus = "draft" | "pending" | "published" | "inactive";

interface AdminCourseResponse<T> {
  data: T | null;
  error: { message?: string } | null;
  meta?: { total?: number };
}

interface CourseFormState {
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  redirect_url: string;
  partner_name: string;
  display_order: string;
  status: CourseStatus;
}

const emptyForm: CourseFormState = {
  title: "",
  description: "",
  category: "",
  thumbnail_url: "",
  redirect_url: "",
  partner_name: "",
  display_order: "0",
  status: "draft",
};

const statusTone: Record<CourseStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  inactive: "border-rose-200 bg-rose-50 text-rose-800",
};

const AdminLMS = () => {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const { toast } = useToast();
  const [courses, setCourses] = useState<PartnerCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<PartnerCourse | null>(null);
  const [form, setForm] = useState<CourseFormState>(emptyForm);

  const adminRequest = useCallback(async <T,>(url: string, init?: RequestInit) => {
    if (!accessToken) {
      throw new Error("Your administrator session has expired. Sign in again.");
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const payload = (await response.json().catch(() => null)) as AdminCourseResponse<T> | null;
    if (!response.ok || !payload || payload.error) {
      throw new Error(payload?.error?.message || `The request failed with status ${response.status}.`);
    }
    return payload;
  }, [accessToken]);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page_size: "100",
        sort_by: "display_order",
        sort_direction: "asc",
      });
      const payload = await adminRequest<PartnerCourse[]>(`/api/v1/admin/partnered-courses?${params.toString()}`);
      setCourses(payload.data || []);
    } catch (error) {
      setCourses([]);
      toast({
        variant: "destructive",
        title: "Unable to load partner courses",
        description: error instanceof Error ? error.message : "The course directory could not be loaded.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [adminRequest, toast]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const resetForm = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setIsDialogOpen(false);
  };

  const openEdit = (course: PartnerCourse) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description || "",
      category: course.category || "",
      thumbnail_url: course.thumbnail_url || "",
      redirect_url: course.redirect_url || "",
      partner_name: course.partner_name || "",
      display_order: String(course.display_order ?? 0),
      status: (course.status || "draft") as CourseStatus,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ variant: "destructive", title: "Course title is required" });
      return;
    }
    if (!getPartnerCourseRedirect(form.redirect_url)) {
      toast({
        variant: "destructive",
        title: "Approved destination required",
        description: "Use an HTTPS URL on learn.merotalent.com.",
      });
      return;
    }

    const order = Number(form.display_order);
    if (!Number.isInteger(order) || order < 0) {
      toast({ variant: "destructive", title: "Display order must be zero or a positive whole number" });
      return;
    }

    setIsSubmitting(true);
    try {
      const body = JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        redirect_url: form.redirect_url.trim(),
        partner_name: form.partner_name.trim() || null,
        display_order: order,
        status: form.status,
      });
      const url = editingCourse
        ? `/api/v1/admin/partnered-courses/${editingCourse.id}`
        : "/api/v1/admin/partnered-courses";
      await adminRequest<PartnerCourse>(url, {
        method: editingCourse ? "PATCH" : "POST",
        body,
      });
      toast({ title: editingCourse ? "Partner course updated" : "Partner course created" });
      resetForm();
      await fetchCourses();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Course could not be saved",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (course: PartnerCourse) => {
    if (!window.confirm(`Remove “${course.title}” from the partner directory?`)) return;
    try {
      await adminRequest<{ id: string; deleted: boolean }>(`/api/v1/admin/partnered-courses/${course.id}`, {
        method: "DELETE",
      });
      toast({ title: "Partner course removed" });
      await fetchCourses();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Course could not be removed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) =>
      [course.title, course.description, course.category, course.partner_name]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [courses, searchQuery]);

  const partnerCount = new Set(courses.map((course) => course.partner_name).filter(Boolean)).size;
  const stats = [
    [courses.length, "Total listings"],
    [courses.filter((course) => course.status === "published" && course.is_published).length, "Published"],
    [courses.filter((course) => course.status === "draft" || course.status === "pending").length, "In review"],
    [partnerCount, "Partners"],
  ] as const;

  return (
    <OperationsPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Partner courses</h1>
          <p className="text-muted-foreground">
            Manage discovery listings that redirect to learn.merotalent.com. MeroTalent does not deliver course content.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (open) setIsDialogOpen(true);
            else resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => { setEditingCourse(null); setForm(emptyForm); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add partner course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit partner course" : "Add partner course"}</DialogTitle>
              <DialogDescription>
                Published listings appear on the public course directory and can only redirect to the approved learning host.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="partner-course-title">Title *</Label>
                <Input
                  id="partner-course-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Course title"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="partner-course-description">Description</Label>
                <Textarea
                  id="partner-course-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe what the partner course offers."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-course-category">Category</Label>
                <Input
                  id="partner-course-category"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Career development"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-course-name">Partner name</Label>
                <Input
                  id="partner-course-name"
                  value={form.partner_name}
                  onChange={(event) => setForm((current) => ({ ...current, partner_name: event.target.value }))}
                  placeholder="MeroTalent Learning"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="partner-course-redirect">Redirect URL *</Label>
                <Input
                  id="partner-course-redirect"
                  type="url"
                  value={form.redirect_url}
                  onChange={(event) => setForm((current) => ({ ...current, redirect_url: event.target.value }))}
                  placeholder="https://learn.merotalent.com/courses/..."
                />
                <p className="text-xs text-muted-foreground">Only HTTPS links on learn.merotalent.com are accepted.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="partner-course-thumbnail">Thumbnail URL</Label>
                <Input
                  id="partner-course-thumbnail"
                  type="url"
                  value={form.thumbnail_url}
                  onChange={(event) => setForm((current) => ({ ...current, thumbnail_url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {editingCourse && (
                <div className="sm:col-span-2">
                  <SignedMediaUploader
                    label="Or upload a secure thumbnail"
                    module="course_thumbnail"
                    resourceId={editingCourse.id}
                    disabled={isSubmitting}
                    onUploaded={(assets) => {
                      const asset = assets[0];
                      if (asset) setForm((current) => ({ ...current, thumbnail_url: asset.publicUrl }));
                    }}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="partner-course-order">Display order</Label>
                <Input
                  id="partner-course-order"
                  type="number"
                  min="0"
                  step="1"
                  value={form.display_order}
                  onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: CourseStatus) => setForm((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending review</SelectItem>
                    <SelectItem value="published">Published and active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.thumbnail_url && (
                <PartnerCourseThumbnail
                  source={form.thumbnail_url}
                  title={form.title || "Course thumbnail preview"}
                  className="aspect-video rounded-xl border sm:col-span-2"
                />
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCourse ? "Save changes" : "Create listing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([value, label]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-2xl font-black">{isLoading ? "—" : value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search partner courses..."
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <PartnerCourseThumbnail
                      source={course.thumbnail_url}
                      title={course.title}
                      className="h-12 w-20 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{course.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{course.category || "Uncategorised"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{course.partner_name || "—"}</TableCell>
                <TableCell>{course.display_order ?? 0}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize ${statusTone[(course.status || "draft") as CourseStatus]}`}>
                    {course.status === "published" ? "Published / active" : course.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {getPartnerCourseRedirect(course.redirect_url) && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={course.redirect_url || undefined} target="_blank" rel="noopener noreferrer" aria-label={`Open ${course.title}`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(course)} aria-label={`Edit ${course.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => void handleDelete(course)}
                      aria-label={`Remove ${course.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCourses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading partner courses…</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" />No partner courses found.</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
};

export default AdminLMS;
