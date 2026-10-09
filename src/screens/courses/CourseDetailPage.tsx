import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { PartnerCourseThumbnail } from "@/components/courses/PartnerCourseThumbnail";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPartnerCourseRedirect,
  type PartnerCourse,
} from "@/lib/courses/partnered-courses";

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<PartnerCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!id) {
      setErrorMessage("This course link is incomplete.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/courses/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        setCourse(null);
        setErrorMessage(json?.error?.message || "The partner course is not available.");
      } else {
        setCourse(json.data as PartnerCourse);
      }
    } catch (error) {
      setCourse(null);
      setErrorMessage(error instanceof Error ? error.message : "The partner course could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  const continueToPartner = () => {
    if (!course) return;
    const destination = getPartnerCourseRedirect(course.redirect_url);
    if (!destination) {
      setErrorMessage("The partner destination is not approved. Please try again later.");
      return;
    }

    window.open(destination, "_blank", "noopener,noreferrer");

    if (user) {
      void fetch(`/api/v1/courses/${course.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          destinationUrl: destination,
          referrer: window.location.href,
          metadata: {
            referral_code: course.referral_code,
            source: "course_detail",
          },
        }),
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pb-8 pt-[68px]">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-bold text-[#817980]">
            <Loader2 className="h-5 w-5 animate-spin text-[#c2410c]" />
            Loading partner course…
          </div>
        ) : !course ? (
          <section className="flex min-h-[60vh] w-full flex-col items-center justify-center rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] px-5 text-center shadow-[0_22px_56px_rgba(99,55,29,0.08)]">
            <BookOpen className="mb-4 h-12 w-12 text-[#d9cfc9]" />
            <h1 className="text-2xl font-black text-[#172039]">Course unavailable</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#817980]">
              {errorMessage || "This partner course is not available."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => void fetchCourse()}>
                Try again
              </Button>
              <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]" onClick={() => navigate("/courses")}>
                Browse courses
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_22px_56px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:p-7 lg:p-9">
              <Button
                variant="ghost"
                onClick={() => navigate("/courses")}
                className="mb-6 h-10 rounded-xl text-xs font-black text-[#746d75] hover:bg-[#fff0e7] hover:text-[#c2410c]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to courses
              </Button>

              <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full border-0 bg-[#238366] text-xs font-black hover:bg-[#238366]">
                      Partner course
                    </Badge>
                    {course.category && (
                      <Badge variant="outline" className="rounded-full border-[#e8e1dc] text-xs font-black">
                        {course.category}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h1 className="max-w-4xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
                      {course.title}
                    </h1>
                    {course.partner_name && (
                      <p className="mt-3 text-sm font-black text-[#c2410c]">Offered by {course.partner_name}</p>
                    )}
                  </div>

                  <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-[#817980]">
                    {course.description || "Open this approved listing to continue to the partner learning platform."}
                  </p>

                  <Card className="rounded-[20px] border-[#d9eee6] bg-[#e8f7f1] shadow-none">
                    <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                      <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#238366]" />
                        <div>
                          <p className="text-sm font-black text-[#263a35]">Verified destination</p>
                          <p className="mt-1 text-xs leading-5 text-[#687b75]">
                            MeroTalent only opens approved HTTPS links on learn.merotalent.com.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#238366]" />
                        <div>
                          <p className="text-sm font-black text-[#263a35]">Partner-managed learning</p>
                          <p className="mt-1 text-xs leading-5 text-[#687b75]">
                            Enrollment, lessons, progress and certificates are handled on the partner platform.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden rounded-[22px] border-[#f0e8e3] bg-white shadow-[0_18px_38px_rgba(85,52,32,0.09)] lg:sticky lg:top-24">
                  <PartnerCourseThumbnail
                    source={course.thumbnail_url}
                    title={course.title}
                    className="aspect-video w-full"
                  />
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9a9298]">Continue securely</p>
                      <p className="mt-2 text-sm leading-6 text-[#746d75]">
                        You are leaving MeroTalent and opening the partner course platform in a new tab.
                      </p>
                    </div>
                    {errorMessage && <p className="text-xs font-semibold text-destructive">{errorMessage}</p>}
                    <Button
                      size="lg"
                      className="w-full rounded-xl bg-[#c2410c] text-xs font-black hover:bg-[#9a3412]"
                      onClick={continueToPartner}
                    >
                      Continue to course
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-center text-[11px] leading-4 text-[#9a9298]">learn.merotalent.com</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_18px_46px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-7">
              <h2 className="text-xl font-black text-[#20273c]">How partnered courses work</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  ["1", "Review the listing", "Use MeroTalent to discover and compare approved partner courses."],
                  ["2", "Continue to the partner", "The course button opens only the approved MeroTalent learning host."],
                  ["3", "Learn on the partner platform", "Enrollment and all learning activity stay on learn.merotalent.com."],
                ].map(([step, title, description]) => (
                  <div key={step} className="rounded-[18px] border border-[#f0e8e3] bg-white p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0e7] text-xs font-black text-[#c2410c]">
                      {step}
                    </span>
                    <h3 className="mt-4 text-sm font-black text-[#303649]">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#8f8790]">{description}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetailPage;
