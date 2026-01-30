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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              <BookOpen className="w-3 h-3 mr-1" />
              Learning Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Explore Our <span className="text-primary">Courses</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Master in-demand skills with our comprehensive courses featuring videos, PDFs, quizzes, and hands-on assignments.
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
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
              <Select value={activeDifficulty} onValueChange={setActiveDifficulty}>
                <SelectTrigger className="w-40">
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
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 h-full">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge
                        className={cn(
                          "absolute top-3 left-3",
                          course.price === 0 ? "bg-green-500" : "bg-primary"
                        )}
                      >
                        {course.price === 0 ? "Free" : `NPR ${course.price.toLocaleString()}`}
                      </Badge>
                      <Badge variant="secondary" className="absolute top-3 right-3 bg-background/80 backdrop-blur">
                        {course.difficulty}
                      </Badge>
                      <div className="absolute bottom-3 left-3 flex gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Videos">
                          <Play className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Documents">
                          <FileText className="w-3.5 h-3.5 text-secondary" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center" title="Quizzes">
                          <HelpCircle className="w-3.5 h-3.5 text-accent" />
                        </div>
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="text-primary font-medium">{course.category}</span>
                        <span>•</span>
                        <span>{course.modules} modules</span>
                        <span>•</span>
                        <span>{course.lessons} lessons</span>
                      </div>
                      <h3 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {course.title}
                      </h3>
                    </CardHeader>

                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between w-full text-sm">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.enrolled.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-amber-500">
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
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query</p>
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
