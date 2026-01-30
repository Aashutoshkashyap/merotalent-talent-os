import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BookOpen, Plus, Sparkles, Loader2, Play, FileText, HelpCircle, Pencil, Trash2, Eye,
  GraduationCap, Users, Clock, Video, BookMarked, LayoutList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedContent {
  description: string;
  syllabus: string;
  learning_outcomes: string[];
}

const mockCourses = [
  {
    id: "1",
    title: "Full Stack Web Development",
    category: "Development",
    modules: 12,
    lessons: 48,
    enrolled: 1234,
    is_published: true,
    created_at: "2025-01-15",
  },
  {
    id: "2",
    title: "UI/UX Design Masterclass",
    category: "Design",
    modules: 8,
    lessons: 32,
    enrolled: 876,
    is_published: true,
    created_at: "2025-01-10",
  },
  {
    id: "3",
    title: "Data Science Fundamentals",
    category: "Data Science",
    modules: 15,
    lessons: 72,
    enrolled: 654,
    is_published: false,
    created_at: "2025-01-20",
  },
];

const AdminLMS = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCategory, setCourseCategory] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const { toast } = useToast();

  const generateCourseContent = async () => {
    if (!courseTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a course title first.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Generate comprehensive course content for: "${courseTitle}"${courseCategory ? ` in the ${courseCategory} category` : ""}`,
              },
            ],
            type: "course-builder",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();
      setGeneratedContent(data);

      toast({
        title: "Content generated!",
        description: "AI has created your course description, syllabus, and learning outcomes.",
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: "Please try again later.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">LMS Management</h1>
          <p className="text-muted-foreground">Create and manage courses, modules, and lessons</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Create New Course
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course Title</Label>
                    <Input
                      placeholder="e.g., Advanced Machine Learning"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={courseCategory} onValueChange={setCourseCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
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

                {/* AI Generate Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-2"
                  onClick={generateCourseContent}
                  disabled={isGenerating || !courseTitle.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Generate Description, Syllabus & Outcomes with AI
                    </>
                  )}
                </Button>

                {/* Generated Content Preview */}
                {generatedContent && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Generated Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={generatedContent.description}
                          onChange={(e) =>
                            setGeneratedContent({ ...generatedContent, description: e.target.value })
                          }
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Syllabus</Label>
                        <Textarea
                          value={generatedContent.syllabus}
                          onChange={(e) =>
                            setGeneratedContent({ ...generatedContent, syllabus: e.target.value })
                          }
                          rows={6}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Learning Outcomes</Label>
                        <div className="space-y-2 mt-2">
                          {generatedContent.learning_outcomes.map((outcome, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge variant="outline" className="shrink-0">
                                {index + 1}
                              </Badge>
                              <Input
                                value={outcome}
                                onChange={(e) => {
                                  const newOutcomes = [...generatedContent.learning_outcomes];
                                  newOutcomes[index] = e.target.value;
                                  setGeneratedContent({ ...generatedContent, learning_outcomes: newOutcomes });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Settings */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input type="number" placeholder="e.g., 40" />
                  </div>
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input type="number" placeholder="0 for free" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="publish" />
                    <Label htmlFor="publish">Publish immediately</Label>
                  </div>
                  <Button variant="hero">Create Course</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Courses", value: "24", icon: BookOpen, color: "text-primary" },
          { label: "Total Lessons", value: "342", icon: Video, color: "text-secondary" },
          { label: "Enrolled Students", value: "5,432", icon: Users, color: "text-green-500" },
          { label: "Completion Rate", value: "78%", icon: GraduationCap, color: "text-amber-500" },
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
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <LayoutList className="w-4 h-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-2">
            <Video className="w-4 h-4" />
            Lessons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookMarked className="w-3.5 h-3.5" />
                          {course.modules}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3.5 h-3.5" />
                          {course.lessons}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{course.enrolled.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Pencil className="w-4 h-4" />
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

        <TabsContent value="modules" className="mt-4">
          <Card className="p-8 text-center">
            <LayoutList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Module Management</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a course to view and manage its modules
            </p>
            <Button variant="outline">Select Course</Button>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="mt-4">
          <Card className="p-8 text-center">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Lesson Management</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage videos, PDFs, quizzes, and assignments
            </p>
            <Button variant="outline">Select Module</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLMS;
