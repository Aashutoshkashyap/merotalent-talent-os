"use client";

import React, { useRef } from "react";
import OpportunityCard, { OpportunityCardData } from "./OpportunityCard";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface OpportunitiesSectionProps {
  title: string;
  subtitle: string;
  viewAllPath: string;
  opportunities: OpportunityCardData[];
}

export default function OpportunitiesSection({
  title,
  subtitle,
  viewAllPath,
  opportunities,
}: OpportunitiesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section className="py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full relative">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {/* Left Blue Marker Accent */}
            <div className="w-1.5 h-6 rounded-full bg-[#0073e6]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-semibold ml-4">
            {subtitle}
          </p>
        </div>

        {/* View All Button */}
        <Link
          to={viewAllPath}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200/80 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-xs font-bold transition-all whitespace-nowrap active:scale-95 shadow-sm"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Row Wrapper with scroll button */}
      <div className="relative w-full flex items-center">
        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} data={opp} />
          ))}
        </div>

        {/* Right Arrow Carousel Button (Floating at the right edge) */}
        {opportunities.length > 3 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all z-10 translate-x-3"
            title="Scroll Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
}
