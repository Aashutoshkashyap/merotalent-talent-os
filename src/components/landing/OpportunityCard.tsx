"use client";

import React from "react";

export interface OpportunityCardData {
  id: string;
  title: string;
  organizer: string;
  logo: React.ReactNode;
  prizes?: string;
  location?: string;
  isOnline?: boolean;
}

interface OpportunityCardProps {
  data: OpportunityCardData;
}

export default function OpportunityCard({ data }: OpportunityCardProps) {
  return (
    <div className="flex flex-col justify-between p-6 bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 min-w-[320px] sm:min-w-[350px] max-w-[380px] flex-shrink-0 cursor-pointer min-h-[215px]">
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-4">
        {/* Left: Metadata badges */}
        <div className="flex flex-col gap-2 items-start">
          {data.prizes && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold shadow-2xs">
              <span className="text-xs">💸</span>
              <span>{data.prizes}</span>
            </div>
          )}
          {data.isOnline && (
            <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
              <span>🌐</span>
              <span>Online</span>
            </div>
          )}
          {data.location && (
            <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
              <span>📍</span>
              <span>{data.location}</span>
            </div>
          )}
        </div>

        {/* Right: Company Logo square */}
        <div className="w-14 h-14 rounded-2xl border border-slate-100 bg-slate-50/80 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner p-1.5">
          {data.logo}
        </div>
      </div>

      {/* Middle & Bottom Text */}
      <div className="mt-4 flex flex-col gap-1.5">
        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug line-clamp-2 hover:text-[#0073e6] transition-colors tracking-tight">
          {data.title}
        </h4>
        <p className="text-xs font-bold text-slate-400 truncate mt-0.5">
          {data.organizer}
        </p>
      </div>
    </div>
  );
}
