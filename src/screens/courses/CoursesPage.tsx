import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ExternalLink, Loader2, Search } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { PartnerCourseThumbnail } from "@/components/courses/PartnerCourseThumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  PARTNER_COURSE_SELECT,
  getPartnerCourseRedirect,
  isLivePartnerCourse,
  type PartnerCourse,
} from "@/lib/courses/partnered-courses";

const CoursesPage = () => {
  const [courses, setCourses] = useState<PartnerCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await (supabase as any)
      .from("courses")
      .select(PARTNER_COURSE_SELECT)
      .eq("is_partnered", true)
      .eq("is_published", true)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setCourses([]);
      setErrorMessage(error.message || "The partner course directory could not be loaded.");
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

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = !normalizedSearch || [course.title, course.description, course.partner_name, course.category]
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesCategory = activeCategory === "All" || course.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, courses, searchQuery]);

  const partnerCount = new Set(courses.map((course) => course.partner_name).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pb-6 pt-[68px] sm:pb-8">
        <section className="w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-5 shadow-[0_22px_56px_rgba(99,55,29,0.08)] sm:rounded-[32px] sm:p-7 lg:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-xs font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
                <BookOpen className="mr-1 h-3 w-3" />
                Partner course directory
              </Badge>
              <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
                Discover courses from partners you can <span className="text-[#c2410c]">trust.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
                Compare published partner listings here, then continue securely to learn.merotalent.com for enrollment and course delivery.
              </p>

              <div className="relative mt-7 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
                <Input
                  type="search"
                  placeholder="Search partner courses..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                [isLoading ? "—" : courses.length.toString(), "Live listings"],
                [isLoading ? "—" : Math.max(categories.length - 1, 0).toString(), "Categories"],
                [isLoading ? "—" : partnerCount.toString(), "Partners"],
              ].map(([value, label], index) => (
                <div key={label} className={`min-h-[112px] rounded-[18px] border p-4 ${index === 1 ? "border-[#d9eee6] bg-[#e8f7f1]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                  <p className={`text-xl font-black ${index === 1 ? "text-[#238366]" : "text-[#172039]"}`}>{value}</p>
                  <p className="mt-5 text-xs font-bold text-[#8e868e]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-3 w-full rounded-[22px] border border-[#eee7e2] bg-[#fffdfb] px-4 py-4 shadow-[0_14px_32px_rgba(99,55,29,0.05)] sm:px-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className={`h-10 rounded-full border-[#ece3de] px-4 text-xs font-black ${activeCategory === category ? "bg-[#c2410c] hover:bg-[#9a3412]" : "bg-white text-[#746d75] hover:border-[#fdba74] hover:text-[#c2410c]"}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-3 w-full rounded-[26px] border border-[#eee7e2] bg-[#fffdfb] p-3 shadow-[0_18px_46px_rgba(99,55,29,0.06)] sm:rounded-[32px] sm:p-5 lg:p-7">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-[#817980]">
              <Loader2 className="h-5 w-5 animate-spin text-[#c2410c]" />
              Loading live partner courses…
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-[#d9cfc9]" />
              <h2 className="text-lg font-black text-[#20273c]">Course directory unavailable</h2>
              <p className="mt-2 max-w-md text-sm text-[#8f8790]">{errorMessage}</p>
              <Button variant="outline" className="mt-5 rounded-xl" onClick={() => void fetchCourses()}>
                Try again
              </Button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <BookOpen className="mb-4 h-14 w-14 text-[#d9cfc9]" />
              <h2 className="text-lg font-black text-[#20273c]">
                {courses.length === 0 ? "No partner courses are published yet" : "No courses match your search"}
              </h2>
              <p className="mt-2 text-sm text-[#8f8790]">
                {courses.length === 0 ? "Published partner listings will appear here." : "Try another category or search term."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              {filteredCourses.map((course, index) => {
                const destination = getPartnerCourseRedirect(course.redirect_url);
                if (!destination) return null;
                return (
                <a key={course.id} href={destination} target="_blank" rel="noopener noreferrer" className={index === 0 ? "md:col-span-2 lg:col-span-8" : "lg:col-span-4"}>
                  <Card className="group h-full overflow-hidden rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)]">
                    <div className="relative aspect-video overflow-hidden">
                      <PartnerCourseThumbnail
                        source={course.thumbnail_url}
                        title={course.title}
                        className="h-full w-full"
                        imageClassName="transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#172039]/65 to-transparent" />
                      <Badge className="absolute left-3 top-3 rounded-full border-0 bg-[#238366] text-xs font-black">
                        Partner course
                      </Badge>
                    </div>

                    <CardHeader className="px-5 pb-2 pt-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#918990]">
                        <span className="font-black text-[#c2410c]">{course.category || "Course"}</span>
                        {course.partner_name && <><span>•</span><span>{course.partner_name}</span></>}
                      </div>
                      <h2 className="line-clamp-2 text-base font-black leading-snug text-[#20273c] transition-colors group-hover:text-[#c2410c]">
                        {course.title}
                      </h2>
                    </CardHeader>

                    <CardContent className="px-5 pb-4">
                      <p className="line-clamp-2 text-xs leading-5 text-[#8f8790]">
                        {course.description || "Open this listing to continue to the partner course platform."}
                      </p>
                    </CardContent>

                    <CardFooter className="border-t border-[#f0e8e3] px-5 py-3">
                      <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-black text-[#c2410c]">
                        Continue to course <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </CardFooter>
                  </Card>
                </a>
              )})}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;
