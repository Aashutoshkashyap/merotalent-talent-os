"use client";

import React from "react";
import CategoryCard, { CategoryCardData } from "./CategoryCard";
import { Zap } from "lucide-react";

export const MetricBadge: React.FC<{ text?: string }> = ({
  text = "Nepal's #1 Educational Hub",
}) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 via-indigo-50 to-blue-100 text-indigo-700 font-bold text-xs border border-indigo-200/60 shadow-sm animate-pulse">
      <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
      <span>{text}</span>
    </div>
  );
};

export const DEFAULT_CATEGORIES: CategoryCardData[] = [
  {
    id: "courses",
    title: "Courses",
    bgGradient: "bg-gradient-to-b from-sky-50 to-blue-100/60",
    borderColor: "border-sky-200/60",
    iconBg: "bg-sky-100/80",
    path: "https://merotalent.com",
    isExternal: true,
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
        <path d="M32 14L52 24L32 34L12 24L32 14Z" fill="#2563EB" />
        <path d="M20 30V40C20 44 25.3726 47 32 47C38.6274 47 44 44 44 40V30" stroke="#1D4ED8" strokeWidth="3" />
        <path d="M48 26.5V38" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "events",
    title: "Events",
    bgGradient: "bg-gradient-to-b from-amber-50 to-yellow-100/60",
    borderColor: "border-amber-200/60",
    iconBg: "bg-amber-100/80",
    path: "/competitions",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
        <path d="M18 16H46V28C46 35.732 39.732 42 32 42C24.268 42 18 35.732 18 28V16Z" fill="#F59E0B" />
        <path d="M18 20H10C8.89543 20 8 20.8954 8 22V28C8 31.3137 10.6863 34 14 34H18" stroke="#D97706" strokeWidth="3" />
        <path d="M46 20H54C55.1046 20 56 20.8954 56 22V28C56 31.3137 53.3137 34 50 34H46" stroke="#D97706" strokeWidth="3" />
        <rect x="28" y="42" width="8" height="10" fill="#D97706" />
        <rect x="22" y="52" width="20" height="5" rx="2" fill="#B45309" />
      </svg>
    ),
  },
  {
    id: "mentors",
    title: "Mentors",
    bgGradient: "bg-gradient-to-b from-purple-50 to-pink-100/60",
    borderColor: "border-purple-200/60",
    iconBg: "bg-purple-100/80",
    path: "/mentorship",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
        <circle cx="24" cy="26" r="8" fill="#8B5CF6" />
        <circle cx="40" cy="26" r="8" fill="#EC4899" />
        <path d="M14 46C14 39 18 36 24 36C30 36 34 39 34 46" stroke="#7C3AED" strokeWidth="3" />
        <path d="M30 46C30 40 34 37 40 37C46 37 50 40 50 46" stroke="#DB2777" strokeWidth="3" />
        <path d="M28 14L32 10L36 14" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "colleges",
    title: "Colleges",
    bgGradient: "bg-gradient-to-b from-indigo-50 to-purple-100/60",
    borderColor: "border-indigo-200/60",
    iconBg: "bg-indigo-100/80",
    path: "/institutes",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="22" width="40" height="28" rx="6" fill="#6366F1" />
        <path d="M24 22V16C24 14.3431 25.3431 13 27 13H37C38.6569 13 40 14.3431 40 16V22" stroke="#4338CA" strokeWidth="4" />
        <circle cx="36" cy="38" r="9" fill="#E0E7FF" stroke="#4338CA" strokeWidth="3" />
        <path d="M42 44L49 51" stroke="#4338CA" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "jobs",
    title: "Jobs",
    bgGradient: "bg-gradient-to-b from-sky-50 to-blue-100/60",
    borderColor: "border-sky-200/60",
    iconBg: "bg-sky-100/80",
    path: "/jobs",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none">
        <rect x="14" y="24" width="36" height="26" rx="6" fill="#3B82F6" />
        <rect x="18" y="28" width="28" height="18" rx="4" fill="#93C5FD" />
        <path d="M26 24V18C26 15.7909 27.7909 14 30 14H34C36.2091 14 38 15.7909 38 18V24" stroke="#1D4ED8" strokeWidth="4" />
        <circle cx="44" cy="42" r="8" fill="#F59E0B" />
      </svg>
    ),
  },
];

interface HeroCategorySectionProps {
  categories?: CategoryCardData[];
  metricText?: string;
}

export default function HeroCategorySection({
  categories = DEFAULT_CATEGORIES,
  metricText = "Nepal's #1 Educational Hub",
}: HeroCategorySectionProps) {
  return (
    <section className="relative pt-4 pb-6 px-6 sm:px-10 max-w-7xl mx-auto flex flex-col items-center">
      {/* Top Header Row: Headline & Right Metric Badge */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
            Unlock Your{" "}
            <span className="text-[#0073e6] bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
              Career!
            </span>
          </h1>
        </div>

        <div className="self-center sm:self-end">
          <MetricBadge text={metricText} />
        </div>
      </div>

      {/* Category Pills Row / Grid */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} data={cat} />
        ))}
      </div>
    </section>
  );
}
