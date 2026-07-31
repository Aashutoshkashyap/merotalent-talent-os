"use client";

import React from "react";
import { Link } from "react-router-dom";

export interface CategoryCardData {
  id: string;
  title: string;
  badge?: string;
  bgGradient: string;
  borderColor?: string;
  iconBg: string;
  icon: React.ReactNode;
  path: string;
  isExternal?: boolean;
}

interface CategoryCardProps {
  data: CategoryCardData;
  onClick?: () => void;
}

export default function CategoryCard({ data, onClick }: CategoryCardProps) {
  const cardContent = (
    <>
      {/* Optional Top Badge */}
      {data.badge && (
        <span className="absolute top-2 right-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#0073e6] text-white shadow-sm">
          {data.badge}
        </span>
      )}

      {/* Card Header Title */}
      <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 text-center mb-2 group-hover:text-blue-600 transition-colors tracking-tight">
        {data.title}
      </h3>

      {/* Visual Icon Container (Smaller & Compact) */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl ${data.iconBg} flex items-center justify-center shadow-inner group-hover:rotate-2 transition-transform duration-300 relative p-1.5`}
      >
        {data.icon}
      </div>
    </>
  );

  const classes = `group relative flex flex-col items-center justify-between p-4 rounded-2xl ${data.bgGradient} border ${data.borderColor || "border-slate-100"} shadow-sm hover:shadow-md hover:scale-102 transition-all duration-300 min-h-[105px] sm:min-h-[115px] min-w-[125px] sm:min-w-[135px] flex-1 cursor-pointer overflow-hidden`;

  if (data.isExternal) {
    return (
      <a href={data.path} onClick={onClick} className={classes}>
        {cardContent}
      </a>
    );
  }

  return (
    <Link to={data.path} onClick={onClick} className={classes}>
      {cardContent}
    </Link>
  );
}
