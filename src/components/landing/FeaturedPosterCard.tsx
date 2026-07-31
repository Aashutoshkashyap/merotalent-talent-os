"use client";

import React from "react";
import { Link } from "react-router-dom";

export interface FeaturedCardData {
  id: string;
  posterBg: string;
  badgeTag: string;
  title: string;
  posterContent: {
    bannerTitle: string;
    subtitle: string;
    description: string;
    brandTag?: string;
  };
  path: string;
}

interface FeaturedPosterCardProps {
  data: FeaturedCardData;
}

export default function FeaturedPosterCard({ data }: FeaturedPosterCardProps) {
  return (
    <Link
      to={data.path}
      className="group flex flex-col rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer w-full min-w-[280px] sm:min-w-[310px] max-w-[340px] flex-shrink-0"
    >
      {/* Top Visual Poster Area */}
      <div
        className={`relative h-88 sm:h-[400px] w-full ${data.posterBg} p-6 sm:p-7 flex flex-col justify-between overflow-hidden`}
      >
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />

        {/* Poster Top Brand / Tag */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-white/90 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full">
            {data.posterContent.brandTag || "Featured"}
          </span>
        </div>

        {/* Poster Main Typography */}
        <div className="relative z-10 flex flex-col gap-2 my-auto text-white">
          <h4 className="text-xs font-semibold uppercase tracking-wider opacity-90">
            {data.posterContent.bannerTitle}
          </h4>
          <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight drop-shadow-sm">
            {data.posterContent.subtitle}
          </h3>
          <p className="text-xs sm:text-sm text-white/85 line-clamp-3 mt-1.5 font-medium leading-relaxed">
            {data.posterContent.description}
          </p>
        </div>

        {/* Bottom Poster Action Hint */}
        <div className="relative z-10 pt-3">
          <span className="inline-flex items-center text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-4.5 py-2 rounded-full transition-all">
            Register Now
          </span>
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="p-5 flex flex-col gap-2.5 bg-white">
        {/* Status Tag Pill */}
        <div>
          <span className="inline-block text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200">
            {data.badgeTag}
          </span>
        </div>

        {/* Card Title */}
        <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-[#0073e6] transition-colors leading-snug">
          {data.title}
        </h3>
      </div>
    </Link>
  );
}
