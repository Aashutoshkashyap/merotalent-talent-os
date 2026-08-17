"use client";

import React from "react";

export interface TestimonialData {
  id: string;
  quote: string;
  author: string;
  role: string;
  institution: string;
}

const TESTIMONIALS_DATA: TestimonialData[] = [
  {
    id: "test-1",
    quote: "MeroTalent helped me transition from a college student at Pulchowk to a full-time software developer at Yarsa Labs. The hackathons and projects gave me real industry skills.",
    author: "Aman Shakya",
    role: "Software Engineer",
    institution: "Pulchowk Campus, IOE",
  },
  {
    id: "test-2",
    quote: "Finding expert academic guidance used to be difficult in Dhulikhel. Through MeroTalent's mentor board, I connected with senior developers who guided my final year project.",
    author: "Ritu Shrestha",
    role: "CS Graduate",
    institution: "Kathmandu University",
  },
  {
    id: "test-3",
    quote: "As a tech recruiter, MeroTalent has streamlined our university hiring process in Nepal. We can easily verify student skills based on hackathon outcomes.",
    author: "Sanjay Adhikari",
    role: "HR Lead",
    institution: "Logpoint Nepal",
  },
];

interface TestimonialsProps {
  eyebrow?: string;
  title?: string;
  testimonials?: TestimonialData[];
}

export default function Testimonials({
  eyebrow = "Success Stories",
  title = "Loved by Students & Educators Across Nepal",
  testimonials = TESTIMONIALS_DATA,
}: TestimonialsProps) {
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
