"use client";

import React, { useEffect, useRef, useState } from "react";
import FeaturedPosterCard, { FeaturedCardData } from "./FeaturedPosterCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPartnerCourseRedirect } from "@/lib/courses/partnered-courses";

interface FeaturedSectionProps {
  cards?: FeaturedCardData[];
  title?: string;
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
      const now = new Date().toISOString();
      const [featuredResult, collegeFlags, mentorFlags, jobFlags, eventFlags] = await Promise.all([
        (supabase as any).from("featured_items")
          .select("id, entity_type, entity_id, title, placement, priority, start_date, end_date")
          .eq("is_active", true)
          .lte("start_date", now)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .is("deleted_at", null)
          .order("priority", { ascending: false })
          .limit(12),
        (supabase as any).from("institutes").select("id").eq("status", "approved")
          .is("deleted_at", null).eq("is_featured", true)
          .or(`featured_until.is.null,featured_until.gt.${now}`)
          .order("ranking", { ascending: true, nullsFirst: false }).limit(8),
        (supabase as any).from("mentors").select("id").eq("is_featured", true)
          .eq("approval_status", "approved").eq("is_available", true).is("deleted_at", null).limit(8),
        (supabase as any).from("jobs").select("id").eq("is_featured", true)
          .eq("status", "published").eq("approval_status", "approved").eq("is_active", true)
          .is("deleted_at", null).or(`expires_at.is.null,expires_at.gt.${now}`).limit(8),
        (supabase as any).from("events").select("id").eq("is_featured", true)
          .in("status", ["approved", "published"]).eq("approval_status", "approved").eq("is_active", true)
          .is("deleted_at", null).gt("end_date", now).limit(8),
      ]);

      type FeaturedRow = {
        id: string;
        entity_type: "college" | "mentor" | "course" | "job" | "event";
        entity_id: string;
        title: string | null;
      };
      const featuredRows: FeaturedRow[] = [...(featuredResult.error ? [] : featuredResult.data || [])];
      for (const [entityType, result] of [
        ["college", collegeFlags], ["mentor", mentorFlags], ["job", jobFlags], ["event", eventFlags],
      ] as const) {
        if (result.error) continue;
        for (const row of result.data || []) {
          if (featuredRows.some((item) => item.entity_type === entityType && item.entity_id === row.id)) continue;
          featuredRows.push({ id: `${entityType}:${row.id}`, entity_type: entityType, entity_id: row.id, title: null });
        }
      }
      const idsFor = (entityType: string) => featuredRows
        .filter((item) => item.entity_type === entityType)
        .map((item) => item.entity_id);
      const collegeIds = idsFor("college");
      const mentorIds = idsFor("mentor");
      const courseIds = idsFor("course");
      const jobIds = idsFor("job");
      const eventIds = idsFor("event");

      const emptyResult = { data: [], error: null };
      const [collegeResult, mentorResult, courseResult, jobResult, eventResult] = await Promise.all([
        collegeIds.length
          ? (supabase as any)
            .from("institute_directory")
            .select("id,name,slug,type,location,description,logo_url,cover_image_url")
            .in("id", collegeIds)
          : emptyResult,
        mentorIds.length
          ? (supabase as any)
            .from("mentors")
            .select("id,user_id,headline,description,expertise,profile_image_url,cover_image_url")
            .in("id", mentorIds)
            .eq("approval_status", "approved")
            .eq("is_available", true)
            .is("deleted_at", null)
          : emptyResult,
        courseIds.length
          ? (supabase as any)
            .from("courses")
            .select("id,title,description,category,thumbnail_url,partner_name,redirect_url")
            .in("id", courseIds)
            .eq("is_partnered", true)
            .eq("is_published", true)
            .eq("status", "published")
            .is("deleted_at", null)
          : emptyResult,
        jobIds.length
          ? (supabase as any)
            .from("jobs")
            .select("id,title,description,location,job_type,companies(name,logo_url)")
            .in("id", jobIds)
            .eq("status", "published")
            .eq("approval_status", "approved")
            .eq("is_active", true)
            .is("deleted_at", null)
            .or(`expires_at.is.null,expires_at.gt.${now}`)
          : emptyResult,
        eventIds.length
          ? (supabase as any)
            .from("events")
            .select("id,title,description,event_type,format,location,cover_image_url")
            .in("id", eventIds)
            .in("status", ["approved", "published"])
            .eq("approval_status", "approved")
            .eq("is_active", true)
            .is("deleted_at", null)
            .gt("end_date", now)
          : emptyResult,
      ]);

      const mentorRows = mentorResult.data || [];
      const mentorUserIds = mentorRows.map((mentor: any) => mentor.user_id).filter(Boolean);
      const { data: mentorProfiles } = mentorUserIds.length
        ? await (supabase as any)
          .from("public_profile_directory")
          .select("user_id,full_name,avatar_url,bio,location")
          .in("user_id", mentorUserIds)
        : emptyResult;
      const mentorProfilesByUserId = new Map<string, any>(
        (mentorProfiles || []).map((profile: any) => [profile.user_id, profile]),
      );

      type HydratedEntity = {
        title: string;
        description: string | null;
        image: string | null;
        path: string;
        externalHref?: string;
        brand: string;
        label: string;
        actionLabel: string;
      };
      const entities = new Map<string, HydratedEntity>();
      for (const college of collegeResult.data || []) {
        entities.set(`college:${college.id}`, {
          title: college.name,
          description: college.description || college.location || null,
          image: college.cover_image_url || college.logo_url || null,
          path: `/institutes/${college.slug || college.id}`,
          brand: college.type || college.location || "College",
          label: "College",
          actionLabel: "Explore College",
        });
      }
      for (const mentor of mentorRows) {
        const profile = mentorProfilesByUserId.get(mentor.user_id);
        const expertise = Array.isArray(mentor.expertise) ? mentor.expertise.join(", ") : null;
        entities.set(`mentor:${mentor.id}`, {
          title: profile?.full_name || mentor.headline || "Name unavailable",
          description: mentor.description || profile?.bio || expertise,
          image: mentor.cover_image_url || mentor.profile_image_url || profile?.avatar_url || null,
          path: `/mentorship/${mentor.id}`,
          brand: mentor.headline || profile?.location || "Mentor",
          label: "Mentor",
          actionLabel: "Book Mentor",
        });
      }
      for (const course of courseResult.data || []) {
        const externalHref = getPartnerCourseRedirect(course.redirect_url);
        if (!externalHref) continue;
        entities.set(`course:${course.id}`, {
          title: course.title,
          description: course.description || course.category || null,
          image: course.thumbnail_url || null,
          path: `/courses/${course.id}`,
          externalHref,
          brand: course.partner_name || course.category || "Partner course",
          label: "Course",
          actionLabel: "View Course",
        });
      }
      for (const job of jobResult.data || []) {
        const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
        entities.set(`job:${job.id}`, {
          title: job.title,
          description: job.description || job.location || null,
          image: company?.logo_url || null,
          path: `/jobs/${job.id}`,
          brand: company?.name || job.location || "Job",
          label: job.job_type ? String(job.job_type).replace(/_/g, " ") : "Job",
          actionLabel: "Apply Now",
        });
      }
      for (const event of eventResult.data || []) {
        entities.set(`event:${event.id}`, {
          title: event.title,
          description: event.description || event.location || null,
          image: event.cover_image_url || null,
          path: `/events/${event.id}`,
          brand: event.location || event.format || "Event",
          label: event.event_type === "paid" ? "Paid event" : "Event",
          actionLabel: "Register Now",
        });
      }

      const gradients = [
        "bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-700",
        "bg-gradient-to-br from-emerald-800 via-teal-900 to-cyan-950",
        "bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-800",
      ];
      const hydratedCards = featuredRows.flatMap((item, index) => {
        const entity = entities.get(`${item.entity_type}:${item.entity_id}`);
        if (!entity) return [];
        const displayTitle = item.title?.trim() || entity.title;
        return [{
          id: String(item.id),
          posterBg: gradients[index % gradients.length],
          posterImage: entity.image,
          badgeTag: entity.label,
          title: displayTitle,
          actionLabel: entity.actionLabel,
          path: entity.path,
          externalHref: entity.externalHref,
          posterContent: {
            brandTag: entity.brand,
            bannerTitle: entity.label,
            subtitle: displayTitle,
            description: entity.description || "No description provided.",
          },
        } satisfies FeaturedCardData];
      });
      if (!isCancelled) setLiveCards(hydratedCards.slice(0, 12));
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
