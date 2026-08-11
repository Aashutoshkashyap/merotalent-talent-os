import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BookOpen, Plus, Sparkles, Loader2, Play, FileText, HelpCircle, Pencil, Trash2, Eye,
  GraduationCap, Users, Clock, Video, BookMarked, LayoutList, Image, ExternalLink, Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SignedMediaUploader, type SignedMediaAsset } from "@/components/media/SignedMediaUploader";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: string | null;
  duration_hours: number | null;
  price: number | null;
  thumbnail_url: string | null;
  redirect_url: string | null;
  learning_outcomes: string[] | null;
  syllabus: string | null;
  is_published: boolean | null;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  duration_minutes: number | null;
  passing_score: number | null;
  is_published: boolean | null;
  created_at: string;
}

const AdminLMS = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "Development",
    difficulty_level: "beginner",
    duration_hours: "",
    price: "",
    thumbnail_url: "",
    redirect_url: "",
    learning_outcomes: "",
    syllabus: "",
    is_published: false,
  });

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    course_id: "",
    duration_minutes: "30",
    passing_score: "60",
    is_published: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [coursesRes, quizzesRes] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
    ]);
    
    if (coursesRes.data) setCourses(coursesRes.data);
    if (quizzesRes.data) setQuizzes(quizzesRes.data);
    setIsLoading(false);
  };

  const generateCourseContent = async () => {
    if (!courseForm.title.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }

    setIsGenerating(true);
    const title = courseForm.title.trim();
    const category = courseForm.category || "Professional skills";

    setCourseForm((previous) => ({
      ...previous,
      description:
        previous.description ||
        `${title} is a practical ${category.toLowerCase()} course built around guided examples, focused practice, and a portfolio-ready final outcome. Learners move from core ideas to confident real-world application.`,
      syllabus:
        previous.syllabus ||
        `## Module 1 — Foundations\n- Core concepts and vocabulary\n- Tools and working setup\n\n## Module 2 — Guided practice\n- Worked examples\n- Common patterns and pitfalls\n\n## Module 3 — Applied project\n- Project brief and milestones\n- Review, iteration, and delivery\n\n## Module 4 — Career application\n- Presenting the work\n- Next-step learning plan`,
      learning_outcomes:
        previous.learning_outcomes ||
        `Explain the core principles of ${title}\nApply a repeatable workflow to a practical brief\nEvaluate work using clear quality criteria\nComplete and present a portfolio-ready project\nCreate a focused plan for continued growth`,
    }));
    setIsGenerating(false);
    toast({ title: "Starter content created" });
  };

  const handleCourseSubmit = async () => {
    if (!courseForm.title.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }

    setIsSubmitting(true);
    const courseData = {
      title: courseForm.title,
      description: courseForm.description || null,
      category: courseForm.category,
      difficulty_level: courseForm.difficulty_level,
      duration_hours: courseForm.duration_hours ? parseInt(courseForm.duration_hours) : null,
      price: courseForm.price ? parseFloat(courseForm.price) : 0,
      thumbnail_url: courseForm.thumbnail_url || null,
      redirect_url: courseForm.redirect_url || null,
      learning_outcomes: courseForm.learning_outcomes ? courseForm.learning_outcomes.split("\n").filter(o => o.trim()) : null,
      syllabus: courseForm.syllabus || null,
      is_published: courseForm.is_published,
    };

    let error;
    if (editingCourse) {
      const result = await supabase.from("courses").update(courseData).eq("id", editingCourse.id);
      error = result.error;
    } else {
      const result = await supabase.from("courses").insert(courseData);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      resetCourseForm();
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleQuizSubmit = async () => {
    if (!quizForm.title.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }

    setIsSubmitting(true);
    const quizData = {
      title: quizForm.title,
      description: quizForm.description || null,
      course_id: quizForm.course_id || null,
      duration_minutes: parseInt(quizForm.duration_minutes),
      passing_score: parseInt(quizForm.passing_score),
      is_published: quizForm.is_published,
    };

    let error;
    if (editingQuiz) {
      const result = await supabase.from("quizzes").update(quizData).eq("id", editingQuiz.id);
      error = result.error;
    } else {
      const result = await supabase.from("quizzes").insert(quizData);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingQuiz ? "Quiz updated!" : "Quiz created!" });
      resetQuizForm();
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleDeleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (!error) { toast({ title: "Course deleted" }); fetchData(); }
  };

  const handleDeleteQuiz = async (id: string) => {
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (!error) { toast({ title: "Quiz deleted" }); fetchData(); }
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      category: course.category || "Development",
      difficulty_level: course.difficulty_level || "beginner",
      duration_hours: course.duration_hours?.toString() || "",
      price: course.price?.toString() || "",
      thumbnail_url: course.thumbnail_url || "",
      redirect_url: course.redirect_url || "",
      learning_outcomes: course.learning_outcomes?.join("\n") || "",
      syllabus: course.syllabus || "",
      is_published: course.is_published ?? false,
    });
    setIsCourseDialogOpen(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      course_id: quiz.course_id || "",
      duration_minutes: quiz.duration_minutes?.toString() || "30",
      passing_score: quiz.passing_score?.toString() || "60",
      is_published: quiz.is_published ?? false,
    });
    setIsQuizDialogOpen(true);
  };

  const resetCourseForm = () => {
    setCourseForm({ title: "", description: "", category: "Development", difficulty_level: "beginner", duration_hours: "", price: "", thumbnail_url: "", redirect_url: "", learning_outcomes: "", syllabus: "", is_published: false });
    setEditingCourse(null);
    setIsCourseDialogOpen(false);
  };

  const resetQuizForm = () => {
    setQuizForm({ title: "", description: "", course_id: "", duration_minutes: "30", passing_score: "60", is_published: false });
    setEditingQuiz(null);
    setIsQuizDialogOpen(false);
  };

  const stats = [
    { label: "Total Courses", value: courses.length, icon: BookOpen, color: "text-primary" },
    { label: "Published", value: courses.filter(c => c.is_published).length, icon: Eye, color: "text-success" },
    { label: "Quizzes", value: quizzes.length, icon: HelpCircle, color: "text-secondary" },
    { label: "Free Courses", value: courses.filter(c => !c.price || c.price === 0).length, icon: GraduationCap, color: "text-amber-500" },
  ];

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">LMS Management</h1>
          <p className="text-muted-foreground">Create and manage courses, quizzes, and certificates</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isQuizDialogOpen} onOpenChange={(open) => { if (!open) resetQuizForm(); else setIsQuizDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <HelpCircle className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create New Quiz"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Quiz Title *</Label>
                  <Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="e.g., JavaScript Fundamentals Quiz" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Associated Course</Label>
                  <Select value={quizForm.course_id} onValueChange={(v) => setQuizForm({ ...quizForm, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={quizForm.duration_minutes} onChange={(e) => setQuizForm({ ...quizForm, duration_minutes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Score (%)</Label>
                    <Input type="number" value={quizForm.passing_score} onChange={(e) => setQuizForm({ ...quizForm, passing_score: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={quizForm.is_published} onCheckedChange={(v) => setQuizForm({ ...quizForm, is_published: v })} />
                  <Label>Published</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetQuizForm}>Cancel</Button>
                <Button variant="hero" onClick={handleQuizSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingQuiz ? "Update Quiz" : "Create Quiz"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCourseDialogOpen} onOpenChange={(open) => { if (!open) resetCourseForm(); else setIsCourseDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course Title *</Label>
                    <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g., Advanced Machine Learning" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={courseForm.category} onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Development">Development</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Data Science">Data Science</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full border-dashed border-2" onClick={generateCourseContent} disabled={isGenerating || !courseForm.title.trim()}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2 text-primary" />Generate with AI</>}
                </Button>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows={4} />
                </div>

                <div className="space-y-2">
                  <Label>Learning Outcomes (one per line)</Label>
                  <Textarea value={courseForm.learning_outcomes} onChange={(e) => setCourseForm({ ...courseForm, learning_outcomes: e.target.value })} rows={4} placeholder="Understand machine learning basics&#10;Build predictive models&#10;..." />
                </div>

                <div className="space-y-2">
                  <Label>Syllabus</Label>
                  <Textarea value={courseForm.syllabus} onChange={(e) => setCourseForm({ ...courseForm, syllabus: e.target.value })} rows={4} />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={courseForm.difficulty_level} onValueChange={(v) => setCourseForm({ ...courseForm, difficulty_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input type="number" value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (NPR)</Label>
                    <Input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} placeholder="0 for free" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <SignedMediaUploader
                      label="Course Thumbnail Image"
                      module="course_thumbnail"
                      resourceId={editingCourse?.id || "new-course"}
                      onUploaded={([asset]: SignedMediaAsset[]) => {
                        if (asset) {
                          setCourseForm((current) => ({ ...current, thumbnail_url: asset.publicUrl || asset.path }));
                        }
                      }}
                    />
                    {courseForm.thumbnail_url && (
                      <div className="relative h-24 w-full overflow-hidden rounded-xl border">
                        <img src={courseForm.thumbnail_url} alt="Thumbnail preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><ExternalLink className="w-4 h-4" />Redirect / External URL</Label>
                    <Input value={courseForm.redirect_url} onChange={(e) => setCourseForm({ ...courseForm, redirect_url: e.target.value })} placeholder="External course link" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={courseForm.is_published} onCheckedChange={(v) => setCourseForm({ ...courseForm, is_published: v })} />
                  <Label>Publish immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetCourseForm}>Cancel</Button>
                <Button variant="hero" onClick={handleCourseSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingCourse ? "Update Course" : "Create Course"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2"><BookOpen className="w-4 h-4" />Courses</TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-2"><HelpCircle className="w-4 h-4" />Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>
                        )}
                        <div>
                          <p className="font-medium">{course.title}</p>
                          {course.duration_hours && <p className="text-xs text-muted-foreground">{course.duration_hours} hours</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{course.category}</Badge></TableCell>
                    <TableCell className="capitalize">{course.difficulty_level}</TableCell>
                    <TableCell>{course.price ? `NPR ${course.price}` : "Free"}</TableCell>
                    <TableCell>
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isLoading ? "Loading..." : "No courses yet"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>{courses.find(c => c.id === quiz.course_id)?.title || "-"}</TableCell>
                    <TableCell>{quiz.duration_minutes} min</TableCell>
                    <TableCell>{quiz.passing_score}%</TableCell>
                    <TableCell>
                      <Badge variant={quiz.is_published ? "default" : "secondary"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditQuiz(quiz)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteQuiz(quiz.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {quizzes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isLoading ? "Loading..." : "No quizzes yet"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </OperationsPage>
  );
};

export default AdminLMS;
