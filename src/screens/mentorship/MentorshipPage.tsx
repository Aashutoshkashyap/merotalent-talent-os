"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Users, Clock, ArrowRight, Star } from "lucide-react";

interface MentorItem {
  id: string;
  name: string;
  category: string;
  bio: string;
  experience: string;
  hourlyRate: string;
  rating: string;
  avatarText: string;
  photoUrl: string;
  sessions: string;
}

const mockMentors: MentorItem[] = [
  {
    id: "m-1",
    name: "Dr. Rohan Adhikari",
    category: "Computer Science",
    bio: "Senior Researcher at IOE Pulchowk, specializing in Machine Learning & Distributed Systems.",
    experience: "12+ Years",
    hourlyRate: "NPR 2,000",
    rating: "4.9",
    avatarText: "RA",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
    sessions: "150+",
  },
  {
    id: "m-2",
    name: "Aastha Shrestha",
    category: "Software Engineering",
    bio: "Tech Lead at Leapfrog Technology, mentoring React, Node.js, and System Architecture.",
    experience: "7+ Years",
    hourlyRate: "NPR 1,500",
    rating: "4.8",
    avatarText: "AS",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
    sessions: "90+",
  },
  {
    id: "m-3",
    name: "Saurav Sharma",
    category: "UI/UX Design",
    bio: "Senior Product Designer at Yarsa Labs, expert in visual design systems and user research.",
    experience: "6+ Years",
    hourlyRate: "NPR 1,200",
    rating: "5.0",
    avatarText: "SS",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
    sessions: "65+",
  },
  {
    id: "m-4",
    name: "Bijay Thapa",
    category: "Academic Advisor",
    bio: "Professor at Kathmandu University, counseling for higher studies, GATE prep, and GRE.",
    experience: "15+ Years",
    hourlyRate: "NPR 2,500",
    rating: "4.7",
    avatarText: "BT",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
    sessions: "210+",
  },
];

const categories = [
  { label: "All Areas", count: "4" },
  { label: "Computer Science", count: "1" },
  { label: "Software Eng.", count: "1" },
  { label: "UI/UX Design", count: "1" },
  { label: "Academic", count: "1" },
];

export default function MentorshipPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Areas");

  const filtered = selectedCategory === "All Areas"
    ? mockMentors
    : mockMentors.filter(m => m.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase()));

  return (
    <PublicPageLayout activeNavId="mentors">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Academic & Industry Mentors
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Certified academic advisors and tech mentors ready to guide you in Nepal.
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
                <Users className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">Verified Mentors ({filtered.length})</span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Highest Rated</option>
            <option>Experience</option>
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
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover grayscale brightness-95 group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white truncate max-w-[140px]">
                  {item.category}
                </span>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] text-yellow-400 font-extrabold bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.experience}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {item.bio}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-black text-[#0073e6] flex-shrink-0">
                    {item.avatarText}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.sessions} Sessions</span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{item.hourlyRate} / Session</span>
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
