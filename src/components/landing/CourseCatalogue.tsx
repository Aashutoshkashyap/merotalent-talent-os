import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { BookOpen, Clock, Users, Star, ArrowRight, Play, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Development", "Design", "Business", "Data Science", "Marketing"];

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
    price: 49,
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
    price: 79,
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
    price: 59,
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
    price: 69,
    modules: 11,
    lessons: 44,
  },
];

const CourseCatalogue = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCourses =
    activeCategory === "All"
      ? mockCourses
      : mockCourses.filter((course) => course.category === activeCategory);

  return (
    <section id="courses" className="w-full bg-white py-20 md:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Learning Platform
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Explore Our Course <span className="text-primary">Catalogue</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Master in-demand skills with our comprehensive courses featuring videos, 
            PDFs, quizzes, and hands-on assignments.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
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

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50"
            >
              {/* Thumbnail */}
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
                  {course.price === 0 ? "Free" : `$${course.price}`}
                </Badge>
                <Badge
                  variant="secondary"
                  className="absolute top-3 right-3 bg-background/80 backdrop-blur"
                >
                  {course.difficulty}
                </Badge>
                {/* Content Types */}
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
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup">
              Explore All Courses
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CourseCatalogue;
