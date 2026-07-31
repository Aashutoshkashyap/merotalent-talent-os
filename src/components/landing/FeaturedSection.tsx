"use client";

import React, { useRef } from "react";
import FeaturedPosterCard, { FeaturedCardData } from "./FeaturedPosterCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_FEATURED_CARDS: FeaturedCardData[] = [
  {
    id: "locus-hackathon-2026",
    posterBg: "bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-900",
    badgeTag: "Register Now!",
    title: "LOCUS 2026 Engineering Hackathon",
    path: "/competitions",
    posterContent: {
      brandTag: "Pulchowk IOE",
      bannerTitle: "LOCUS 2026 Hackathon",
      subtitle: "Innovate for Nepal: Build AI & Hardware Solutions",
      description: "Compete with top engineering minds across TU, KU, and PU campuses.",
    },
  },
  {
    id: "ku-hackfest-2026",
    posterBg: "bg-gradient-to-br from-emerald-800 via-teal-900 to-cyan-950",
    badgeTag: "Register Now",
    title: "KU HackFest 2026",
    path: "/competitions",
    posterContent: {
      brandTag: "Kathmandu University",
      bannerTitle: "KU HackFest 2026",
      subtitle: "48-HOUR OPEN SOURCE SPRINT",
      description: "Nepal's premier student-led hackathon in Dhulikhel. Build next-gen software.",
    },
  },
  {
    id: "yarsa-game-jam",
    posterBg: "bg-gradient-to-br from-red-800 via-rose-900 to-orange-950",
    badgeTag: "Rs. 2,50,000 Cash Prize!",
    title: "Yarsa Labs Game Jam 2026",
    path: "/competitions",
    posterContent: {
      brandTag: "Yarsa Labs",
      bannerTitle: "YARSA GAME JAM",
      subtitle: "RUST & GRAPHICS INNOVATION",
      description: "Build high performance game titles & mobile engines in Pokhara.",
    },
  },
  {
    id: "deerwalk-tech-summit",
    posterBg: "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900",
    badgeTag: "Register Now",
    title: "Deerwalk Tech Summit 2026",
    path: "/competitions",
    posterContent: {
      brandTag: "Deerwalk",
      bannerTitle: "Deerwalk Summit",
      subtitle: "Reinventing Software & Data Engineering",
      description: "Present research papers and compete in algorithmic coding challenges.",
    },
  },
];

interface FeaturedSectionProps {
  cards?: FeaturedCardData[];
  title?: string;
}

export default function FeaturedSection({
  cards = DEFAULT_FEATURED_CARDS,
  title = "Featured",
}: FeaturedSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-10 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Header Row with Title & Arrow Nav Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Vertical Blue Bar Pill Accent */}
          <div className="w-1.5 h-7 rounded-full bg-[#0073e6]" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Slider Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Row */}
      <div
        ref={scrollRef}
        className="flex items-center gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.map((card) => (
          <FeaturedPosterCard key={card.id} data={card} />
        ))}
      </div>
    </section>
  );
}
