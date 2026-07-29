import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Users, Star, Play, FileText, HelpCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Development", "Design", "Business", "Data Science", "Marketing"];
const difficulties = ["All Levels", "Beginner", "Intermediate", "Advanced"];

const mockCourses = [
  {
    id: "1",
    title: "Full Stack Web Development Bootcamp",
    description: "Master modern web development with React, Node.js, and databases",
    thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400",
    category: "Development",
    difficulty: "Intermediate",
    duration: 40,
    enrolled: 1234,
    rating: 4.8,
    price: 0,
    modules: 12,
    lessons: 48,
  },
  {
    id: "2",
    title: "UI/UX Design Masterclass",
    description: "Learn design thinking, wireframing, and prototyping with Figma",
    thumbnail: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=400",
    category: "Design",
    difficulty: "Beginner",
    duration: 25,
    enrolled: 876,
    rating: 4.9,
    price: 2999,
    modules: 8,
    lessons: 32,
  },
  {
    id: "3",
    title: "Data Science with Python",
    description: "From basics to machine learning models with hands-on projects",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
    category: "Data Science",
    difficulty: "Advanced",
    duration: 60,
    enrolled: 654,
    rating: 4.7,
    price: 4999,
    modules: 15,
    lessons: 72,
  },
  {
    id: "4",
    title: "Digital Marketing Fundamentals",
    description: "SEO, Social Media, and Content Marketing strategies",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
    category: "Marketing",
    difficulty: "Beginner",
    duration: 20,
    enrolled: 1543,
    rating: 4.6,
    price: 0,
    modules: 6,
    lessons: 24,
  },
  {
    id: "5",
    title: "Entrepreneurship & Business Strategy",
    description: "Build and scale your startup with proven frameworks",
    thumbnail: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400",
    category: "Business",
    difficulty: "Intermediate",
    duration: 30,
    enrolled: 432,
    rating: 4.8,
    price: 3499,
    modules: 10,
    lessons: 40,
  },
  {
    id: "6",
    title: "Mobile App Development with React Native",
    description: "Build cross-platform apps for iOS and Android",
    thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400",
    category: "Development",
    difficulty: "Intermediate",
    duration: 35,
    enrolled: 765,
    rating: 4.7,
    price: 3999,
    modules: 11,
    lessons: 44,
  },
];

const CoursesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All Levels");

  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || course.category === activeCategory;
    const matchesDifficulty = activeDifficulty === "All Levels" || course.difficulty === activeDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-[#f4dfd4]">
      <Navbar />
      
      <main className="px-3 pb-6 pt-[84px] sm:px-5 sm:pb-8 sm:pt-[96px] lg:px-8">
        {/* Hero Section */}
        <section className="mx-auto max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] p-5 shadow-[0_28px_70px_rgba(99,55,29,0.11)] sm:rounded-[32px] sm:p-7 lg:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
            <Badge className="mb-4 rounded-full border border-[#fed7aa] bg-[#fff7ed] text-[9px] font-black uppercase tracking-[0.14em] text-[#c2410c] hover:bg-[#fff7ed]">
              <BookOpen className="mr-1 h-3 w-3" />
              Learning Platform
            </Badge>
            <h1 className="max-w-2xl font-display text-4xl font-black tracking-[-0.045em] text-[#172039] md:text-5xl">
              Build skills through work you can <span className="text-[#c2410c]">show.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#817980]">
              Master in-demand skills with our comprehensive courses featuring videos, PDFs, quizzes, and hands-on assignments.
            </p>
            
            {/* Search */}
            <div className="relative mt-7 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999096]" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-[14px] border-[#ede5e0] bg-[#faf7f5] pl-11 text-sm shadow-none focus-visible:border-[#fb923c] focus-visible:ring-[#c2410c]/10"
              />
            </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["68", "Skill tracks"],
                ["24", "Free courses"],
                ["4.8", "Learner rating"],
              ].map(([value, label], index) => (
                <div key={label} className={`min-h-[112px] rounded-[18px] border p-4 ${index === 1 ? "border-[#d9eee6] bg-[#e8f7f1]" : "border-[#f0e8e3] bg-[#fffaf7]"}`}>
                  <p className={`text-xl font-black ${index === 1 ? "text-[#238366]" : "text-[#172039]"}`}>{value}</p>
                  <p className="mt-5 text-[9px] font-bold text-[#8e868e]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mx-auto mt-3 max-w-[1420px] rounded-[22px] border border-white/80 bg-[#fffdfb] px-4 py-4 shadow-[0_16px_38px_rgba(99,55,29,0.07)] sm:px-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(category)}
                    className={`h-8 rounded-full border-[#ece3de] px-3 text-[9px] font-black ${activeCategory === category ? "bg-[#c2410c] hover:bg-[#9a3412]" : "bg-white text-[#746d75] hover:border-[#fdba74] hover:text-[#c2410c]"}`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <Select value={activeDifficulty} onValueChange={setActiveDifficulty}>
                <SelectTrigger className="h-9 w-40 rounded-xl border-[#ece3de] bg-[#faf7f5] text-[10px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Course Grid */}
        <section className="mx-auto mt-3 max-w-[1420px] rounded-[26px] border border-white/80 bg-[#fffdfb] p-3 shadow-[0_24px_60px_rgba(99,55,29,0.09)] sm:rounded-[32px] sm:p-5 lg:p-7">
          <div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              {filteredCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`} className={course.id === "1" ? "md:col-span-2 lg:col-span-8" : "lg:col-span-4"}>
                  <Card className="group h-full overflow-hidden rounded-[22px] border-[#f0e8e3] bg-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#fdba74] hover:shadow-[0_16px_32px_rgba(85,52,32,0.08)]">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#172039]/70 to-transparent" />
                      <Badge
                        className={cn(
                          "absolute left-3 top-3 rounded-full border-0 text-[8px] font-black",
                          course.price === 0 ? "bg-[#238366]" : "bg-[#c2410c]"
                        )}
                      >
                        {course.price === 0 ? "Free" : `NPR ${course.price.toLocaleString()}`}
                      </Badge>
                      <Badge variant="secondary" className="absolute right-3 top-3 rounded-full bg-white/90 text-[8px] font-black text-[#504a53] backdrop-blur">
                        {course.difficulty}
                      </Badge>
                      <div className="absolute bottom-3 left-3 flex gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Videos">
                          <Play className="h-3.5 w-3.5 text-[#c2410c]" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Documents">
                          <FileText className="h-3.5 w-3.5 text-[#238366]" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Quizzes">
                          <HelpCircle className="h-3.5 w-3.5 text-[#a66b00]" />
                        </div>
                      </div>
                    </div>

                    <CardHeader className="px-5 pb-2 pt-5">
                      <div className="mb-2 flex items-center gap-2 text-[8px] text-[#918990]">
                        <span className="font-black text-[#c2410c]">{course.category}</span>
                        <span>•</span>
                        <span>{course.modules} modules</span>
                        <span>•</span>
                        <span>{course.lessons} lessons</span>
                      </div>
                      <h3 className="line-clamp-2 text-base font-black leading-snug text-[#20273c] transition-colors group-hover:text-[#c2410c]">
                        {course.title}
                      </h3>
                    </CardHeader>

                    <CardContent className="px-5 pb-4">
                      <p className="line-clamp-2 text-[10px] leading-5 text-[#8f8790]">
                        {course.description}
                      </p>
                    </CardContent>

                    <CardFooter className="border-t border-[#f0e8e3] px-5 py-3">
                      <div className="flex w-full items-center justify-between text-[9px]">
                        <div className="flex items-center gap-4 text-[#918990]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.enrolled.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-[#c2410c]">
                            <Star className="w-4 h-4 fill-current" />
                            {course.rating}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="py-16 text-center">
                <BookOpen className="mx-auto mb-4 h-14 w-14 text-[#d9cfc9]" />
                <h3 className="mb-2 text-lg font-black text-[#20273c]">No courses found</h3>
                <p className="text-sm text-[#8f8790]">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;
