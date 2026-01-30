import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award, 
  Plus, 
  Search,
  Trash2,
  Edit,
  Trophy,
  Star,
  Zap,
  Target,
  Users,
  Medal
} from "lucide-react";

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "achievement" | "competition" | "skill" | "community";
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedBy: number;
  createdAt: string;
}

const AdminBadges = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const badges: BadgeItem[] = [
    { id: "1", name: "First Steps", description: "Completed first competition", icon: "🎯", category: "achievement", rarity: "common", earnedBy: 1234, createdAt: "Jan 1, 2026" },
    { id: "2", name: "Code Warrior", description: "Won first place in coding", icon: "⚔️", category: "competition", rarity: "rare", earnedBy: 234, createdAt: "Jan 1, 2026" },
    { id: "3", name: "Quick Learner", description: "Completed 5 courses in a month", icon: "📚", category: "skill", rarity: "common", earnedBy: 567, createdAt: "Jan 1, 2026" },
    { id: "4", name: "Team Player", description: "Participated in 3 team competitions", icon: "🤝", category: "community", rarity: "common", earnedBy: 876, createdAt: "Jan 1, 2026" },
    { id: "5", name: "Rising Star", description: "Reached top 100 in rankings", icon: "⭐", category: "achievement", rarity: "epic", earnedBy: 89, createdAt: "Jan 1, 2026" },
    { id: "6", name: "AI Master", description: "Won an ML competition", icon: "🤖", category: "competition", rarity: "epic", earnedBy: 45, createdAt: "Jan 1, 2026" },
    { id: "7", name: "Mentor's Choice", description: "5 excellent mentor reviews", icon: "🏆", category: "community", rarity: "rare", earnedBy: 123, createdAt: "Jan 1, 2026" },
    { id: "8", name: "Grandmaster", description: "Reached top 10 globally", icon: "👑", category: "achievement", rarity: "legendary", earnedBy: 8, createdAt: "Jan 1, 2026" },
  ];

  const filteredBadges = badges.filter(
    (badge) =>
      badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const stats = [
    { label: "Total Badges", value: badges.length, icon: Award },
    { label: "Legendary", value: badges.filter(b => b.rarity === "legendary").length, icon: Trophy },
    { label: "Epic", value: badges.filter(b => b.rarity === "epic").length, icon: Star },
    { label: "Total Awarded", value: badges.reduce((sum, b) => sum + b.earnedBy, 0).toLocaleString(), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Badge Management</h1>
          <p className="text-muted-foreground">Create and manage achievement badges</p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Create Badge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search badges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBadges.map((badge) => (
          <Card key={badge.id} className="border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`h-2 bg-gradient-to-r ${getRarityColor(badge.rarity)}`} />
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center text-2xl shadow-lg`}>
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{badge.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className={getRarityBadge(badge.rarity)}>
                  {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getCategoryIcon(badge.category)}
                  {badge.category.charAt(0).toUpperCase() + badge.category.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {badge.earnedBy.toLocaleString()} earned
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <Award className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No badges found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default AdminBadges;
