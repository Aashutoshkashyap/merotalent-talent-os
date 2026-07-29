import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Award, 
  Star, 
  Zap, 
  Target,
  Medal,
  Crown,
  Flame,
  Sparkles,
  Lock,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardInteractiveSurface,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "achievement" | "competition" | "skill" | "community";
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedAt?: string;
  progress?: number;
  requirement?: string;
}

const Badges = () => {
  const earnedBadges: BadgeItem[] = [
    {
      id: "1",
      name: "First Steps",
      description: "Completed your first competition",
      icon: "🎯",
      category: "achievement",
      rarity: "common",
      earnedAt: "Jan 15, 2026",
    },
    {
      id: "2",
      name: "Code Warrior",
      description: "Won first place in a coding competition",
      icon: "⚔️",
      category: "competition",
      rarity: "rare",
      earnedAt: "Jan 20, 2026",
    },
    {
      id: "3",
      name: "Quick Learner",
      description: "Completed 5 courses in a month",
      icon: "📚",
      category: "skill",
      rarity: "common",
      earnedAt: "Jan 22, 2026",
    },
    {
      id: "4",
      name: "Team Player",
      description: "Participated in 3 team competitions",
      icon: "🤝",
      category: "community",
      rarity: "common",
      earnedAt: "Jan 25, 2026",
    },
    {
      id: "5",
      name: "Rising Star",
      description: "Reached top 100 in global rankings",
      icon: "⭐",
      category: "achievement",
      rarity: "epic",
      earnedAt: "Jan 28, 2026",
    },
    {
      id: "6",
      name: "AI Master",
      description: "Won a machine learning competition",
      icon: "🤖",
      category: "competition",
      rarity: "epic",
      earnedAt: "Jan 29, 2026",
    },
    {
      id: "7",
      name: "Mentor's Choice",
      description: "Received 5 excellent mentor reviews",
      icon: "🏆",
      category: "community",
      rarity: "rare",
      earnedAt: "Jan 30, 2026",
    },
    {
      id: "8",
      name: "Problem Solver",
      description: "Solved 100 coding challenges",
      icon: "🧩",
      category: "skill",
      rarity: "rare",
      earnedAt: "Jan 30, 2026",
    },
  ];

  const inProgressBadges: BadgeItem[] = [
    {
      id: "9",
      name: "Grandmaster",
      description: "Reach top 10 in global rankings",
      icon: "👑",
      category: "achievement",
      rarity: "legendary",
      progress: 72,
      requirement: "Current rank: #28",
    },
    {
      id: "10",
      name: "Hackathon Hero",
      description: "Win 5 hackathons",
      icon: "🦸",
      category: "competition",
      rarity: "epic",
      progress: 60,
      requirement: "3/5 hackathons won",
    },
    {
      id: "11",
      name: "Polyglot",
      description: "Complete courses in 5 different skill categories",
      icon: "🌐",
      category: "skill",
      rarity: "rare",
      progress: 80,
      requirement: "4/5 categories completed",
    },
    {
      id: "12",
      name: "Community Champion",
      description: "Help 50 fellow talents with mentorship",
      icon: "💪",
      category: "community",
      rarity: "epic",
      progress: 34,
      requirement: "17/50 talents helped",
    },
  ];

  const lockedBadges: BadgeItem[] = [
    {
      id: "13",
      name: "Legend",
      description: "Hold #1 rank for 30 days",
      icon: "🌟",
      category: "achievement",
      rarity: "legendary",
      requirement: "Reach #1 first",
    },
    {
      id: "14",
      name: "Triple Threat",
      description: "Win competitions in 3 different categories",
      icon: "🎖️",
      category: "competition",
      rarity: "legendary",
      requirement: "Win in Design, Coding, and Business",
    },
    {
      id: "15",
      name: "Knowledge Oracle",
      description: "Complete all available courses",
      icon: "📖",
      category: "skill",
      rarity: "legendary",
      requirement: "Complete all 50+ courses",
    },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "from-slate-400 to-slate-600";
      case "rare": return "from-blue-400 to-blue-600";
      case "epic": return "from-purple-400 to-purple-600";
      case "legendary": return "from-amber-400 to-orange-600";
      default: return "from-slate-400 to-slate-600";
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      case "rare": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "epic": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "legendary": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-600";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "achievement": return <Trophy className="w-4 h-4" />;
      case "competition": return <Medal className="w-4 h-4" />;
      case "skill": return <Zap className="w-4 h-4" />;
      case "community": return <Star className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const BadgeCard = ({ badge, type }: { badge: BadgeItem; type: "earned" | "progress" | "locked" }) => (
    <Card className={`overflow-hidden ${type === "locked" ? `${dashboardSurface} opacity-60` : dashboardInteractiveSurface}`}>
      <div className={`h-2 bg-gradient-to-r ${getRarityColor(badge.rarity)}`} />
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center text-3xl shadow-lg relative`}>
            {type === "locked" && (
              <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {type !== "locked" && badge.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{badge.name}</h3>
              {type === "earned" && (
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{badge.description}</p>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={getRarityBadge(badge.rarity)}>
                {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {getCategoryIcon(badge.category)}
                {badge.category.charAt(0).toUpperCase() + badge.category.slice(1)}
              </Badge>
            </div>

            {type === "earned" && badge.earnedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Earned on {badge.earnedAt}
              </p>
            )}

            {type === "progress" && badge.progress !== undefined && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{badge.requirement}</span>
                  <span className="font-medium">{badge.progress}%</span>
                </div>
                <Progress value={badge.progress} className="h-2" />
              </div>
            )}

            {type === "locked" && badge.requirement && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {badge.requirement}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Proof of progress"
        title="Achievements & badges"
        description="See what you have earned, what is within reach and the work that unlocks your next milestone."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className={`${dashboardSurface} bg-[#fff8ef]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">{earnedBadges.length}</p>
                <p className="text-xs text-muted-foreground">Badges Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#f9f5ff]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">2</p>
                <p className="text-xs text-muted-foreground">Epic Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#fff3e9]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">15</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${dashboardSurface} bg-[#effbf7]`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">#247</p>
                <p className="text-xs text-muted-foreground">Global Rank</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earned" className="space-y-6">
        <TabsList className={dashboardTabs}>
          <TabsTrigger value="earned">Earned ({earnedBadges.length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({inProgressBadges.length})</TabsTrigger>
          <TabsTrigger value="locked">Locked ({lockedBadges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {earnedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} type="earned" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} type="progress" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locked" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} type="locked" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Badges;
