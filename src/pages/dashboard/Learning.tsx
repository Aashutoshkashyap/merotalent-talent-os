import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContentProtectionProvider from "@/providers/ContentProtectionProvider";
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
  Shield
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

const Learning = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Courses", icon: BookOpen },
    { id: "coding", label: "Coding", icon: Code },
    { id: "design", label: "Design", icon: Palette },
    { id: "business", label: "Business", icon: TrendingUp },
    { id: "leadership", label: "Leadership", icon: Users },
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
    {
      id: "7",
      title: "Figma for Professionals",
      instructor: "Maya Rai",
      category: "design",
      duration: "24 hours",
      progress: 0,
      rating: 4.9,
      enrolled: 2156,
      thumbnail: "✏️",
      level: "Intermediate",
    },
    {
      id: "8",
      title: "Data Structures & Algorithms",
      instructor: "Dr. Aarav Sharma",
      category: "coding",
      duration: "48 hours",
      progress: 0,
      rating: 4.7,
      enrolled: 1876,
      thumbnail: "🧮",
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

  const handleContinueLearning = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const handleEnrollCourse = (course: Course) => {
    navigate(`/courses/${course.id}/checkout`);
  };

  const handleJoinLiveClass = (link?: string, className?: string) => {
    if (link) {
      window.open(link, "_blank");
      toast({
        title: "Joining Live Class",
        description: `Opening ${className} live session...`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "No Live Class",
        description: "No live class is currently scheduled for this course.",
      });
    }
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
            
            {/* Live Class Button */}
            {course.liveClassLink && (
              <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{course.nextLiveClass}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleJoinLiveClass(course.liveClassLink, course.title)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Join
                  </Button>
                </div>
              </div>
            )}
            
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
    <ContentProtectionProvider enabled={true} showWarnings={true}>
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

      <Tabs defaultValue="my-courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
          <TabsTrigger value="browse">Browse All</TabsTrigger>
        </TabsList>

        <TabsContent value="my-courses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCourses.map((course) => (
              <CourseCard key={course.id} course={course} showProgress />
            ))}
          </div>
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
    </ContentProtectionProvider>
  );
};

export default Learning;