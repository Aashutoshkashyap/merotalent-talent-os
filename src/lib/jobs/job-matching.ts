export interface JobPreferences {
  preferred_categories?: string[];
  preferred_industries?: string[];
  preferred_job_titles?: string[];
  preferred_locations?: string[];
  preferred_job_levels?: string[];
  preferred_job_types?: string[];
  min_salary?: number | null;
  max_salary?: number | null;
  is_salary_negotiable?: boolean;
}

export interface CandidateProfileForMatching {
  skills?: string[];
  location?: string | null;
  experience_level?: string | null;
  job_preferences?: JobPreferences | null;
}

export interface JobForMatching {
  id: string;
  title: string;
  category?: string | null;
  industry?: string | null;
  location?: string | null;
  is_remote?: boolean | null;
  job_type?: string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  skills_required?: string[] | null;
}

export interface JobMatchResult {
  matchScore: number;
  matchReasons: string[];
}

/**
 * Deterministic rule-based matching engine.
 * Calculates score (0–100%) and generates understandable match reasons.
 */
export function calculateJobMatch(
  candidate: CandidateProfileForMatching,
  job: JobForMatching
): JobMatchResult {
  let score = 0;
  const reasons: string[] = [];

  const candidateSkills = new Set(
    (candidate.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const requiredSkills = (job.skills_required || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // 1. Skill Match (Max 40 points)
  if (requiredSkills.length > 0) {
    const matchedCount = requiredSkills.filter((s) => candidateSkills.has(s)).length;
    const skillRatio = matchedCount / requiredSkills.length;
    const skillPoints = Math.round(skillRatio * 40);
    score += skillPoints;

    if (matchedCount > 0) {
      reasons.push(`Matched ${matchedCount}/${requiredSkills.length} required skill${requiredSkills.length > 1 ? "s" : ""}`);
    }
  } else if (candidateSkills.size > 0) {
    // If job has no specific skills listed, grant baseline skill credit
    score += 20;
  }

  const prefs = candidate.job_preferences || {};
  const prefTitles = (prefs.preferred_job_titles || []).map((t) => t.toLowerCase());
  const prefCategories = (prefs.preferred_categories || []).map((c) => c.toLowerCase());
  const prefIndustries = (prefs.preferred_industries || []).map((i) => i.toLowerCase());
  const prefLocations = (prefs.preferred_locations || []).map((l) => l.toLowerCase());
  const prefLevels = (prefs.preferred_job_levels || []).map((l) => l.toLowerCase());
  const prefTypes = (prefs.preferred_job_types || []).map((t) => t.toLowerCase());

  // 2. Title & Category Match (Max 25 points)
  const jobTitleLower = (job.title || "").toLowerCase();
  const jobCategoryLower = (job.category || "").toLowerCase();

  const titleMatch = prefTitles.some((t) => jobTitleLower.includes(t) || t.includes(jobTitleLower));
  const categoryMatch = jobCategoryLower && prefCategories.some((c) => jobCategoryLower.includes(c) || c.includes(jobCategoryLower));

  if (titleMatch) {
    score += 20;
    reasons.push("Matches your preferred job title");
  } else if (categoryMatch) {
    score += 15;
    reasons.push("Matches your preferred job category");
  }

  // 3. Industry Match (Max 15 points)
  const jobIndustryLower = (job.industry || "").toLowerCase();
  if (jobIndustryLower && prefIndustries.some((i) => jobIndustryLower.includes(i) || i.includes(jobIndustryLower))) {
    score += 15;
    reasons.push("Matches your preferred industry");
  }

  // 4. Location Match & Remote (Max 10 points)
  const jobLocLower = (job.location || "").toLowerCase();
  const candidateLocLower = (candidate.location || "").toLowerCase();
  const locationMatch =
    (job.is_remote && (prefLocations.includes("remote") || prefLocations.length === 0)) ||
    (jobLocLower && prefLocations.some((l) => jobLocLower.includes(l) || l.includes(jobLocLower))) ||
    (jobLocLower && candidateLocLower && (jobLocLower.includes(candidateLocLower) || candidateLocLower.includes(jobLocLower)));

  if (locationMatch) {
    score += 10;
    reasons.push(job.is_remote ? "Remote work available" : "Matches your preferred location");
  }

  // 5. Level & Type Match (Max 10 points)
  const jobLevelLower = (job.experience_level || "").toLowerCase();
  const candidateLevelLower = (candidate.experience_level || "").toLowerCase();
  const jobTypeLower = (job.job_type || "").toLowerCase().replace(/[_-]/g, " ");

  const levelMatch =
    (jobLevelLower && prefLevels.some((l) => jobLevelLower.includes(l) || l.includes(jobLevelLower))) ||
    (jobLevelLower && candidateLevelLower && jobLevelLower === candidateLevelLower);

  const typeMatch = jobTypeLower && prefTypes.some((t) => jobTypeLower.includes(t.toLowerCase()) || t.toLowerCase().includes(jobTypeLower));

  if (levelMatch) {
    score += 5;
    reasons.push("Matches your experience level");
  }
  if (typeMatch) {
    score += 5;
    reasons.push("Matches your preferred job type");
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    matchScore: finalScore,
    matchReasons: reasons.slice(0, 3),
  };
}
