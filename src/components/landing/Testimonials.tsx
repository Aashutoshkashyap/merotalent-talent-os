"use client";

import React from "react";

export interface TestimonialData {
  id: string;
  quote: string;
  author: string;
  role: string;
  institution: string;
}

interface TestimonialsProps {
  eyebrow?: string;
  title?: string;
  testimonials?: TestimonialData[];
}

export default function Testimonials({
  eyebrow = "Success Stories",
  title = "Loved by Students & Educators Across Nepal",
  testimonials = [],
}: TestimonialsProps) {
  if (!testimonials.length) return null;
  return (
    <section className="py-16 bg-slate-50/60 border-y border-slate-100 w-full">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#0073e6] font-bold text-xs uppercase tracking-wider bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              {eyebrow}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => {
            const attribution = [t.role, t.institution].filter(Boolean).join(" • ");
            return (
            <div
              key={t.id}
              className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <p className="text-slate-600 font-medium italic leading-relaxed text-sm mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-4">
                <span className="text-sm font-extrabold text-slate-900">{t.author}</span>
                {attribution ? (
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {attribution}
                  </span>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
