"use client";

import React, { useId, useState } from "react";
import { ChevronUp, ChevronDown, ArrowUpRight } from "lucide-react";
import { safeExternalUrl } from "@/lib/institutes/public-institutes";

export interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is MeroTalent?",
    answer: "MeroTalent connects students and professionals with college listings, jobs, mentors, events and partner courses in Nepal.",
  },
  {
    question: "Is MeroTalent free for students?",
    answer: "Browsing public opportunities is free. Mentor sessions, events and partner courses may have a fee, shown before checkout. Paid access is confirmed only after payment verification.",
  },
  {
    question: "How can I become a mentor on MeroTalent?",
    answer: "Complete your profile and request Mentor module access with the required supporting documents. Access follows the applicable approval and subscription requirements.",
  },
  {
    question: "Where can I find colleges on MeroTalent?",
    answer: "Browse the Institutes directory for published college listings and available application information. A directory listing does not itself imply a partnership or paid verification.",
  },
];

interface FAQProps {
  eyebrow?: string;
  title?: string;
  contactTitle?: string;
  contactBody?: string;
  contactLabel?: string;
  contactUrl?: string;
  items?: FAQItem[];
}

export default function FAQ({
  eyebrow = "MeroTalent FAQ",
  title = "Frequently asked questions",
  contactTitle = "Still have a question?",
  contactBody = "Can't find the answer to your question? Send us an email and we'll get back to you as soon as possible!",
  contactLabel = "Contact support",
  contactUrl = "#contact",
  items = FAQ_ITEMS,
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Default open first item like Dataly
  const accordionId = useId();
  const contactHref = /^(?:mailto:|tel:)[^\s<>]+$/i.test(contactUrl) || /^\/(?!\/)/.test(contactUrl) || contactUrl === "#contact"
    ? contactUrl : safeExternalUrl(contactUrl) || "#contact";

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
                {eyebrow}
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
              {title}
            </h2>
          </div>

          {/* Still have questions Card */}
          <div className="rounded-[28px] bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-slate-200/50 p-7 sm:p-9 flex flex-col gap-5 max-w-md">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {contactTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              {contactBody}
            </p>
            <a href={contactHref} className="inline-flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-blue-50/80 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
              <ArrowUpRight aria-hidden="true" className="w-4 h-4" />
              {contactLabel}
            </a>
          </div>
        </div>

        {/* Right Column Accordions matching Dataly style */}
        <div className="flex flex-col gap-4">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-[#f8fafc]/50 p-6 flex flex-col transition-all duration-300 shadow-2xs hover:border-[#0073e6]"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${accordionId}-${index}`}
                  onClick={() => toggleOpen(index)}
                  className="w-full flex items-center justify-between text-left font-extrabold text-[#1e293b] hover:text-[#0073e6] transition-colors"
                >
                  <span className="text-sm sm:text-base pr-4 leading-snug">{item.question}</span>
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[#0073e6] shadow-3xs">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                <div
                  id={`${accordionId}-${index}`}
                  hidden={!isOpen}
                  className="mt-4 pt-4 border-t border-slate-200/50"
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
