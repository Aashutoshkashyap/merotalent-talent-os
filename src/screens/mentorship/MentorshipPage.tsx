"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Users, Clock, ArrowRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BookingDialog from "@/components/mentors/BookingDialog";

interface MentorItem {
  id: string;
  name: string;
  category: string;
  bio: string;
  experience: string;
  hourlyRate: string;
  hourlyRateAmount: number;
  expertise: string[];
  rating: string;
  avatarText: string;
  photoUrl: string;
  sessions: string;
}

/* ── map a database row to the UI model ── */
function toDisplayItem(row: Record<string, unknown>): MentorItem {
  const profiles = (row.profiles ?? {}) as Record<string, unknown>;
  const name = String(profiles.full_name ?? row.full_name ?? "Mentor");
  const avatarText = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const expertise = Array.isArray(row.expertise) ? row.expertise : [];
  const category =
    expertise.length > 0
      ? String(expertise[0])
      : String(row.specialization ?? "General");

  return {
    id: String(row.id),
    name,
    category,
    bio: String(row.headline ?? row.description ?? ""),
    experience: row.years_experience ? `${row.years_experience}+ Years` : "",
    hourlyRate: row.hourly_rate ? `NPR ${Number(row.hourly_rate).toLocaleString()}` : "",
    hourlyRateAmount: Number(row.hourly_rate ?? 0),
    expertise: expertise.map(String),
    rating: row.rating == null ? "—" : String(row.rating),
    avatarText,
    photoUrl: String(row.profile_image_url ?? "/placeholder.svg"),
    sessions: row.total_sessions ? `${row.total_sessions}+` : "0",
  };
}

export default function MentorshipPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Areas");
  const [selectedMentor, setSelectedMentor] = useState<MentorItem | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("mentors")
        .select("*")
        .eq("approval_status", "approved")
        .eq("is_available", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const userIds = (data || []).map((mentor: Record<string, unknown>) => String(mentor.user_id));
      const { data: profiles, error: profilesError } = userIds.length > 0
        ? await (supabase as any)
            .from("public_profile_directory")
            .select("user_id, full_name, avatar_url, bio, location")
            .in("user_id", userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const profileByUser = new Map<string, Record<string, unknown>>(
        (profiles || []).map((profile: Record<string, unknown>) => [String(profile.user_id), profile]),
      );
      setMentors((data || []).map((mentor: Record<string, unknown>) => {
        const profile = profileByUser.get(String(mentor.user_id)) || {};
        return toDisplayItem({
          ...mentor,
          profiles: profile,
          description: mentor.description || profile.bio,
          profile_image_url: mentor.profile_image_url || profile.avatar_url,
        });
      }));
      setLoadError(null);
    } catch (error) {
      setMentors([]);
      setLoadError(error instanceof Error ? error.message : "Mentors could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── derive categories from loaded data ── */
  const categoryMap = new Map<string, number>();
  mentors.forEach((m) => {
    categoryMap.set(m.category, (categoryMap.get(m.category) ?? 0) + 1);
  });
  const categories = [
    { label: "All Areas", count: String(mentors.length) },
    ...Array.from(categoryMap.entries()).map(([label, count]) => ({
      label,
      count: String(count),
    })),
  ];

  const filtered =
    selectedCategory === "All Areas"
      ? mentors
      : mentors.filter((m) =>
          m.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase())
        );

  return (
    <PublicPageLayout activeNavId="mentors">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Academic & Industry Mentors
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Certified academic advisors and tech mentors ready to guide you in Nepal.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top categories</span>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(c.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-extrabold transition-all ${
                  selectedCategory === c.label
                    ? "bg-[#0073e6] border-[#0073e6] text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">
            {isLoading ? "Loading…" : `Verified Mentors (${filtered.length})`}
          </span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Highest Rated</option>
            <option>Experience</option>
          </select>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Image header */}
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover grayscale brightness-95 group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white truncate max-w-[140px]">
                  {item.category}
                </span>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] text-yellow-400 font-extrabold bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.experience}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {item.bio}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-black text-[#0073e6] flex-shrink-0">
                    {item.avatarText}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.sessions} Sessions</span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{item.hourlyRate} / Session</span>
                  </div>
                </div>
                {user ? (
                  <button
                    type="button"
                    aria-label={`Book a session with ${item.name}`}
                    onClick={() => setSelectedMentor(item)}
                    className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link to="/login" aria-label={`Sign in to book ${item.name}`} className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <p className="font-bold text-slate-700">No approved mentors found</p>
            <p className="mt-1 text-xs text-slate-500">
              {loadError || "Approved mentor profiles created in Admin will appear here automatically."}
            </p>
          </div>
        )}
        {selectedMentor && (
          <BookingDialog
            isOpen
            onClose={() => setSelectedMentor(null)}
            mentor={{
              id: selectedMentor.id,
              name: selectedMentor.name,
              hourlyRate: selectedMentor.hourlyRateAmount,
              expertise: selectedMentor.expertise,
            }}
          />
        )}
      </div>
    </PublicPageLayout>
  );
}
