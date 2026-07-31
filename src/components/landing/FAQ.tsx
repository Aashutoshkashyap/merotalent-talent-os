"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is MeroTalent?",
    answer: "MeroTalent is Nepal's premier educational ecosystem connecting students, universities, mentors, and employers. We focus on proof-of-skills, helping students showcase their practical projects, courses, and hackathon accomplishments.",
  },
  {
    question: "Is MeroTalent free for students?",
    answer: "Yes, students can browse courses, register for events and hackathons, and connect with academic mentors completely for free.",
  },
  {
    question: "How can I become a mentor on MeroTalent?",
    answer: "You can sign up as a Mentor by clicking on the Mentor option on the side navigation bar and filling in your credentials and areas of academic/industry expertise.",
  },
  {
    question: "Which colleges are partnered with MeroTalent?",
    answer: "We are currently partnering with top universities and campuses across Nepal, including Tribhuvan University (IOE Pulchowk, Thapathali), Kathmandu University, and Pokhara University.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Default open first item like Dataly

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-6 sm:px-10 max-w-7xl mx-auto w-full font-sans bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 items-start">
        {/* Left Column matching Dataly style */}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[#0073e6] font-bold text-xs uppercase tracking-wider bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                MeroTalent FAQ
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
              Frequently asked questions
            </h2>
          </div>

          {/* Still have questions Card */}
          <div className="rounded-[28px] bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-slate-200/50 p-7 sm:p-9 flex flex-col gap-5 max-w-md">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              Still have a questions?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              Can&apos;t find the answer to your question? Send us an email and we&apos;ll get back to you as soon as possible!
            </p>
            <div>
              <a
                href="mailto:hello@merotalent.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#0073e6] hover:bg-[#0062c4] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                Send email
              </a>
            </div>
          </div>
        </div>

        {/* Right Column Accordions matching Dataly style */}
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-[#f8fafc]/50 p-6 flex flex-col transition-all duration-300 shadow-2xs hover:border-[#0073e6]"
              >
                <button
                  onClick={() => toggleOpen(index)}
                  className="w-full flex items-center justify-between text-left font-extrabold text-[#1e293b] hover:text-[#0073e6] transition-colors"
                >
                  <span className="text-sm sm:text-base pr-4 leading-snug">{item.question}</span>
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[#0073e6] shadow-3xs">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? "max-h-[220px] mt-4 pt-4 border-t border-slate-200/50" : "max-h-0"
                  }`}
                >
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
