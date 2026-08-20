"use client";

import React, { useEffect, useState } from "react";
import SidebarNav from "@/components/landing/SidebarNav";
import HeaderNav from "@/components/landing/HeaderNav";
import HeroCategorySection from "@/components/landing/HeroCategorySection";
import FeaturedSection from "@/components/landing/FeaturedSection";
import ActiveAdvertisements from "@/components/landing/ActiveAdvertisements";
import TrustStrip from "@/components/landing/TrustStrip";
import OpportunitiesSection from "@/components/landing/OpportunitiesSection";
import AboutUs from "@/components/landing/AboutUs";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import type { OpportunityCardData } from "@/components/landing/OpportunityCard";
import { supabase } from "@/integrations/supabase/client";
import { useSiteCMS } from "@/hooks/useSiteCMS";

const companyMark = (name: string) => (
  <span className="text-center text-[9px] font-black uppercase leading-tight text-blue-700">
    {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || "MT"}
  </span>
);

const formatSalary = (row: Record<string, any>) => {
  const minimum = Number(row.salary_min || 0);
  const maximum = Number(row.salary_max || 0);
  if (minimum && maximum) return `NPR ${minimum.toLocaleString()} – ${maximum.toLocaleString()}`;
  if (maximum) return `Up to NPR ${maximum.toLocaleString()}`;
  return undefined;
};

const asText = (value: unknown) => typeof value === "string" ? value : "";

const splitFirstWord = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return {
    first: words.shift() || "",
    rest: words.join(" "),
  };
};

export default function Index() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [competitions, setCompetitions] = useState<OpportunityCardData[]>([]);
  const [jobs, setJobs] = useState<OpportunityCardData[]>([]);
  const { getSection, getChildSections } = useSiteCMS("home");

  const heroSection = getSection("hero_banner");
  const featuredSection = getSection("featured_content") || getSection("latest_news");
  const trustSection = getSection("trust_strip");
  const aboutSection = getSection("about_us") || getSection("features_grid");
  const testimonialsSection = getSection("testimonials");
  const faqSection = getSection("faq");

  const trustHeading = splitFirstWord(trustSection?.title || "");
  const trustItems = trustSection ? getChildSections(trustSection) : [];
  const trustPartners = trustItems.length > 0
    ? trustItems.map((item) => ({
      id: item.id,
      name: item.title,
      logo: item.image_url ? (
        <img
          src={item.image_url}
          alt={item.image_alt || item.title}
          className="h-8 max-w-32 object-contain"
        />
      ) : (
        <span className="text-base font-extrabold tracking-tight text-slate-800">{item.title}</span>
      ),
    }))
    : undefined;

  const testimonialItems = testimonialsSection ? getChildSections(testimonialsSection) : [];
  const testimonials = testimonialItems.length > 0
    ? testimonialItems.map((item) => {
      const subtitleParts = (item.subtitle || "").split(/\s*[|•]\s*/).filter(Boolean);
      return {
        id: item.id,
        quote: item.body || "",
        author: item.title,
        role: asText(item.extra_data?.role) || subtitleParts[0] || "",
        institution: asText(item.extra_data?.institution) || subtitleParts.slice(1).join(" • "),
      };
    })
    : undefined;

  const faqItems = faqSection ? getChildSections(faqSection) : [];
  const faqs = faqItems.length > 0
    ? faqItems.map((item) => ({ question: item.title, answer: item.body || item.subtitle || "" }))
    : undefined;

  useEffect(() => {
    const loadOpportunities = async () => {
      const now = new Date().toISOString();
      const [competitionResult, jobResult] = await Promise.all([
        (supabase as any)
          .from("competitions")
          .select("id, title, organizer_type, prize_pool, format")
          .in("status", ["upcoming", "ongoing"])
          .order("created_at", { ascending: false })
          .limit(12),
        (supabase as any)
          .from("jobs")
          .select("id, title, job_type, salary_min, salary_max, location, companies(name)")
          .eq("status", "published")
          .eq("approval_status", "approved")
          .eq("is_active", true)
          .is("deleted_at", null)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("created_at", { ascending: false })
          .limit(18),
      ]);

      if (!competitionResult.error) {
        setCompetitions((competitionResult.data || []).map((row: Record<string, any>) => {
          const organizer = String(row.organizer_type || "MeroTalent partner").replace(/_/g, " ");
          return {
            id: String(row.id),
            title: String(row.title),
            organizer,
            prizes: row.prize_pool ? String(row.prize_pool) : undefined,
            isOnline: String(row.format || "").toLowerCase() === "online",
            logo: companyMark(organizer),
            path: "/competitions",
          };
        }));
      }

      if (!jobResult.error) {
        const mapped = (jobResult.data || []).map((row: Record<string, any>) => {
          const employer = String(row.companies?.name || "MeroTalent employer");
          return {
            id: String(row.id),
            title: String(row.title),
            organizer: employer,
            prizes: formatSalary(row),
            location: row.location ? String(row.location) : undefined,
            logo: companyMark(employer),
            path: "/jobs",
            jobType: String(row.job_type || "").toLowerCase(),
          };
        });
        setJobs(mapped.map(({ jobType: _jobType, ...row }: any) => row));
      }
    };
    void loadOpportunities();
  }, []);

  const competitionsSection = getSection("competitions_section");
  const jobsSection = getSection("jobs_section");

  // Define section render items with display_order and visibility checks
  const sectionConfigs = [
    {
      key: "trust_strip",
      order: trustSection?.display_order ?? 4,
      isVisible: trustSection ? trustSection.is_visible : true,
      render: () => (
        <TrustStrip
          key="trust_strip"
          highlightWord={trustHeading.first || undefined}
          title={trustHeading.rest || undefined}
          partners={trustPartners}
        />
      ),
    },
    {
      key: "competitions_section",
      order: competitionsSection?.display_order ?? 5,
      isVisible: competitionsSection ? competitionsSection.is_visible : true,
      render: () => (
        <OpportunitiesSection
          key="competitions_section"
          title={competitionsSection?.title || "Competitions"}
          subtitle={competitionsSection?.subtitle || "Discover current competitions published by MeroTalent partners."}
          viewAllPath="/competitions"
          opportunities={competitions}
        />
      ),
    },

    {
      key: "jobs_section",
      order: jobsSection?.display_order ?? 6,
      isVisible: jobsSection ? jobsSection.is_visible : true,
      render: () => (
        <OpportunitiesSection
          key="jobs_section"
          title={jobsSection?.title || "Jobs"}
          subtitle={jobsSection?.subtitle || "Browse all approved jobs and internships from active employers."}
          viewAllPath="/jobs"
          opportunities={jobs}
        />
      ),
    },
    {
      key: "about_us",
      order: aboutSection?.display_order ?? 8,
      isVisible: aboutSection ? aboutSection.is_visible : true,
      render: () => (
        <AboutUs
          key="about_us"
          title={aboutSection?.title || undefined}
          eyebrow={aboutSection?.subtitle || undefined}
          description={aboutSection?.body || undefined}
        />
      ),
    },
    {
      key: "testimonials",
      order: testimonialsSection?.display_order ?? 9,
      isVisible: testimonialsSection ? testimonialsSection.is_visible : true,
      render: () => (
        <Testimonials
          key="testimonials"
          eyebrow={testimonialsSection?.subtitle || undefined}
          title={testimonialsSection?.title || undefined}
          testimonials={testimonials}
        />
      ),
    },
    {
      key: "faq",
      order: faqSection?.display_order ?? 10,
      isVisible: faqSection ? faqSection.is_visible : true,
      render: () => (
        <FAQ
          key="faq"
          eyebrow={faqSection?.subtitle || undefined}
          title={faqSection?.title || undefined}
          contactBody={faqSection?.body || undefined}
          contactLabel={faqSection?.cta_label || undefined}
          contactUrl={faqSection?.cta_url || undefined}
          items={faqs}
        />
      ),
    },
  ];

  // Sort sections by display order
  const activeSections = sectionConfigs
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white font-sans text-slate-900">
      <SidebarNav activeRole="talent" activeNavId="home" onHoverChange={setIsSidebarExpanded} />
      <div className="flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out" style={{ marginLeft: isSidebarExpanded ? "292px" : "72px" }}>
        <HeaderNav />
        <main className="flex-1 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 pb-16">
          <HeroCategorySection
            heading={heroSection?.title || undefined}
            metricText={heroSection?.subtitle || undefined}
          />
          <FeaturedSection title={featuredSection?.title || undefined} />
          <ActiveAdvertisements />
          
          {/* Dynamically Ordered & Controlled Homepage Sections */}
          {activeSections.map((s) => s.render())}

          <ContactForm />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
