import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Building2, Briefcase, GraduationCap, TrendingUp, Award, UserCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompetitions: 0,
    totalInstitutions: 0,
    totalCompanies: 0,
    totalMentors: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [users, competitions, institutions, companies, mentors] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("competitions").select("id", { count: "exact", head: true }),
      supabase.from("institutions").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("mentors").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: users.count || 0,
      totalCompetitions: competitions.count || 0,
      totalInstitutions: institutions.count || 0,
      totalCompanies: companies.count || 0,
      totalMentors: mentors.count || 0,
    });
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-primary", bg: "bg-primary/10" },
    { icon: Trophy, label: "Competitions", value: stats.totalCompetitions, color: "text-secondary", bg: "bg-secondary/10" },
    { icon: Building2, label: "Institutions", value: stats.totalInstitutions, color: "text-accent", bg: "bg-accent/10" },
    { icon: Briefcase, label: "Companies", value: stats.totalCompanies, color: "text-success", bg: "bg-success/10" },
    { icon: GraduationCap, label: "Mentors", value: stats.totalMentors, color: "text-primary", bg: "bg-primary/10" },
  ];

  const recentActivity = [
    { action: "New user registered", user: "John Doe", time: "2 minutes ago", type: "user" },
    { action: "Competition created", user: "Admin", time: "15 minutes ago", type: "competition" },
    { action: "Institution verified", user: "TU Admin", time: "1 hour ago", type: "institution" },
    { action: "New mentor joined", user: "Priya Thapa", time: "2 hours ago", type: "mentor" },
    { action: "Company registered", user: "CloudFactory", time: "3 hours ago", type: "company" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart Placeholder */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Platform Growth</CardTitle>
            <CardDescription>User registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Growth chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest platform activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.type === "user" && <UserCheck className="w-5 h-5 text-primary" />}
                    {activity.type === "competition" && <Trophy className="w-5 h-5 text-secondary" />}
                    {activity.type === "institution" && <Building2 className="w-5 h-5 text-accent" />}
                    {activity.type === "mentor" && <GraduationCap className="w-5 h-5 text-primary" />}
                    {activity.type === "company" && <Briefcase className="w-5 h-5 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verifications</p>
                <p className="text-3xl font-bold mt-1">12</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-secondary/5 to-secondary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Competitions</p>
                <p className="text-3xl font-bold mt-1">5</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-success/5 to-success/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Badges Awarded</p>
                <p className="text-3xl font-bold mt-1">248</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
