import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Trophy,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  passing_score: number | null;
  course_id: string | null;
}

const QuizPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<"intro" | "in_progress" | "completed">("intro");
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

  useEffect(() => {
    if (quizState === "in_progress" && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizState, timeLeft]);

  const fetchQuizData = async () => {
    setIsLoading(true);
    try {
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizData) {
        setQuiz(quizData);
        setTimeLeft(quizData.duration_minutes ? quizData.duration_minutes * 60 : null);
      }

      const { data: questionsData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");

      if (questionsData) {
        setQuestions(
          questionsData.map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string || "[]"),
            points: q.points || 1,
            order_index: q.order_index || 0,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
    }
    setIsLoading(false);
  };

  const startQuiz = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please login to take this quiz.",
      });
      return;
    }

    // Create quiz attempt
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (data) {
      setAttemptId(data.id);
    }

    setQuizState("in_progress");
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!user || !attemptId) return;

    // Calculate score
    let totalScore = 0;
    let correctCount = 0;

    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        totalScore += q.points;
        correctCount++;
      }
    });

    const percentageScore = Math.round((correctCount / questions.length) * 100);
    setScore(percentageScore);

    // Update quiz attempt
    await supabase
      .from("quiz_attempts")
      .update({
        answers: answers,
        score: percentageScore,
        completed_at: new Date().toISOString(),
        passed: percentageScore >= (quiz?.passing_score || 70),
      })
      .eq("id", attemptId);

    setQuizState("completed");

    toast({
      title: percentageScore >= (quiz?.passing_score || 70) ? "Congratulations!" : "Quiz Complete",
      description: `You scored ${percentageScore}%`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Intro Screen
  if (quizState === "intro") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/learning")}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Learning Hub
        </Button>

        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{quiz?.title}</CardTitle>
            <CardDescription>{quiz?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{quiz?.duration_minutes || "∞"}</p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{quiz?.passing_score || 70}%</p>
                <p className="text-sm text-muted-foreground">Passing Score</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-muted-foreground">Attempt</p>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Before you start</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• Make sure you have a stable internet connection</li>
                    <li>• You cannot pause or leave the quiz once started</li>
                    <li>• Each question must be answered before proceeding</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button variant="hero" className="w-full" size="lg" onClick={startQuiz}>
              <Play className="w-5 h-5 mr-2" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz Complete Screen
  if (quizState === "completed") {
    const passed = score >= (quiz?.passing_score || 70);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                passed ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {passed ? (
                <Trophy className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </CardTitle>
            <CardDescription>
              {passed
                ? "You've successfully passed this quiz!"
                : "You didn't pass this time, but you can try again!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{score}%</p>
              <p className="text-muted-foreground">Your Score</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-success">
                  {Object.values(answers).filter((a, i) => a === questions[i]?.correct_answer).length}
                </p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-destructive">
                  {questions.length - Object.values(answers).filter((a, i) => a === questions[i]?.correct_answer).length}
                </p>
                <p className="text-xs text-muted-foreground">Wrong</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xl font-bold">{quiz?.passing_score || 70}%</p>
                <p className="text-xs text-muted-foreground">Required</p>
              </div>
            </div>

            {/* Review Answers */}
            <div className="space-y-4">
              <h3 className="font-semibold">Review Answers</h3>
              {questions.map((q, index) => (
                <div key={q.id} className="p-4 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3">
                    {answers[q.id] === q.correct_answer ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {index + 1}. {q.question}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your answer: <span className={answers[q.id] === q.correct_answer ? "text-success" : "text-destructive"}>{answers[q.id] || "Not answered"}</span>
                      </p>
                      {answers[q.id] !== q.correct_answer && (
                        <p className="text-sm text-success mt-1">
                          Correct answer: {q.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard/learning")}>
                Back to Learning
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => {
                setQuizState("intro");
                setAnswers({});
                setCurrentQuestionIndex(0);
                setScore(0);
              }}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz In Progress
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{quiz?.title}</h1>
          <p className="text-muted-foreground text-sm">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        {timeLeft !== null && (
          <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="text-lg py-2 px-4">
            <Clock className="w-4 h-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />

      {/* Question Card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestionIndex + 1}. {currentQuestion?.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion?.id] || ""}
            onValueChange={(value) => handleAnswerSelect(currentQuestion?.id, value)}
            className="space-y-3"
          >
            {currentQuestion?.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  answers[currentQuestion?.id] === option
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:bg-muted/50"
                }`}
                onClick={() => handleAnswerSelect(currentQuestion?.id, option)}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-1">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                index === currentQuestionIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[questions[index]?.id]
                  ? "bg-success/20 text-success"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button variant="hero" onClick={handleSubmitQuiz}>
            Submit Quiz
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            disabled={!answers[currentQuestion?.id]}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
