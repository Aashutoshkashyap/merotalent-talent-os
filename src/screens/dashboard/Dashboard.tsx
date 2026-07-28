import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Award, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { profile, roles } = useAuth();

  const stats = [
    { icon: Trophy, label: "Competitions Joined", value: "12", trend: "+3 this month" },
    { icon: Award, label: "Badges Earned", value: "8", trend: "+2 this month" },
    { icon: Users, label: "Mentorship Sessions", value: "5", trend: "3 upcoming" },
    { icon: TrendingUp, label: "Global Rank", value: "#247", trend: "↑ 15 spots" },
  ];

  const upcomingCompetitions = [
    { title: "Nepal AI Challenge 2026", date: "Feb 15, 2026", type: "Hackathon", participants: 234 },
    { title: "Code Sprint Nepal", date: "Feb 20, 2026", type: "Coding", participants: 156 },
    { title: "Design Innovation Summit", date: "Mar 1, 2026", type: "Design", participants: 89 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Talent"}! 👋
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Ready to showcase your skills? Explore competitions, connect with mentors, and build your talent profile.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button asChild variant="hero">
            <Link to="/dashboard/competitions">
              Explore Competitions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/profile">Complete Profile</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
              <p className="text-xs text-success mt-3 font-medium">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Competitions */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Upcoming Competitions</CardTitle>
              <CardDescription>Competitions you might be interested in</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/competitions">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingCompetitions.map((comp) => (
                <div
                  key={comp.title}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{comp.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {comp.date}
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {comp.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{comp.participants}</p>
                    <p className="text-xs text-muted-foreground">participants</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            <CardDescription>Things you can do right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/profile">
                <Users className="w-4 h-4 mr-2" />
                Complete your profile
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/competitions">
                <Trophy className="w-4 h-4 mr-2" />
                Join a competition
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/mentors">
                <Users className="w-4 h-4 mr-2" />
                Find a mentor
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/learning">
                <Award className="w-4 h-4 mr-2" />
                Start learning
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Roles Display (for debugging) */}
      {roles.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Your roles: {roles.join(", ")}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
