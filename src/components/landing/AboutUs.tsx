"use client";

import React, { useState } from "react";
import { Compass, Ban, Target } from "lucide-react";

interface PersonaItem {
  id: string;
  name: string;
  age: number;
  role: string;
  avatar: string;
  photoUrl: string;
  gradientBg: string;
  motivations: string[];
  painPoints: string[];
  needs: string[];
}

const PERSONAS: PersonaItem[] = [
  {
    id: "maxim",
    name: "Rohan",
    age: 22,
    role: "Engineering Student",
    avatar: "👨‍💻",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
    gradientBg: "from-blue-600 via-indigo-600 to-indigo-800",
    motivations: [
      "Learn job-ready skills via curated, structured courses",
      "Showcase verified credentials and project hackathons",
      "Connect with expert academic mentors and tech guides",
    ],
    painPoints: [
      "Unstructured syllabus makes skill-building confusing",
      "Lack of guidance and industry connection during university studies",
      "CVs alone don't prove practical coding or design abilities",
    ],
    needs: [
      "Structured educational courses and clear learning roadmaps",
      "Direct communication channel with verified industry mentors",
      "Practical hackathons and opportunities to build proof-of-work",
    ],
  },
  {
    id: "aastha",
    name: "Aastha",
    age: 25,
    role: "Aspiring Mentor & Guide",
    avatar: "👩‍🏫",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
    gradientBg: "from-purple-600 via-pink-600 to-rose-700",
    motivations: [
      "Share academic and industry expertise with eager students",
      "Build a strong reputation and follow in the Nepalese tech community",
      "Contribute to the local educational ecosystem growth",
    ],
    painPoints: [
      "No structured platform to connect with students who need guidance",
      "Difficulty tracking student project progress and feedback history",
      "Hard to find dedicated teaching/mentorship hours that fit busy schedules",
    ],
    needs: [
      "Direct portal to manage academic mentorship requests",
      "Simplified dashboard to track mentees and check project milestones",
      "Flexible schedule coordination to host webinars and workshops",
    ],
  },
];

interface AboutUsProps {
  title?: string;
  eyebrow?: string;
  description?: React.ReactNode;
}

export default function AboutUs({
  title = "About Us & Who We Serve",
  eyebrow = "USER PERSONA",
  description,
}: AboutUsProps) {
  const [activePersona, setActivePersona] = useState<PersonaItem>(PERSONAS[0]);

  return (
    <section className="py-16 px-6 sm:px-10 max-w-7xl mx-auto w-full font-sans">
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-7 rounded-full bg-[#0073e6]" />
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>

      {/* Top Section Header matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_5fr] gap-6 items-start mb-14 border-t border-slate-100 pt-8">
        {/* Top Left Indicator */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0073e6]" />
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            {eyebrow}
          </span>
        </div>

        {/* Top Right Description */}
        <p className="text-xl sm:text-2xl text-slate-700 font-medium leading-relaxed tracking-tight max-w-5xl">
          {description ?? (
            <>
              Students work with{" "}
              <span className="text-[#0073e6] font-semibold">practical courses, mentorship, events, and jobs</span>{" "}
              to showcase their proof-of-skill, connect with expert guides, and build their careers in Nepal.
            </>
          )}
        </p>
      </div>

      {/* Main Grid matching reference layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-10 sm:gap-12 items-stretch">
        {/* Left Column: Portrait Card */}
        <div className="relative rounded-[32px] overflow-hidden bg-slate-100 shadow-lg min-h-[460px] flex flex-col justify-between p-6">
          {/* Background image overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={activePersona.photoUrl}
              alt={activePersona.name}
              className="w-full h-full object-cover grayscale brightness-95 contrast-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
          </div>

          {/* Top Avatars Row */}
          <div className="relative z-10 flex items-center gap-2.5">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                  activePersona.id === p.id
                    ? "border-[#0073e6] bg-white scale-110 shadow-md"
                    : "border-white/40 bg-white/70 hover:bg-white"
                }`}
                title={p.role}
              >
                {p.avatar}
              </button>
            ))}
          </div>

          {/* Bottom Glassmorphic Card matching reference image */}
          <div className="relative z-10 w-full bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4.5 flex items-center justify-between text-white shadow-lg">
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight leading-none">
                {activePersona.name}, {activePersona.age}
              </span>
              <span className="text-[11px] text-slate-300 font-bold mt-1.5 uppercase tracking-wide">
                {activePersona.role}
              </span>
            </div>
            {/* Checkerboard Square Icon */}
            <div className="grid grid-cols-2 gap-0.5 w-4.5 h-4.5 text-white/90">
              <div className="w-1.5 h-1.5 bg-white rounded-xs" />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-xs" />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-xs" />
              <div className="w-1.5 h-1.5 bg-white rounded-xs" />
            </div>
          </div>
        </div>

        {/* Right Column: 3 stacked cards matching screenshot */}
        <div className="flex flex-col gap-4.5 justify-between">
          {/* Card 1: Motivations */}
          <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-2xs p-6 flex items-start gap-4 flex-1">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                Motivations
              </h4>
              <ul className="flex flex-col gap-1.5">
                {activePersona.motivations.map((m, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed list-disc list-inside">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 2: Pain Points */}
          <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-2xs p-6 flex items-start gap-4 flex-1">
            <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
              <Ban className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                Pain Points
              </h4>
              <ul className="flex flex-col gap-1.5">
                {activePersona.painPoints.map((p, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed list-disc list-inside">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 3: User Needs */}
          <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-2xs p-6 flex items-start gap-4 flex-1">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                User Needs
              </h4>
              <ul className="flex flex-col gap-1.5">
                {activePersona.needs.map((n, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed list-disc list-inside">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
