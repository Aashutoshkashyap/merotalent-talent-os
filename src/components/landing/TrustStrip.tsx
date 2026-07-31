"use client";

import React from "react";

export interface TrustPartner {
  id: string;
  name: string;
  logo: React.ReactNode;
}

export const DEFAULT_PARTNERS: TrustPartner[] = [
  {
    id: "logpoint",
    name: "Logpoint Nepal",
    logo: (
      <div className="flex items-center gap-1 font-black text-base text-slate-900 tracking-tight">
        <span className="text-blue-600">log</span>point
      </div>
    ),
  },
  {
    id: "deerhold",
    name: "Deerhold",
    logo: (
      <div className="flex items-center gap-1 font-black text-base text-slate-800 tracking-tight">
        <span>DEERHOLD</span>
      </div>
    ),
  },
  {
    id: "cotiviti",
    name: "Cotiviti Nepal",
    logo: (
      <div className="flex flex-col items-center leading-none">
        <span className="font-extrabold text-base text-cyan-600 tracking-tight">COTIVITI</span>
      </div>
    ),
  },
  {
    id: "f1soft",
    name: "F1Soft",
    logo: (
      <div className="flex items-center gap-1 font-extrabold text-base text-red-600">
        <span>f1soft</span>
      </div>
    ),
  },
  {
    id: "leapfrog",
    name: "Leapfrog Technology",
    logo: (
      <div className="flex items-center gap-1 font-extrabold text-base text-emerald-600">
        <span>leapfrog</span>
      </div>
    ),
  },
  {
    id: "yarsa",
    name: "Yarsa Labs",
    logo: (
      <div className="flex items-center gap-1 font-black text-base text-slate-900">
        <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
          Y
        </span>
        <span>YARSA LABS</span>
      </div>
    ),
  },
  {
    id: "cedargate",
    name: "Cedar Gate Technologies",
    logo: (
      <div className="flex items-center gap-1 font-bold text-base text-indigo-700">
        <span>CEDAR GATE</span>
      </div>
    ),
  },
];

interface TrustStripProps {
  title?: string;
  highlightWord?: string;
  partners?: TrustPartner[];
}

export default function TrustStrip({
  title = "by Top Nepalese Tech & Engineering Employers",
  highlightWord = "Trusted",
  partners = DEFAULT_PARTNERS,
}: TrustStripProps) {
  return (
    <section className="py-10 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col items-center">
      {/* Section Heading */}
      <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 text-center mb-7 tracking-tight">
        <span className="text-[#0073e6]">{highlightWord}</span> {title}
      </h3>

      {/* Partner Logos Row */}
      <div className="w-full flex flex-wrap items-center justify-center gap-8 sm:gap-10 md:gap-14 opacity-80 hover:opacity-100 transition-opacity">
        {partners.map((partner) => (
          <div
            key={partner.id}
            title={partner.name}
            className="hover:scale-110 transition-transform duration-200 cursor-pointer grayscale hover:grayscale-0 py-1"
          >
            {partner.logo}
          </div>
        ))}
      </div>
    </section>
  );
}
