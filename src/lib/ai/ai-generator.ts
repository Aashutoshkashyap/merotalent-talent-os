/**
 * Draft-content helpers for MeroTalent.
 *
 * Provider credentials must never be accepted by, persisted in, or sent from
 * the browser. Until a server-only AI proxy is configured, these helpers use
 * the deterministic fallbacks below.
 */

export interface AIParams {
  title?: string;
  category?: string;
  location?: string;
  type?: string;
  keywords?: string;
  tone?: string;
  notes?: string;
}

async function callLLM(_systemPrompt: string, _userPrompt: string): Promise<string | null> {
  // Deliberately disabled client-side. A future implementation must call an
  // authenticated same-origin server route whose provider key is stored only
  // in the deployment secret manager.
  return null;
}

export interface InstituteAIPayload {
  description: string;
  courses_offered: string[];
  contact_phone: string;
  contact_email: string;
  website: string;
}

export async function generateInstituteDetails(
  name: string,
  type = "engineering",
  location = "Kathmandu, Nepal",
  notes = ""
): Promise<InstituteAIPayload> {
  const systemPrompt = "You are an academic directory expert for Nepal higher education. Return ONLY valid JSON: { \"description\": string, \"courses_offered\": string[], \"contact_phone\": string, \"contact_email\": string, \"website\": string }.";
  const userPrompt = `Generate profile details for academic institution "${name}" in "${location}" specializing in "${type}". Additional notes: ${notes}. Return JSON format only.`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        description: parsed.description || "",
        courses_offered: Array.isArray(parsed.courses_offered) ? parsed.courses_offered : [],
        contact_phone: parsed.contact_phone || "+977-01-4400000",
        contact_email: parsed.contact_email || `info@${name.toLowerCase().replace(/[^a-z]/g, "")}.edu.np`,
        website: parsed.website || `https://${name.toLowerCase().replace(/[^a-z]/g, "")}.edu.np`,
      };
    } catch {}
  }

  return {
    description: `${name} is a leading academic institution located in ${location}, known for delivering high-quality education and research in ${type}.`,
    courses_offered: ["B.Sc. Computer Science & IT", "BE Software Engineering", "Bachelor of Business Administration"],
    contact_phone: "+977-01-4400000",
    contact_email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu.np`,
    website: `https://${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu.np`,
  };
}

export interface JobAIPayload {
  description: string;
  requirements: string[];
  skills: string[];
}

export async function generateJobDetails(title: string, category: string, location: string, keywords = ""): Promise<JobAIPayload> {
  const systemPrompt = "You are a professional HR recruiter in Nepal. Return ONLY valid JSON: { \"description\": string, \"requirements\": string[], \"skills\": string[] }.";
  const userPrompt = `Generate job posting details for position "${title}" under category "${category}" in "${location}". Key focus: ${keywords}.`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        description: parsed.description || "",
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      };
    } catch {}
  }

  return {
    description: `We are seeking an outstanding ${title} to join our team in ${location}. You will drive key initiatives in ${category} and collaborate across teams to deliver high-impact results.`,
    requirements: [
      `3+ years experience in ${category} or related technical field`,
      "Strong problem-solving and analytical capabilities",
      "Excellent teamwork and communication skills",
    ],
    skills: [category, "Problem Solving", "Teamwork", "Agile Workflow"],
  };
}

export interface MentorAIPayload {
  bio: string;
  skills: string[];
  title: string;
}

export async function generateMentorDetails(name: string, category: string, keywords = ""): Promise<MentorAIPayload> {
  const systemPrompt = "You are a executive career coach. Return ONLY valid JSON: { \"bio\": string, \"skills\": string[], \"title\": string }.";
  const userPrompt = `Generate a mentor profile for "${name}" who specializes in "${category}". Focus areas: ${keywords}.`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        bio: parsed.bio || "",
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        title: parsed.title || "",
      };
    } catch {}
  }

  return {
    bio: `${name} is an accomplished mentor in ${category}. Passionate about helping students and young professionals navigate industry challenges and build successful careers.`,
    skills: [category, "Career Growth", "Technical Leadership", "1-on-1 Coaching"],
    title: `Senior Consultant & Mentor in ${category}`,
  };
}

export interface EventAIPayload {
  description: string;
}

export async function generateEventDetails(title: string, format: string, topic = ""): Promise<EventAIPayload> {
  const systemPrompt = "You are an event producer. Return ONLY valid JSON: { \"description\": string }.";
  const userPrompt = `Write an engaging promotional description for event "${title}" in "${format}" format. Core topic: ${topic}.`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return { description: parsed.description || "" };
    } catch {}
  }

  return {
    description: `Join us for "${title}"! This ${format} session brings together top industry experts to explore ${topic || "cutting-edge skills and career pathways"}.`,
  };
}

export interface CompanyAIPayload {
  bio: string;
  industry: string;
}

export async function generateCompanyDetails(name: string, type: string): Promise<CompanyAIPayload> {
  const systemPrompt = "You are a business writer. Return ONLY valid JSON: { \"bio\": string, \"industry\": string }.";
  const userPrompt = `Generate company overview for "${name}" operating in "${type}".`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return { bio: parsed.bio || "", industry: parsed.industry || type };
    } catch {}
  }

  return {
    bio: `${name} is a leading organization in ${type}, delivering innovative solutions and empowering talent across Nepal.`,
    industry: type,
  };
}

export interface CompetitionAIPayload {
  description: string;
  rules: string;
}

export async function generateCompetitionDetails(title: string, type: string): Promise<CompetitionAIPayload> {
  const systemPrompt = "You are a hackathon coordinator. Return ONLY valid JSON: { \"description\": string, \"rules\": string }.";
  const userPrompt = `Generate competition overview and rules for "${title}" (${type}).`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return { description: parsed.description || "", rules: parsed.rules || "" };
    } catch {}
  }

  return {
    description: `Challenge your skills in "${title}"! Compete with top talent across Nepal for prizes, mentorship, and career recognition.`,
    rules: "1. Original submissions only.\n2. Respect submission deadlines.\n3. Team size 1-4 members.",
  };
}

export interface AdAIPayload {
  title: string;
  description: string;
  ctaText: string;
}

export async function generateAdDetails(targetAudience: string, goal: string): Promise<AdAIPayload> {
  const systemPrompt = "You are a digital advertising copywriter. Return ONLY valid JSON: { \"title\": string, \"description\": string, \"ctaText\": string }.";
  const userPrompt = `Write ad banner copy for target audience "${targetAudience}" with goal "${goal}".`;

  const raw = await callLLM(systemPrompt, userPrompt);
  if (raw) {
    try {
      const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        title: parsed.title || "",
        description: parsed.description || "",
        ctaText: parsed.ctaText || "Learn More",
      };
    } catch {}
  }

  return {
    title: "Accelerate Your Future with MeroTalent",
    description: "Connect with leading colleges, top engineering employers, and expert mentors today.",
    ctaText: "Explore Opportunities",
  };
}
