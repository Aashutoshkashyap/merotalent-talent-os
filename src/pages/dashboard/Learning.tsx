import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  Search, 
  CheckCircle,
  Trophy,
  Zap,
  Code,
  Palette,
  TrendingUp,
  Users,
  Video,
  ExternalLink,
  Shield,
  FileQuestion,
  Calendar,
  PlayCircle,
  Radio
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  instructor: string;
  category: string;
  duration: string;
  progress: number;
  rating: number;
  enrolled: number;
  thumbnail: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  isEnrolled?: boolean;
  liveClassLink?: string;
  nextLiveClass?: string;
}

interface LiveClass {
  id: string;
  courseTitle: string;
  lessonTitle: string;
  instructor: string;
  scheduledAt: string;
  duration: number;
  meetingLink: string;
  status: "upcoming" | "live" | "completed";
}

interface Quiz {
  id: string;
  courseTitle: string;
  quizTitle: string;
  totalQuestions: number;
  duration: number;
  passingScore: number;
  attempts: number;
  bestScore?: number;
  status: "not_started" | "in_progress" | "completed";
}

interface RecordedLesson {
  id: string;
  courseTitle: string;
  lessonTitle: string;
  duration: number;
  progress: number;
  thumbnail: string;
  instructor: string;
}

const Learning = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [contentTab, setContentTab] = useState("recorded");

  const categories = [
    { id: "all", label: "All Courses", icon: BookOpen },
    { id: "coding", label: "Coding", icon: Code },
    { id: "design", label: "Design", icon: Palette },
    { id: "business", label: "Business", icon: TrendingUp },
    { id: "leadership", label: "Leadership", icon: Users },
  ];

  // Mock data for recorded lessons
  const recordedLessons: RecordedLesson[] = [
    {
      id: "r1",
      courseTitle: "Complete Python Bootcamp",
      lessonTitle: "Variables and Data Types",
      duration: 25,
      progress: 100,
      thumbnail: "🐍",
      instructor: "Dr. Aarav Sharma",
    },
    {
      id: "r2",
      courseTitle: "Complete Python Bootcamp",
      lessonTitle: "Control Flow Statements",
      duration: 35,
      progress: 60,
      thumbnail: "🐍",
      instructor: "Dr. Aarav Sharma",
    },
    {
      id: "r3",
      courseTitle: "UI/UX Design Masterclass",
      lessonTitle: "Color Theory Fundamentals",
      duration: 40,
      progress: 0,
      thumbnail: "🎨",
      instructor: "Priya Thapa",
    },
    {
      id: "r4",
      courseTitle: "Machine Learning Fundamentals",
      lessonTitle: "Introduction to ML",
      duration: 30,
      progress: 45,
      thumbnail: "🤖",
      instructor: "Bikash Gurung",
    },
  ];

  // Mock data for live classes
  const liveClasses: LiveClass[] = [
    {
      id: "l1",
      courseTitle: "Complete Python Bootcamp",
      lessonTitle: "Live Q&A Session",
      instructor: "Dr. Aarav Sharma",
      scheduledAt: "Feb 2, 2026 - 3:00 PM",
      duration: 60,
      meetingLink: "https://meet.google.com/abc-def-ghi",
      status: "upcoming",
    },
    {
      id: "l2",
      courseTitle: "UI/UX Design Masterclass",
      lessonTitle: "Design Critique Session",
      instructor: "Priya Thapa",
      scheduledAt: "Feb 5, 2026 - 2:00 PM",
      duration: 90,
      meetingLink: "https://zoom.us/j/123456789",
      status: "upcoming",
    },
    {
      id: "l3",
      courseTitle: "Machine Learning Fundamentals",
      lessonTitle: "Project Review",
      instructor: "Bikash Gurung",
      scheduledAt: "Feb 1, 2026 - 4:00 PM",
      duration: 45,
      meetingLink: "https://meet.google.com/xyz-abc-123",
      status: "live",
    },
  ];

  // Mock data for quizzes
  const quizzes: Quiz[] = [
    {
      id: "q1",
      courseTitle: "Complete Python Bootcamp",
      quizTitle: "Python Basics Quiz",
      totalQuestions: 20,
      duration: 30,
      passingScore: 70,
      attempts: 2,
      bestScore: 85,
      status: "completed",
    },
    {
      id: "q2",
      courseTitle: "Complete Python Bootcamp",
      quizTitle: "Data Structures Quiz",
      totalQuestions: 15,
      duration: 25,
      passingScore: 70,
      attempts: 0,
      status: "not_started",
    },
    {
      id: "q3",
      courseTitle: "UI/UX Design Masterclass",
      quizTitle: "Design Principles Assessment",
      totalQuestions: 25,
      duration: 40,
      passingScore: 75,
      attempts: 1,
      bestScore: 68,
      status: "in_progress",
    },
    {
      id: "q4",
      courseTitle: "Machine Learning Fundamentals",
      quizTitle: "ML Concepts Quiz",
      totalQuestions: 30,
      duration: 45,
      passingScore: 80,
      attempts: 0,
      status: "not_started",
    },
  ];

  const myCourses: Course[] = [
    {
      id: "1",
      title: "Complete Python Bootcamp",
      instructor: "Dr. Aarav Sharma",
      category: "coding",
      duration: "42 hours",
      progress: 68,
      rating: 4.9,
      enrolled: 2340,
      thumbnail: "🐍",
      level: "Beginner",
      isEnrolled: true,
      liveClassLink: "https://meet.google.com/abc-def-ghi",
      nextLiveClass: "Feb 2, 2026 - 3:00 PM",
    },
    {
      id: "2",
      title: "UI/UX Design Masterclass",
      instructor: "Priya Thapa",
      category: "design",
      duration: "28 hours",
      progress: 45,
      rating: 4.8,
      enrolled: 1856,
      thumbnail: "🎨",
      level: "Intermediate",
      isEnrolled: true,
      liveClassLink: "https://zoom.us/j/123456789",
      nextLiveClass: "Feb 5, 2026 - 2:00 PM",
    },
    {
      id: "3",
      title: "Machine Learning Fundamentals",
      instructor: "Bikash Gurung",
      category: "coding",
      duration: "36 hours",
      progress: 12,
      rating: 4.7,
      enrolled: 1234,
      thumbnail: "🤖",
      level: "Advanced",
      isEnrolled: true,
    },
  ];

  const allCourses: Course[] = [
    ...myCourses,
    {
      id: "4",
      title: "React & Next.js Complete Guide",
      instructor: "Suman Maharjan",
      category: "coding",
      duration: "52 hours",
      progress: 0,
      rating: 4.9,
      enrolled: 3421,
      thumbnail: "⚛️",
      level: "Intermediate",
    },
    {
      id: "5",
      title: "Product Management Essentials",
      instructor: "Anita Shrestha",
      category: "business",
      duration: "18 hours",
      progress: 0,
      rating: 4.6,
      enrolled: 987,
      thumbnail: "📊",
      level: "Beginner",
    },
    {
      id: "6",
      title: "Leadership for Tech Teams",
      instructor: "Rajesh Koirala",
      category: "leadership",
      duration: "12 hours",
      progress: 0,
      rating: 4.8,
      enrolled: 654,
      thumbnail: "👔",
      level: "Advanced",
    },
  ];

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-success/10 text-success";
      case "Intermediate": return "bg-warning/10 text-warning";
      case "Advanced": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getQuizStatusColor = (status: Quiz["status"]) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "in_progress": return "bg-warning/10 text-warning";
      case "not_started": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getLiveStatusColor = (status: LiveClass["status"]) => {
    switch (status) {
      case "live": return "bg-destructive/10 text-destructive animate-pulse";
      case "upcoming": return "bg-primary/10 text-primary";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleContinueLearning = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const handleEnrollCourse = (course: Course) => {
    navigate(`/courses/${course.id}/checkout`);
  };

  const handleJoinLiveClass = (link: string, className: string) => {
    window.open(link, "_blank");
    toast({
      title: "Joining Live Class",
      description: `Opening ${className} live session...`,
    });
  };

  const handleStartQuiz = (quizId: string, quizTitle: string) => {
    toast({
      title: "Starting Quiz",
      description: `Loading ${quizTitle}...`,
    });
    // Navigate to quiz page when implemented
  };

  const handleWatchLesson = (lessonId: string, lessonTitle: string) => {
    toast({
      title: "Loading Video",
      description: `Opening ${lessonTitle}...`,
    });
    // Navigate to lesson page when implemented
  };

  const CourseCard = ({ course, showProgress = false }: { course: Course; showProgress?: boolean }) => (
    <Card className="border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center text-5xl">
        {course.thumbnail}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge className={getLevelColor(course.level)} variant="outline">
            {course.level}
          </Badge>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="font-medium">{course.rating}</span>
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription>{course.instructor}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {course.duration}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.enrolled.toLocaleString()}
          </div>
        </div>

        {showProgress && course.progress > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
            <Button 
              className="w-full" 
              variant="hero"
              onClick={() => handleContinueLearning(course.id)}
            >
              <Play className="w-4 h-4 mr-2" />
              Continue Learning
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full" 
            variant={course.isEnrolled ? "outline" : "hero"}
            onClick={() => course.isEnrolled ? handleContinueLearning(course.id) : handleEnrollCourse(course)}
          >
            {course.isEnrolled ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Enrolled
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Enroll Now
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Learning Hub</h1>
          <p className="text-muted-foreground">Build skills that matter for your career</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="w-3 h-3" />
          Content Protected
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Courses In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-2xl font-bold">7</p>
            <p className="text-xs text-muted-foreground">Completed Courses</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold">124h</p>
            <p className="text-xs text-muted-foreground">Learning Time</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-warning" />
            </div>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">Certificates Earned</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-learning" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="my-learning">My Learning</TabsTrigger>
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="my-learning" className="space-y-6">
          {/* Content Type Tabs */}
          <Tabs value={contentTab} onValueChange={setContentTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recorded" className="gap-2">
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Recorded</span>
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                <Radio className="w-4 h-4" />
                <span className="hidden sm:inline">Live Classes</span>
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2">
                <FileQuestion className="w-4 h-4" />
                <span className="hidden sm:inline">Quizzes</span>
              </TabsTrigger>
            </TabsList>

            {/* Recorded Content */}
            <TabsContent value="recorded" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recorded Lessons</h3>
                <Badge variant="secondary">{recordedLessons.length} lessons</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordedLessons.map((lesson) => (
                  <Card key={lesson.id} className="border-border/50 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl shrink-0">
                          {lesson.thumbnail}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">{lesson.courseTitle}</p>
                          <h4 className="font-medium text-sm line-clamp-2 mb-2">{lesson.lessonTitle}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration} min</span>
                            <span>•</span>
                            <span>{lesson.instructor}</span>
                          </div>
                          {lesson.progress > 0 && (
                            <div className="space-y-1">
                              <Progress value={lesson.progress} className="h-1" />
                              <p className="text-xs text-muted-foreground">{lesson.progress}% complete</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3" 
                        size="sm"
                        variant={lesson.progress === 100 ? "outline" : "default"}
                        onClick={() => handleWatchLesson(lesson.id, lesson.lessonTitle)}
                      >
                        <Play className="w-3 h-3 mr-2" />
                        {lesson.progress === 100 ? "Rewatch" : lesson.progress > 0 ? "Continue" : "Start"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Live Classes */}
            <TabsContent value="live" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Classes</h3>
                <Badge variant="secondary">{liveClasses.filter(c => c.status !== "completed").length} upcoming</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveClasses.map((liveClass) => (
                  <Card key={liveClass.id} className="border-border/50 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={getLiveStatusColor(liveClass.status)}>
                          {liveClass.status === "live" && <Radio className="w-3 h-3 mr-1" />}
                          {liveClass.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {liveClass.duration} min
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{liveClass.courseTitle}</p>
                      <h4 className="font-semibold mb-2">{liveClass.lessonTitle}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Users className="w-4 h-4" />
                        <span>{liveClass.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-4 p-2 bg-muted/50 rounded-lg">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{liveClass.scheduledAt}</span>
                      </div>
                      <Button 
                        className="w-full" 
                        variant={liveClass.status === "live" ? "destructive" : "default"}
                        disabled={liveClass.status === "completed"}
                        onClick={() => handleJoinLiveClass(liveClass.meetingLink, liveClass.lessonTitle)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {liveClass.status === "live" ? "Join Now" : liveClass.status === "upcoming" ? "Set Reminder" : "Completed"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {liveClasses.length === 0 && (
                <div className="text-center py-12">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No live classes scheduled</p>
                </div>
              )}
            </TabsContent>

            {/* Quizzes */}
            <TabsContent value="quizzes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quizzes & Assessments</h3>
                <Badge variant="secondary">{quizzes.filter(q => q.status === "completed").length}/{quizzes.length} completed</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="border-border/50 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={getQuizStatusColor(quiz.status)}>
                          {quiz.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {quiz.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        {quiz.bestScore !== undefined && (
                          <div className={`text-sm font-semibold ${quiz.bestScore >= quiz.passingScore ? "text-success" : "text-warning"}`}>
                            Best: {quiz.bestScore}%
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{quiz.courseTitle}</p>
                      <h4 className="font-semibold mb-3">{quiz.quizTitle}</h4>
                      <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold">{quiz.totalQuestions}</p>
                          <p className="text-xs text-muted-foreground">Questions</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold">{quiz.duration}</p>
                          <p className="text-xs text-muted-foreground">Minutes</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold">{quiz.passingScore}%</p>
                          <p className="text-xs text-muted-foreground">To Pass</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>Attempts: {quiz.attempts}</span>
                      </div>
                      <Button 
                        className="w-full" 
                        variant={quiz.status === "completed" ? "outline" : "default"}
                        onClick={() => handleStartQuiz(quiz.id, quiz.quizTitle)}
                      >
                        <FileQuestion className="w-4 h-4 mr-2" />
                        {quiz.status === "not_started" ? "Start Quiz" : quiz.status === "in_progress" ? "Continue Quiz" : "Retake Quiz"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {quizzes.length === 0 && (
                <div className="text-center py-12">
                  <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No quizzes available yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  <cat.icon className="w-4 h-4 mr-1" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No courses found matching your criteria.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Learning;
