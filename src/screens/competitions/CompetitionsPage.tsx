"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Trophy, Clock, ArrowRight } from "lucide-react";

interface CompetitionItem {
  id: string;
  title: string;
  category: string;
  timeRead: string;
  description: string;
  organizer: string;
  date: string;
  avatarText: string;
  bgGradient: string;
  imageIcon: string;
}

const mockCompetitions: CompetitionItem[] = [
  {
    id: "locus-robotics-2026",
    title: "LOCUS Hardware & Robotics Competition",
    category: "Robotics",
    timeRead: "Rs. 5,00,000 Prizes",
    description: "Build robust autonomous robots and battle it out in the arena at Pulchowk Campus.",
    organizer: "Pulchowk IOE",
    date: "Feb 20, 2026",
    avatarText: "IOE",
    bgGradient: "from-purple-950 via-slate-900 to-indigo-900",
    imageIcon: "🤖",
  },
  {
    id: "ku-hackfest-2026",
    title: "KU HackFest 2026 Open Source Challenge",
    category: "Hackathon",
    timeRead: "Rs. 2,00,000 Prizes",
    description: "A 48-hour sprint in Dhulikhel designing software utilities to aid local community development.",
    organizer: "Kathmandu University",
    date: "Feb 15, 2026",
    avatarText: "KU",
    bgGradient: "from-emerald-800 via-teal-900 to-cyan-950",
    imageIcon: "💻",
  },
  {
    id: "yarsa-game-jam-2026",
    title: "Yarsa Games Engine Hackathon",
    category: "Game Jam",
    timeRead: "Rs. 2,50,000 Prizes",
    description: "Write game modules and render engines in Pokhara. Top performance awards for Rust developers.",
    organizer: "Yarsa Labs",
    date: "Feb 28, 2026",
    avatarText: "YL",
    bgGradient: "from-red-800 via-rose-900 to-orange-950",
    imageIcon: "🎮",
  },
  {
    id: "ioe-software-hack",
    title: "National Student Software Olympiad",
    category: "Olympiad",
    timeRead: "Rs. 1,50,000 Prizes",
    description: "Show off algorithmic speed and clean code in this nationwide educational logic competition.",
    organizer: "Nepal Engineers Association",
    date: "Mar 10, 2026",
    avatarText: "NEA",
    bgGradient: "from-indigo-900 via-purple-900 to-pink-900",
    imageIcon: "💡",
  },
];

const categories = [
  { label: "All Events", count: "4" },
  { label: "Hackathons", count: "1" },
  { label: "Robotics", count: "1" },
  { label: "Game Jams", count: "1" },
  { label: "Olympiads", count: "1" },
];

export default function CompetitionsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Events");

  const filtered = selectedCategory === "All Events"
    ? mockCompetitions
    : mockCompetitions.filter(c => c.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase()));

  return (
    <PublicPageLayout activeNavId="events">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Events & Competitions
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Latest academic events, coding hackathons, and design contests in Nepal.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top categories</span>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(c.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-extrabold transition-all ${
                  selectedCategory === c.label
                    ? "bg-[#0073e6] border-[#0073e6] text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Trophy className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">Latest Challenges ({filtered.length})</span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Newest</option>
            <option>Deadline</option>
          </select>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Image header */}
              <div className={`relative h-40 bg-gradient-to-br ${item.bgGradient} flex items-center justify-center overflow-hidden`}>
                <span className="text-4xl select-none group-hover:scale-110 transition-transform duration-300">{item.imageIcon}</span>
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white">
                  {item.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.timeRead}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-black text-[#0073e6] flex-shrink-0">
                    {item.avatarText}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.organizer}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.date}</span>
                  </div>
                </div>
                <Link to="/login" className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  );
}
