import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { PartnerCourseThumbnail } from "@/components/courses/PartnerCourseThumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  PARTNER_COURSE_SELECT,
  isLivePartnerCourse,
  type PartnerCourse,
} from "@/lib/courses/partnered-courses";

const CourseCatalogue = () => {
  const [courses, setCourses] = useState<PartnerCourse[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    const { data, error } = await (supabase as any)
      .from("courses")
      .select(PARTNER_COURSE_SELECT)
      .eq("is_partnered", true)
      .eq("is_published", true)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      setCourses([]);
      setHasError(true);
    } else {
      setCourses(((data || []) as PartnerCourse[]).filter(isLivePartnerCourse));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean) as string[])).sort()],
    [courses],
  );
  const filteredCourses = activeCategory === "All"
    ? courses
    : courses.filter((course) => course.category === activeCategory);

  return (
    <section id="courses" className="w-full bg-white py-20 md:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            <BookOpen className="mr-1 h-3 w-3" />
            Partner course directory
          </Badge>
          <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
            Explore Partner <span className="text-primary">Courses</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Discover approved listings on MeroTalent, then continue to learn.merotalent.com for enrollment and learning.
          </p>
        </div>

        {categories.length > 1 && (
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading partner courses…
          </div>
        ) : hasError ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <p className="font-semibold">Partner courses are temporarily unavailable.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchCourses()}>
              Try again
            </Button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <BookOpen className="mb-3 h-10 w-10" />
            <p>{courses.length === 0 ? "No partner courses are published yet." : "No listings are available in this category."}</p>
          </div>
        ) : (
          <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="h-full">
                <Card className="group h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-video overflow-hidden">
                    <PartnerCourseThumbnail
                      source={course.thumbnail_url}
                      title={course.title}
                      className="h-full w-full"
                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <Badge className="absolute left-3 top-3 bg-emerald-600">Partner course</Badge>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{course.category || "Course"}</span>
                      {course.partner_name && <><span>•</span><span>{course.partner_name}</span></>}
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description || "View this partner listing and continue to the course platform."}
                    </p>
                  </CardContent>

                  <CardFooter className="border-t border-border/50 pt-3">
                    <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      View listing <ExternalLink className="h-4 w-4" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/courses">
              Explore all partner courses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CourseCatalogue;
