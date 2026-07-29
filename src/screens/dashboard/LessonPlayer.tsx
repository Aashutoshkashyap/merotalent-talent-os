import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  CheckCircle,
  Clock,
  ChevronLeft,
  FileText,
  List,
  ArrowLeft,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  dashboardPrimaryButton,
  dashboardSurface,
} from "@/components/dashboard/dashboardStyles";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  duration_minutes: number | null;
  order_index: number | null;
  is_preview: boolean;
  pdf_attachment_url: string | null;
  module_id: string;
  isCompleted?: boolean;
}

interface Module {
  id: string;
  title: string;
  order_index: number | null;
  lessons: Lesson[];
}

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, lessonId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      // Fetch course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseData) {
        setCourse(courseData);
      }

      // Fetch modules with lessons
      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (modulesData) {
        const modulesWithLessons = await Promise.all(
          modulesData.map(async (module) => {
            const { data: lessonsData } = await supabase
              .from("lessons")
              .select("*")
              .eq("module_id", module.id)
              .order("order_index");

            return {
              ...module,
              lessons: lessonsData || [],
            };
          })
        );

        setModules(modulesWithLessons);

        // Find and set current lesson
        const allLessons = modulesWithLessons.flatMap((m) => m.lessons);
        const lesson = lessonId
          ? allLessons.find((l) => l.id === lessonId)
          : allLessons[0];

        if (lesson) {
          setCurrentLesson(lesson);
        }
      }

      // Fetch completed lessons
      if (user) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("is_completed", true);

        if (progressData) {
          setCompletedLessons(progressData.map((p) => p.lesson_id));
        }
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
    }
    setIsLoading(false);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = (parseFloat(e.target.value) / 100) * duration;
      videoRef.current.currentTime = time;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen();
    }
  };

  const markLessonComplete = async () => {
    if (!user || !currentLesson) return;

    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: user.id,
      lesson_id: currentLesson.id,
      is_completed: true,
      completed_at: new Date().toISOString(),
    });

    if (!error) {
      setCompletedLessons((prev) => [...prev, currentLesson.id]);
      toast({
        title: "Lesson completed!",
        description: "Great job! Moving to the next lesson.",
      });
      goToNextLesson();
    }
  };

  const goToNextLesson = () => {
    const allLessons = modules.flatMap((m) => m.lessons);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      navigate(`/dashboard/learn/${courseId}/${nextLesson.id}`);
      setCurrentLesson(nextLesson);
    }
  };

  const goToPreviousLesson = () => {
    const allLessons = modules.flatMap((m) => m.lessons);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      navigate(`/dashboard/learn/${courseId}/${prevLesson.id}`);
      setCurrentLesson(prevLesson);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allLessons = modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const courseProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-130px)] flex-col gap-4 pb-3 lg:h-[calc(100vh-130px)] lg:flex-row">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/learning")}
          className="mb-1 w-fit rounded-xl text-[#6f6874] hover:bg-[#fff0e5] hover:text-[#c2410c]"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Learning Hub
        </Button>

        {/* Video Player */}
        <Card className={`${dashboardSurface} flex-1 overflow-hidden`}>
          <div className="relative aspect-video overflow-hidden bg-[#19172b]">
            {currentLesson?.content_type === "video" && currentLesson?.content_url ? (
              <>
                <video
                  ref={videoRef}
                  src={currentLesson.content_url}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={markLessonComplete}
                />
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1 mb-3 cursor-pointer"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={goToPreviousLesson}>
                        <SkipBack className="w-5 h-5 text-white" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={goToNextLesson}>
                        <SkipForward className="w-5 h-5 text-white" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleMute}>
                        {isMuted ? (
                          <VolumeX className="w-5 h-5 text-white" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-white" />
                        )}
                      </Button>
                      <span className="text-white text-sm">
                        {formatTime(progress * duration / 100)} / {formatTime(duration)}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                      <Maximize className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>
              </>
            ) : currentLesson?.content_type === "text" ? (
              <div className="p-6 h-full overflow-auto bg-background">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {currentLesson.content_text}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a lesson to start learning</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Lesson Info & Actions */}
        <Card className={`${dashboardSurface} mt-4`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{currentLesson?.title || "Select a Lesson"}</h2>
                <p className="text-muted-foreground text-sm">
                  Lesson {currentIndex + 1} of {totalLessons} • {currentLesson?.duration_minutes || 0} min
                </p>
              </div>
              <div className="flex gap-2">
                {currentLesson?.pdf_attachment_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={currentLesson.pdf_attachment_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      Download PDF
                    </a>
                  </Button>
                )}
                <Button
                  variant="hero"
                  size="sm"
                  className={dashboardPrimaryButton}
                  onClick={markLessonComplete}
                  disabled={completedLessons.includes(currentLesson?.id || "")}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {completedLessons.includes(currentLesson?.id || "") ? "Completed" : "Mark Complete"}
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousLesson}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNextLesson}
                disabled={currentIndex === totalLessons - 1}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Lesson List */}
      <div className={`w-full lg:w-80 ${showSidebar ? "" : "hidden lg:block"}`}>
        <Card className={`${dashboardSurface} h-full overflow-hidden`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Course Content</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setShowSidebar(false)}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(courseProgress)}%</span>
              </div>
              <Progress value={courseProgress} className="h-2" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              {modules.map((module) => (
                <div key={module.id} className="border-b border-border/50 last:border-0">
                  <div className="bg-[#fff6ef] px-4 py-3">
                    <h4 className="font-medium text-sm">{module.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {module.lessons.filter((l) => completedLessons.includes(l.id)).length} / {module.lessons.length} completed
                    </p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          navigate(`/dashboard/learn/${courseId}/${lesson.id}`);
                          setCurrentLesson(lesson);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fff8f2] ${
                          currentLesson?.id === lesson.id ? "bg-[#fff0e5]" : ""
                        }`}
                      >
                        {completedLessons.includes(lesson.id) ? (
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        ) : lesson.is_preview ? (
                          <Play className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${currentLesson?.id === lesson.id ? "font-medium text-primary" : ""}`}>
                            {lesson.title}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration_minutes || 0} min
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-2xl border-[#c2410c]/20 bg-white text-[#c2410c] shadow-lg lg:hidden"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <List className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default LessonPlayer;
