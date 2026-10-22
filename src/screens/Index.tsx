"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SidebarNav from "@/components/landing/SidebarNav";
import HeaderNav from "@/components/landing/HeaderNav";
import HeroCategorySection from "@/components/landing/HeroCategorySection";
import FeaturedSection from "@/components/landing/FeaturedSection";
import ActiveAdvertisements from "@/components/landing/ActiveAdvertisements";
import TrustStrip from "@/components/landing/TrustStrip";
import OpportunitiesSection from "@/components/landing/OpportunitiesSection";
import AboutUs from "@/components/landing/AboutUs";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import type { OpportunityCardData } from "@/components/landing/OpportunityCard";
import InstituteCard from "@/components/institutes/InstituteCard";
import { useSiteCMS, type CmsSnapshot } from "@/hooks/useSiteCMS";
import { fetchPublicInstitutes, institutePath, type InstituteRecord } from "@/lib/institutes/public-institutes";
import { getPartnerCourseRedirect, isLivePartnerCourse, PARTNER_COURSE_SELECT, type PartnerCourse } from "@/lib/courses/partnered-courses";

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

const formatEventDate = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat("en-NP", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const splitFirstWord = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return {
    first: words.shift() || "",
    rest: words.join(" "),
  };
};

export default function Index({ initialCmsSnapshot }: { initialCmsSnapshot?: CmsSnapshot | null }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [competitions, setCompetitions] = useState<OpportunityCardData[]>([]);
  const [jobs, setJobs] = useState<OpportunityCardData[]>([]);
  const [internships, setInternships] = useState<OpportunityCardData[]>([]);
  const [colleges, setColleges] = useState<InstituteRecord[]>([]);
  const [mentors, setMentors] = useState<OpportunityCardData[]>([]);
  const [events, setEvents] = useState<OpportunityCardData[]>([]);
  const [courses, setCourses] = useState<OpportunityCardData[]>([]);
  const [collegeUpdates, setCollegeUpdates] = useState<OpportunityCardData[]>([]);
  const { settings, getSection, getChildSections, hasSectionConfiguration, isSectionVisible, isLoading } = useSiteCMS("home", initialCmsSnapshot);

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
      const [competitionResult, jobResult, collegeResult, mentorResult, eventResult, courseResult] = await Promise.all([
        fetch("/api/v1/competitions?limit=12").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/v1/jobs?limit=18").then((r) => r.json()).catch(() => ({ data: [] })),
        fetchPublicInstitutes({
          search: "", category: "all", location: "", affiliation: "", admissionStatus: "", sort: "recommended", limit: 6,
        }).catch(() => null),
        fetch("/api/v1/mentors?limit=8").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/v1/events?limit=8").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/v1/courses?limit=8").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (collegeResult) setColleges(collegeResult.institutes);

      if (Array.isArray(competitionResult?.data)) {
        setCompetitions(competitionResult.data.map((row: Record<string, any>) => {
          const organizer = String(row.organizer_type || "MeroTalent partner").replace(/_/g, " ");
          return {
            id: String(row.id),
            title: String(row.title),
            organizer,
            prizes: row.prize_pool ? String(row.prize_pool) : undefined,
            isOnline: String(row.format || "").toLowerCase() === "online",
            logo: companyMark(organizer),
            path: `/competitions#competition-${row.id}`,
          };
        }));
      }

      if (Array.isArray(jobResult?.data)) {
        const mapped = jobResult.data.map((row: Record<string, any>) => {
          const employer = String(row.company_name || row.companies?.name || "MeroTalent employer");
          return {
            id: String(row.id),
            title: String(row.title),
            organizer: employer,
            prizes: formatSalary(row),
            location: row.location ? String(row.location) : undefined,
            logo: companyMark(employer),
            path: `/jobs/${row.id}`,
            jobType: String(row.job_type || "").toLowerCase(),
          };
        });
        const asOpportunity = ({ jobType: _jobType, ...row }: any) => row as OpportunityCardData;
        setInternships(mapped.filter((row: any) => row.jobType === "internship").map(asOpportunity));
        setJobs(mapped.filter((row: any) => row.jobType !== "internship").map(asOpportunity));
      }

      if (Array.isArray(mentorResult?.data)) {
        setMentors(mentorResult.data.map((row: Record<string, any>) => {
          const name = String(row.full_name || row.headline || "Mentor");
          return {
            id: String(row.id),
            title: name,
            organizer: String(row.headline || "Mentor"),
            location: Array.isArray(row.expertise) ? row.expertise.slice(0, 2).join(" • ") : undefined,
            logo: companyMark(name),
            path: `/mentorship/${row.id}`,
          };
        }));
      }

      if (Array.isArray(eventResult?.data)) {
        setEvents(eventResult.data.map((row: Record<string, any>) => ({
          id: String(row.id),
          title: String(row.title),
          organizer: String(row.format || "Event").replace(/_/g, " "),
          location: row.location ? String(row.location) : undefined,
          prizes: formatEventDate(row.start_date),
          logo: companyMark(String(row.title)),
          path: `/events/${row.id}`,
        })));
      }

      if (Array.isArray(courseResult?.data)) {
        setCourses((courseResult.data as PartnerCourse[]).filter(isLivePartnerCourse).flatMap((row) => {
          const externalHref = getPartnerCourseRedirect(row.redirect_url);
          if (!externalHref) return [];
          return [{
            id: row.id,
            title: row.title,
            organizer: row.partner_name || row.category || "Partner course",
            logo: companyMark(row.partner_name || row.title),
            externalHref,
          }];
        }));
      }
    };
    void loadOpportunities();
  }, []);

  const competitionsSection = getSection("competitions_section");
  const internshipsSection = getSection("internships_section");
  const jobsSection = getSection("jobs_section");
  const collegesSection = getSection("colleges_section");
  const mentorsSection = getSection("mentors_section");
  const eventsSection = getSection("events_section");
  const coursesSection = getSection("courses_section");
  const updatesSection = getSection("college_updates_section");

  const isConfiguredSectionVisible = (primaryKey: string, fallbackKey?: string) => {
    if (hasSectionConfiguration(primaryKey)) return isSectionVisible(primaryKey);
    if (fallbackKey && hasSectionConfiguration(fallbackKey)) return isSectionVisible(fallbackKey);
    if (isLoading) return false;
    return true;
  };

  // Define section render items with display_order and visibility checks
  const sectionConfigs = [
    {
      key: "hero_banner",
      order: heroSection?.display_order ?? 1,
      isVisible: isConfiguredSectionVisible("hero_banner"),
      render: () => (
        <HeroCategorySection
          key="hero_banner"
          heading={heroSection?.title || undefined}
          metricText={heroSection?.subtitle || undefined}
        />
      ),
    },
    {
      key: "featured_content",
      order: featuredSection?.display_order ?? 2,
      isVisible: isConfiguredSectionVisible("featured_content", "latest_news"),
      render: () => <FeaturedSection key="featured_content" title={featuredSection?.title || undefined} />,
    },
    {
      key: "advertisements",
      order: getSection("advertisements")?.display_order ?? 3,
      isVisible: isConfiguredSectionVisible("advertisements"),
      render: () => <ActiveAdvertisements key="advertisements" />,
    },
    {
      key: "trust_strip",
      order: trustSection?.display_order ?? 4,
      isVisible: isConfiguredSectionVisible("trust_strip"),
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
      key: "colleges_section",
      order: collegesSection?.display_order ?? 4.5,
      isVisible: colleges.length > 0 && isConfiguredSectionVisible("colleges_section"),
      render: () => (
        <section key="colleges_section" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{collegesSection?.title || "Explore colleges"}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{collegesSection?.subtitle || "Approved institutions from the MeroTalent directory."}</p>
            </div>
            <Link to="/institutes" className="text-sm font-extrabold text-[#0073e6] hover:underline">View all colleges →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {colleges.map((college) => <InstituteCard key={college.id} institute={college} />)}
          </div>
        </section>
      ),
    },
    {
      key: "competitions_section",
      order: competitionsSection?.display_order ?? 5,
      isVisible: competitions.length > 0 && isConfiguredSectionVisible("competitions_section"),
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
      key: "internships_section",
      order: internshipsSection?.display_order ?? 6,
      isVisible: internships.length > 0 && isConfiguredSectionVisible("internships_section"),
      render: () => (
        <OpportunitiesSection
          key="internships_section"
          title={internshipsSection?.title || "Internships"}
          subtitle={internshipsSection?.subtitle || "Start your career with approved internships from active employers."}
          viewAllPath="/jobs"
          opportunities={internships}
        />
      ),
    },

    {
      key: "jobs_section",
      order: jobsSection?.display_order ?? 7,
      isVisible: jobs.length > 0 && isConfiguredSectionVisible("jobs_section"),
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
      key: "mentors_section",
      order: mentorsSection?.display_order ?? 7.25,
      isVisible: mentors.length > 0 && isConfiguredSectionVisible("mentors_section"),
      render: () => <OpportunitiesSection key="mentors_section" title={mentorsSection?.title || "Meet mentors"} subtitle={mentorsSection?.subtitle || "Approved mentors available to guide your next step."} viewAllPath="/mentorship" opportunities={mentors} />,
    },
    {
      key: "events_section",
      order: eventsSection?.display_order ?? 7.5,
      isVisible: events.length > 0 && isConfiguredSectionVisible("events_section"),
      render: () => <OpportunitiesSection key="events_section" title={eventsSection?.title || "Upcoming events"} subtitle={eventsSection?.subtitle || "Approved events still open to explore."} viewAllPath="/events" opportunities={events} />,
    },
    {
      key: "courses_section",
      order: coursesSection?.display_order ?? 7.75,
      isVisible: courses.length > 0 && isConfiguredSectionVisible("courses_section"),
      render: () => <OpportunitiesSection key="courses_section" title={coursesSection?.title || "Partner courses"} subtitle={coursesSection?.subtitle || "Continue learning on the approved partner platform."} viewAllPath="/courses" opportunities={courses} />,
    },
    {
      key: "college_updates_section",
      order: updatesSection?.display_order ?? 7.9,
      isVisible: collegeUpdates.length > 0 && isConfiguredSectionVisible("college_updates_section"),
      render: () => <OpportunitiesSection key="college_updates_section" title={updatesSection?.title || "College updates"} subtitle={updatesSection?.subtitle || "Recent posts and notices from approved institutions."} viewAllPath="/institutes" opportunities={collegeUpdates} />,
    },
    {
      key: "about_us",
      order: aboutSection?.display_order ?? 8,
      isVisible: isConfiguredSectionVisible("about_us", "features_grid"),
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
      key: "features",
      order: 8.5,
      isVisible: isConfiguredSectionVisible("features", "about_us"),
      render: () => <Features key="features" />,
    },
    {
      key: "testimonials",
      order: testimonialsSection?.display_order ?? 9,
      isVisible: isConfiguredSectionVisible("testimonials"),
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
      isVisible: isConfiguredSectionVisible("faq"),
      render: () => (
        <FAQ
          key="faq"
          eyebrow={faqSection?.subtitle || undefined}
          title={faqSection?.title || undefined}
          contactBody={faqSection?.body || undefined}
          contactLabel={faqSection?.cta_label || undefined}
          contactUrl={faqSection?.cta_url || (settings.contact_email || settings.support_email ? `mailto:${settings.contact_email || settings.support_email}` : "#contact")}
          items={faqs}
        />
      ),
    },
    {
      key: "contact_form",
      order: getSection("contact_form")?.display_order ?? 11,
      isVisible: isConfiguredSectionVisible("contact_form", "contact_us"),
      render: () => <ContactForm key="contact_form" settings={settings} />,
    },
    {
      key: "cta",
      order: getSection("cta")?.display_order ?? 12,
      isVisible: isConfiguredSectionVisible("cta"),
      render: () => <CTA key="cta" />,
    },
  ];

  // Sort sections by display order
  const activeSections = sectionConfigs
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex min-h-screen overflow-x-clip bg-white font-sans text-slate-900">
      <div className="hidden sm:block"><SidebarNav activeRole="talent" activeNavId="home" onHoverChange={setIsSidebarExpanded} /></div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out sm:ml-[var(--sidebar-width)]" style={{ "--sidebar-width": isSidebarExpanded ? "292px" : "72px" } as React.CSSProperties}>
        <HeaderNav />
        <main className="flex-1 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 pb-0">
          {activeSections.map((s) => s.render())}
        </main>
        <Footer />
      </div>
    </div>
  );
}
