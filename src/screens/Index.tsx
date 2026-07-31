"use client";

import React, { useState } from "react";
import SidebarNav from "@/components/landing/SidebarNav";
import HeaderNav from "@/components/landing/HeaderNav";
import HeroCategorySection from "@/components/landing/HeroCategorySection";
import FeaturedSection from "@/components/landing/FeaturedSection";
import TrustStrip from "@/components/landing/TrustStrip";
import OpportunitiesSection from "@/components/landing/OpportunitiesSection";
import AboutUs from "@/components/landing/AboutUs";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { OpportunityCardData } from "@/components/landing/OpportunityCard";

// Mockup Data tailored to Nepal Educational & Tech Ecosystem
const COMPETITIONS_DATA: OpportunityCardData[] = [
  {
    id: "locus-robotics-2026",
    title: "LOCUS Hardware & Robotics Competition",
    organizer: "Pulchowk Campus, IOE",
    prizes: "Prizes worth Rs. 5,00,000",
    isOnline: false,
    location: "Pulchowk, Lalitpur",
    logo: (
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-xs font-black text-blue-900 tracking-tighter">IOE</span>
        <span className="text-[7px] font-bold text-[#0073e6] uppercase leading-none">LOCUS</span>
      </div>
    ),
  },
  {
    id: "ku-hackfest-2026",
    title: "KU HackFest 2026 Open Source Challenge",
    organizer: "Kathmandu University",
    prizes: "Prizes worth Rs. 2,00,000",
    isOnline: true,
    logo: (
      <div className="w-full h-full bg-slate-900 text-yellow-400 font-extrabold text-[9px] flex items-center justify-center rounded">
        KU
      </div>
    ),
  },
  {
    id: "yarsa-game-jam-2026",
    title: "Yarsa Games Engine Hackathon",
    organizer: "Yarsa Labs",
    prizes: "Prizes worth Rs. 2,50,000",
    isOnline: true,
    logo: (
      <div className="w-full h-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center rounded">
        YARSA
      </div>
    ),
  },
  {
    id: "ioe-software-hack",
    title: "National Student Software Olympiad",
    organizer: "Nepal Engineers Association",
    prizes: "Prizes worth Rs. 1,50,000",
    isOnline: true,
    logo: (
      <div className="w-full h-full bg-blue-700 text-white font-extrabold text-[8px] flex items-center justify-center rounded text-center">
        NEA
      </div>
    ),
  },
];

const INTERNSHIPS_DATA: OpportunityCardData[] = [
  {
    id: "logpoint-qa-intern",
    title: "Software Engineering Intern",
    organizer: "Logpoint Nepal",
    prizes: "Rs. 25,000 / Month",
    location: "In Office | Jawalakhel",
    logo: (
      <div className="w-full h-full bg-slate-900 text-blue-400 font-black text-[9px] flex items-center justify-center rounded">
        LOGPOINT
      </div>
    ),
  },
  {
    id: "deerhold-backend-intern",
    title: "Backend Developer Intern (Python)",
    organizer: "Deerhold Ltd",
    prizes: "Rs. 20,000 / Month",
    location: "In Office | Sano Gaucharan",
    logo: (
      <div className="w-full h-full bg-emerald-50 text-emerald-800 font-black text-[8px] flex items-center justify-center rounded border border-emerald-100">
        DEERHOLD
      </div>
    ),
  },
  {
    id: "cotiviti-devops-intern",
    title: "QA Engineering Intern",
    organizer: "Cotiviti Nepal",
    prizes: "Rs. 22,000 / Month",
    location: "Hybrid | Hattisar",
    logo: (
      <div className="w-full h-full bg-cyan-50 text-cyan-700 font-extrabold text-[8px] flex items-center justify-center rounded border border-cyan-100">
        COTIVITI
      </div>
    ),
  },
  {
    id: "f1soft-mobile-intern",
    title: "Mobile App Intern (Flutter)",
    organizer: "F1Soft International",
    prizes: "Rs. 18,000 / Month",
    location: "In Office | Pulchowk",
    logo: (
      <div className="w-full h-full bg-red-50 text-red-600 font-black text-[9px] flex items-center justify-center rounded border border-red-100">
        F1SOFT
      </div>
    ),
  },
];

const JOBS_DATA: OpportunityCardData[] = [
  {
    id: "cotiviti-fullstack",
    title: "Full Stack Software Engineer I (Java/React)",
    organizer: "Cotiviti Nepal",
    prizes: "Rs. 75,000 / Month",
    location: "In Office | Hattisar",
    logo: (
      <div className="w-full h-full bg-cyan-600 text-white font-extrabold text-[8px] flex items-center justify-center rounded">
        COTIVITI
      </div>
    ),
  },
  {
    id: "leapfrog-frontend-dev",
    title: "Associate Frontend Developer",
    organizer: "Leapfrog Technology",
    prizes: "Rs. 60,000 / Month",
    location: "In Office | Durbarmarg",
    logo: (
      <div className="w-full h-full bg-emerald-600 text-white font-extrabold text-[8px] flex items-center justify-center rounded">
        LEAPFROG
      </div>
    ),
  },
  {
    id: "yarsa-rust-engineer",
    title: "Rust Software Engineer",
    organizer: "Yarsa Labs",
    prizes: "Rs. 90,000 / Month",
    location: "In Office | Pokhara",
    logo: (
      <div className="w-full h-full bg-amber-500 text-slate-900 font-black text-[9px] flex items-center justify-center rounded">
        YARSA
      </div>
    ),
  },
  {
    id: "logpoint-cloud-security",
    title: "Cloud Security & DevOps Specialist",
    organizer: "Logpoint Nepal",
    prizes: "Rs. 1,10,000 / Month",
    location: "In Office | Jawalakhel",
    logo: (
      <div className="w-full h-full bg-slate-900 text-blue-400 font-extrabold text-[8px] flex items-center justify-center rounded">
        LOGPOINT
      </div>
    ),
  },
];

const Index = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex overflow-x-hidden">
      {/* 1. Left Navigation Sidebar */}
      <SidebarNav
        activeRole="talent"
        activeNavId="home"
        onHoverChange={setIsSidebarExpanded}
      />

      {/* 2. Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: isSidebarExpanded ? "292px" : "72px" }}
      >
        {/* Header Nav */}
        <HeaderNav />

        {/* Main Body content */}
        <main className="flex-1 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 pb-16">
          {/* Hero & Category Cards (Courses, Events, Mentors, Colleges, Jobs) */}
          <HeroCategorySection />

          {/* Featured Section */}
          <FeaturedSection />

          {/* Trust Strip */}
          <TrustStrip />

          {/* Opportunity Listing Sections (Competitions, Internships, Jobs) */}
          <OpportunitiesSection
            title="Competitions"
            subtitle="Uncover the most talked-about educational competitions in Nepal today."
            viewAllPath="/competitions"
            opportunities={COMPETITIONS_DATA}
          />

          <OpportunitiesSection
            title="Internships"
            subtitle="Unleash educational internships tailored to your career aspirations."
            viewAllPath="/courses"
            opportunities={INTERNSHIPS_DATA}
          />

          <OpportunitiesSection
            title="Jobs"
            subtitle="Unveil tech and education jobs designed for your next big move."
            viewAllPath="/jobs"
            opportunities={JOBS_DATA}
          />

          {/* Brand Presentation & Feedback Sections (Added before footer) */}
          <AboutUs />
          <Testimonials />
          <FAQ />
          <ContactForm />
          <CTA />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Index;
