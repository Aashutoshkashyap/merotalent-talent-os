"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTA() {
  return (
    <section className="w-full bg-white py-12 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
      <div className="relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-[32px] px-8 py-12 text-white sm:px-12 lg:px-16 lg:py-16 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-blue-200">
            <Sparkles className="h-4 w-4" />
            <span>Join Nepal&apos;s Educational Revolution</span>
          </div>
          <h2 className="mt-5 text-balance text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
            Build your skills. Get discovered by top opportunities.
          </h2>
          <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-blue-100 font-medium">
            Create a free MeroTalent account to access professional courses, participate in hackathons, and connect with academic mentors in Nepal.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 font-bold text-sm rounded-2xl shadow-sm hover:shadow transition-all duration-200 active:scale-95 gap-2"
            >
              <span>Create your account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center px-6 py-3 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl transition-all duration-200 active:scale-95"
            >
              Browse courses
            </Link>
          </div>
        </div>

        {/* Decorative backgrounds */}
        <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[52px] border-white/10 pointer-events-none" />
        <div className="absolute -bottom-36 right-36 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>
    </section>
  );
}
