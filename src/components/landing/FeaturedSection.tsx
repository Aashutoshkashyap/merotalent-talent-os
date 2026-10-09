"use client";

import React, { useEffect, useRef, useState } from "react";
import FeaturedPosterCard, { FeaturedCardData } from "./FeaturedPosterCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeaturedSectionProps {
  cards?: FeaturedCardData[];
  title?: string;
}

interface HydratedFeaturedItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  image: string | null;
  path: string;
  externalHref?: string;
  brand: string;
  label: string;
  actionLabel: string;
}

export default function FeaturedSection({
  cards: suppliedCards,
  title = "Featured",
}: FeaturedSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveCards, setLiveCards] = useState<FeaturedCardData[]>([]);

  useEffect(() => {
    if (suppliedCards) return;
    let isCancelled = false;

    const loadFeatured = async () => {
      try {
        const res = await fetch("/api/v1/featured");
        if (!res.ok) return;
        const body = await res.json();
        const items: HydratedFeaturedItem[] = Array.isArray(body?.data) ? body.data : [];

        const gradients = [
          "bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-700",
          "bg-gradient-to-br from-emerald-800 via-teal-900 to-cyan-950",
          "bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-800",
        ];

        const hydratedCards: FeaturedCardData[] = items.map((item, index) => ({
          id: String(item.id),
          posterBg: gradients[index % gradients.length],
          posterImage: item.image,
          badgeTag: item.label,
          title: item.title,
          actionLabel: item.actionLabel,
          path: item.path,
          externalHref: item.externalHref,
          posterContent: {
            brandTag: item.brand,
            bannerTitle: item.label,
            subtitle: item.title,
            description: item.description || "No description provided.",
          },
        }));

        if (!isCancelled) setLiveCards(hydratedCards.slice(0, 12));
      } catch {
        // Non-blocking for landing page
      }
    };
    void loadFeatured();

    return () => {
      isCancelled = true;
    };
  }, [suppliedCards]);

  const cards = suppliedCards ?? liveCards;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (cards.length === 0) return null;

  return (
    <section className="py-10 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Header Row with Title & Arrow Nav Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Vertical Blue Bar Pill Accent */}
          <div className="w-1.5 h-7 rounded-full bg-[#0073e6]" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Slider Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Row */}
      <div
        ref={scrollRef}
        className="flex items-center gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.map((card) => (
          <FeaturedPosterCard key={card.id} data={card} />
        ))}
      </div>
    </section>
  );
}
