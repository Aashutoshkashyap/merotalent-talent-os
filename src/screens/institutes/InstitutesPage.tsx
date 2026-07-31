"use client";

import React, { useState } from "react";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { GraduationCap, MapPin, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";

interface CollegeItem {
  id: string;
  name: string;
  shortName: string;
  university: string;
  location: string;
  avatarText: string;
  photoUrl: string;
  type: string;
  seats: string;
  admission: string;
  description: string;
  programs: string[];
  website: string;
}

const mockColleges: CollegeItem[] = [
  {
    id: "c-1",
    name: "Institute of Engineering, Pulchowk Campus",
    shortName: "Pulchowk Campus",
    university: "Tribhuvan University",
    location: "Pulchowk, Lalitpur",
    avatarText: "IOE",
    photoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600",
    type: "Government",
    seats: "384 Seats",
    admission: "Admissions Closed",
    description: "The central campus of IOE, TU — peak of technological innovation and academic excellence in Nepal since 1972.",
    programs: ["Computer", "Civil", "Electronics", "Electrical", "Mechanical", "Architecture"],
    website: "https://pcampus.edu.np",
  },
  {
    id: "c-2",
    name: "Kathmandu University, School of Engineering",
    shortName: "KU Engineering",
    university: "Kathmandu University",
    location: "Dhulikhel, Kavre",
    avatarText: "KU",
    photoUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600",
    type: "Private",
    seats: "240 Seats",
    admission: "Admissions Open",
    description: "Research-driven engineering education in a serene, state-of-the-art campus in Dhulikhel.",
    programs: ["Computer Science", "Mechanical", "Civil", "Geomatics", "Chemical"],
    website: "https://ku.edu.np",
  },
  {
    id: "c-3",
    name: "TU, Thapathali Campus",
    shortName: "Thapathali Campus",
    university: "Tribhuvan University",
    location: "Thapathali, Kathmandu",
    avatarText: "TU",
    photoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600",
    type: "Government",
    seats: "192 Seats",
    admission: "Limited Seats",
    description: "A historic technical college in the heart of Kathmandu with affordable government engineering degrees.",
    programs: ["Computer", "Civil", "Electronics", "Industrial"],
    website: "https://tcioe.edu.np",
  },
  {
    id: "c-4",
    name: "Pokhara University, School of Engineering",
    shortName: "PU Engineering",
    university: "Pokhara University",
    location: "Lekhnath, Pokhara",
    avatarText: "PU",
    photoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&q=80&w=600",
    type: "Government",
    seats: "180 Seats",
    admission: "Admissions Open",
    description: "Mountain-side engineering infrastructure and modern syllabus aligned with global IT frameworks.",
    programs: ["Computer", "Civil", "Software Eng.", "Electrical & Electronics"],
    website: "https://pu.edu.np",
  },
];

const categories = [
  { label: "All Colleges", count: "4" },
  { label: "Government", count: "2" },
  { label: "Private", count: "2" },
];

export default function InstitutesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Colleges");
  const [selectedCollege, setSelectedCollege] = useState<CollegeItem | null>(null);

  const filtered = selectedCategory === "All Colleges"
    ? mockColleges
    : mockColleges.filter(c => c.type === selectedCategory);

  // Single College Detail View
  if (selectedCollege) {
    return (
      <PublicPageLayout activeNavId="colleges">
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-14">
          {/* Back */}
          <button
            onClick={() => setSelectedCollege(null)}
            className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
          >
            ← Back to Directory
          </button>

          {/* Hero Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div className="flex flex-col gap-5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0073e6]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{selectedCollege.university}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight break-words">
                {selectedCollege.name}
              </h1>

              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                {selectedCollege.description}
              </p>

              <div className="flex flex-wrap gap-3 mt-1">
                <a href={selectedCollege.website} target="_blank" rel="noreferrer" className="inline-flex items-center px-5 py-2.5 bg-[#0073e6] hover:bg-[#0062c4] text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95">
                  Apply for Admission
                </a>
                <a href={selectedCollege.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all active:scale-95 bg-white">
                  <span>Visit Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-5 pt-5 border-t border-slate-100 mt-3">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-slate-800">{selectedCollege.seats}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Intake</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-[#0073e6]">{selectedCollege.type}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Status</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-red-600 break-words">{selectedCollege.admission}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Admission</span>
                </div>
              </div>
            </div>

            {/* Right Photo */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-100 shadow-lg aspect-video lg:aspect-auto lg:h-[380px]">
              <img src={selectedCollege.photoUrl} alt={selectedCollege.name} className="w-full h-full object-cover grayscale brightness-95" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Programs Grid */}
          <div className="flex flex-col gap-6 border-t border-slate-100 pt-10">
            <div className="text-center max-w-xl mx-auto flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-[#0073e6] uppercase tracking-wider">OUR PROGRAMS</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic programs</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">From undergraduate degrees to research doctorates.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-3">
              {selectedCollege.programs.map((program, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0073e6] flex items-center justify-center font-black text-sm flex-shrink-0">{idx + 1}</div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">{program}</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed line-clamp-2">Coursework, lab sessions, projects, and placement options.</p>
                  <a href={selectedCollege.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0073e6] hover:underline mt-1">
                    Learn more <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-t border-slate-100 pt-10">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-6 flex flex-col gap-4 min-h-[220px]">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <span className="text-xl font-black text-slate-800 tracking-tight">More than just education</span>
              <span className="text-xs text-slate-500 font-semibold leading-relaxed">
                We understand academic requirements and provide clear roadmaps. Our goal: your career success.
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {[
                "Highly qualified academic lecturers & researchers",
                "Advanced physical laboratory infrastructure",
                "Strong industrial tie-ups with leading local firms",
                "Affordable fee structures & government scholarships",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-semibold leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PublicPageLayout>
    );
  }

  // Directory Listing View
  return (
    <PublicPageLayout activeNavId="colleges">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Colleges & Universities
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Top engineering and technical colleges partnered with MeroTalent.
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
                <GraduationCap className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">Partner Institutes ({filtered.length})</span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Rank</option>
            <option>Seats Available</option>
          </select>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedCollege(item)}
              className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
            >
              {/* Image header */}
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover grayscale brightness-95 group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white">
                  {item.type}
                </span>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] text-white font-extrabold bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <span>🏫</span>
                  <span>{item.seats}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug truncate">
                  {item.shortName}
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
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.university}</span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{item.admission}</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  );
}
