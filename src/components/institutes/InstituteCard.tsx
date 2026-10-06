"use client";

import { BadgeCheck, BookOpen, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import InstituteImage from "./InstituteImage";
import {
  formatInstituteCategory,
  getInstitutePrograms,
  institutePath,
  type InstituteRecord,
} from "@/lib/institutes/public-institutes";

interface InstituteCardProps {
  institute: InstituteRecord;
}

export default function InstituteCard({ institute }: InstituteCardProps) {
  const programs = getInstitutePrograms(institute.courses_offered).slice(0, 5);
  const path = institutePath(institute);
  const canApply = institute.applications_enabled === true;

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.055)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_46px_rgba(0,115,230,0.12)]">
      <div className="relative aspect-[2.63/1] overflow-hidden bg-slate-100">
        <Link to={path} aria-label={`View ${institute.name}`} className="absolute inset-0 z-10">
          <InstituteImage
            source={institute.cover_image_url}
            alt={`${institute.name} cover`}
            loading="lazy"
            decoding="async"
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.035]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        {institute.institution_category && (
          <span className="absolute left-3 top-3 z-20 rounded-full border border-white/50 bg-white/90 px-3 py-1 text-[11px] font-extrabold capitalize text-slate-700 shadow-sm backdrop-blur">
            {formatInstituteCategory(institute.institution_category)}
          </span>
        )}
        {institute.is_featured && (
          <span className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/40 bg-blue-700 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Featured
          </span>
        )}
        {canApply && (
          <Link
            to={`${path}?apply=1`}
            className="absolute bottom-3 right-3 z-20 rounded-full border border-white/50 bg-[#0073e6] px-4 py-2 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#0062c4] active:scale-95"
          >
            Apply now
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start gap-2">
          <Link
            to={path}
            className="min-w-0 flex-1 text-[17px] font-extrabold leading-snug tracking-[-0.015em] text-slate-900 transition group-hover:text-[#0073e6]"
          >
            {institute.name}
          </Link>
          {institute.payment_verified && (
            <span title="Paid and verified" aria-label="Paid and verified" className="mt-0.5 shrink-0 text-[#0073e6]">
              <BadgeCheck className="h-5 w-5 fill-blue-50" />
            </span>
          )}
        </div>

        <div className="flex items-start gap-1.5 text-sm font-medium text-slate-500">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{institute.location || "Location available on request"}</span>
        </div>

        {(institute.affiliation || institute.level) && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
            {[institute.affiliation, institute.level].filter(Boolean).join(" • ")}
          </p>
        )}

        <div className="mt-3 flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            <BookOpen className="h-3.5 w-3.5" />
            Programs
          </div>
          {programs.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold leading-relaxed text-slate-600">
              {programs.map((program) => (
                <li key={program.name} className="line-clamp-1 before:mr-1.5 before:text-[#0073e6] before:content-['•']">
                  {program.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-medium text-slate-400">Program details are not available.</p>
          )}
        </div>

        <Link
          to={path}
          className="mt-5 inline-flex w-fit items-center text-xs font-extrabold text-[#0073e6] hover:underline"
        >
          View college details
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>
    </article>
  );
}
