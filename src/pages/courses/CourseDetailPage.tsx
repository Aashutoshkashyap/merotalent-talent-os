import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import ContentProtectionProvider from "@/providers/ContentProtectionProvider";
import {
  BookOpen, Clock, Users, Star, Play, FileText, HelpCircle, CheckCircle,
  GraduationCap, Award, Video, ShoppingCart, ArrowLeft, Shield
} from "lucide-react";

// Mock course data
const courseData = {
  id: "1",
  title: "Full Stack Web Development Bootcamp",
  description: "Master modern web development with React, Node.js, and databases. This comprehensive bootcamp covers everything from frontend to backend development.",
  longDescription: `This course is designed to take you from a complete beginner to a job-ready full stack developer. 
  
  You'll learn:
  - HTML, CSS, and JavaScript fundamentals
  - React.js for building modern user interfaces
  - Node.js and Express for backend development
  - PostgreSQL and MongoDB for databases
  - Authentication, APIs, and deployment
  
  By the end of this course, you'll have built several real-world projects and be ready to apply for junior developer positions.`,
  thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
  category: "Development",
  difficulty: "Intermediate",
  duration: 40,
  enrolled: 1234,
  rating: 4.8,
  reviews: 342,
  price: 0,
  instructor: {
    name: "John Developer",
    avatar: "JD",
    bio: "Senior Software Engineer with 10+ years of experience",
  },
  learningOutcomes: [
    "Build modern, responsive websites from scratch",
    "Create full-stack applications with React and Node.js",
    "Work with databases including PostgreSQL and MongoDB",
    "Implement user authentication and authorization",
    "Deploy applications to cloud platforms",
    "Follow industry best practices and design patterns",
  ],
  modules: [
    {
      id: "m1",
      title: "Introduction to Web Development",
      lessons: [
        { id: "l1", title: "Course Overview", duration: 10, type: "video", isPreview: true },
        { id: "l2", title: "Setting Up Your Environment", duration: 15, type: "video" },
        { id: "l3", title: "HTML Basics", duration: 30, type: "video" },
        { id: "l4", title: "CSS Fundamentals", duration: 45, type: "video" },
        { id: "l5", title: "Module Quiz", duration: 15, type: "quiz" },
      ],
    },
    {
      id: "m2",
      title: "JavaScript Essentials",
      lessons: [
        { id: "l6", title: "Variables and Data Types", duration: 25, type: "video" },
        { id: "l7", title: "Functions and Scope", duration: 30, type: "video" },
        { id: "l8", title: "DOM Manipulation", duration: 40, type: "video" },
        { id: "l9", title: "Practice Exercises", duration: 60, type: "pdf" },
        { id: "l10", title: "Module Quiz", duration: 20, type: "quiz" },
      ],
    },
    {
      id: "m3",
      title: "React.js Fundamentals",
      lessons: [
        { id: "l11", title: "Introduction to React", duration: 20, type: "video" },
        { id: "l12", title: "Components and Props", duration: 35, type: "video" },
        { id: "l13", title: "State and Hooks", duration: 45, type: "video" },
        { id: "l14", title: "Building a Todo App", duration: 60, type: "video" },
      ],
    },
  ],
};

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = () => {
    if (courseData.price === 0) {
      setIsEnrolling(true);
      setTimeout(() => {
        toast({
          title: "Enrolled successfully!",
          description: "You can now access all course content.",
        });
        navigate("/dashboard/learning");
      }, 1500);
    } else {
      navigate(`/courses/${id}/checkout`);
    }
  };

  const totalLessons = courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = courseData.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0),
    0
  );

  return (
    <ContentProtectionProvider enabled={true} showWarnings={true}>
      <div className="min-h-screen bg-background">
        <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <Button variant="ghost" onClick={() => navigate("/courses")} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge>{courseData.category}</Badge>
                  <Badge variant="outline">{courseData.difficulty}</Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  {courseData.title}
                </h1>

                <p className="text-lg text-muted-foreground">
                  {courseData.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    {courseData.rating} ({courseData.reviews} reviews)
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {courseData.enrolled.toLocaleString()} students
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {courseData.duration} hours
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    {totalLessons} lessons
                  </span>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {courseData.instructor.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{courseData.instructor.name}</p>
                    <p className="text-sm text-muted-foreground">{courseData.instructor.bio}</p>
                  </div>
                </div>
              </div>

              {/* Enrollment Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={courseData.thumbnail}
                      alt={courseData.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="text-3xl font-bold">
                      {courseData.price === 0 ? (
                        <span className="text-green-500">Free</span>
                      ) : (
                        `NPR ${courseData.price.toLocaleString()}`
                      )}
                    </div>

                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? (
                        "Enrolling..."
                      ) : courseData.price === 0 ? (
                        <>
                          <GraduationCap className="w-5 h-5 mr-2" />
                          Enroll Now - Free
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>

                    <div className="space-y-3 text-sm">
                      <p className="font-medium">This course includes:</p>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          {totalDuration} minutes of video
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Downloadable resources
                        </div>
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          Quizzes & assessments
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Certificate of completion
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Content protection enabled
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="curriculum" className="space-y-8">
              <TabsList>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="curriculum" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Course Content</h2>
                  <span className="text-sm text-muted-foreground">
                    {courseData.modules.length} modules • {totalLessons} lessons • {Math.round(totalDuration / 60)}h total
                  </span>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {courseData.modules.map((module, index) => (
                    <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {index + 1}
                          </span>
                          <div className="text-left">
                            <p className="font-medium">{module.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {module.lessons.length} lessons • {module.lessons.reduce((a, l) => a + l.duration, 0)} min
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-12 pb-4">
                          {module.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                {lesson.type === "video" && <Play className="w-4 h-4 text-primary" />}
                                {lesson.type === "pdf" && <FileText className="w-4 h-4 text-secondary" />}
                                {lesson.type === "quiz" && <HelpCircle className="w-4 h-4 text-accent" />}
                                <span className="text-sm">{lesson.title}</span>
                                {lesson.isPreview && (
                                  <Badge variant="outline" className="text-xs">Preview</Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">{lesson.duration} min</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="overview" className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">About This Course</h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line text-muted-foreground">
                      {courseData.longDescription}
                    </p>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">What You'll Learn</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {courseData.learningOutcomes.map((outcome, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                <div className="text-center py-12">
                  <Star className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Student Reviews</h3>
                  <p className="text-muted-foreground">Reviews will be shown here</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

        <Footer />
      </div>
    </ContentProtectionProvider>
  );
};

export default CourseDetailPage;
