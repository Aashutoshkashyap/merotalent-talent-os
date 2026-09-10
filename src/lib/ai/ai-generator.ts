/**
 * Draft-content helpers for MeroTalent.
 *
 * Provider credentials must never be accepted by, persisted in, or sent from
 * the browser. Drafts are generated only by the authenticated server proxy.
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

async function callLLM(systemPrompt: string, userPrompt: string, module: "college" | "jobs" | "mentor" | "events"): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sign in again before generating an AI draft.");
  const response = await fetch("/api/v1/ai/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ module, title: "Content draft", context: `${systemPrompt}\n${userPrompt}` }),
  });
  const payload = await response.json() as { data?: { draft?: string }; error?: { message?: string } };
  if (!response.ok || !payload.data?.draft) throw new Error(payload.error?.message || "AI generation is unavailable.");
  return payload.data.draft;
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

  const raw = await callLLM(systemPrompt, userPrompt, "college");
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  if (typeof parsed.description !== "string") throw new Error("The AI provider returned an invalid institute draft.");
  return { description: parsed.description, courses_offered: Array.isArray(parsed.courses_offered) ? parsed.courses_offered.map(String) : [], contact_phone: typeof parsed.contact_phone === "string" ? parsed.contact_phone : "", contact_email: typeof parsed.contact_email === "string" ? parsed.contact_email : "", website: typeof parsed.website === "string" ? parsed.website : "" };
}

export interface JobAIPayload {
  description: string;
  requirements: string[];
  skills: string[];
}

export async function generateJobDetails(title: string, category: string, location: string, keywords = ""): Promise<JobAIPayload> {
  const systemPrompt = "You are a professional HR recruiter in Nepal. Return ONLY valid JSON: { \"description\": string, \"requirements\": string[], \"skills\": string[] }.";
  const userPrompt = `Generate job posting details for position "${title}" under category "${category}" in "${location}". Key focus: ${keywords}.`;

  const raw = await callLLM(systemPrompt, userPrompt, "jobs");
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  if (typeof parsed.description !== "string") throw new Error("The AI provider returned an invalid job draft.");
  return { description: parsed.description, requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [], skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [] };
}

export interface MentorAIPayload {
  bio: string;
  skills: string[];
  title: string;
}

export async function generateMentorDetails(name: string, category: string, keywords = ""): Promise<MentorAIPayload> {
  const systemPrompt = "You are a executive career coach. Return ONLY valid JSON: { \"bio\": string, \"skills\": string[], \"title\": string }.";
  const userPrompt = `Generate a mentor profile for "${name}" who specializes in "${category}". Focus areas: ${keywords}.`;

  const raw = await callLLM(systemPrompt, userPrompt, "mentor");
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  if (typeof parsed.bio !== "string") throw new Error("The AI provider returned an invalid mentor draft.");
  return { bio: parsed.bio, skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [], title: typeof parsed.title === "string" ? parsed.title : "" };
}

export interface EventAIPayload {
  description: string;
}

export async function generateEventDetails(title: string, format: string, topic = ""): Promise<EventAIPayload> {
  const systemPrompt = "You are an event producer. Return ONLY valid JSON: { \"description\": string }.";
  const userPrompt = `Write an engaging promotional description for event "${title}" in "${format}" format. Core topic: ${topic}.`;

  const raw = await callLLM(systemPrompt, userPrompt, "events");
  const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim());
  if (typeof parsed.description !== "string") throw new Error("The AI provider returned an invalid event draft.");
  return { description: parsed.description };
}

export interface CompanyAIPayload {
  bio: string;
  industry: string;
}

export async function generateCompanyDetails(name: string, type: string): Promise<CompanyAIPayload> {
  void name; void type;
  throw new Error("AI generation is not enabled for companies.");
}

export interface CompetitionAIPayload {
  description: string;
  rules: string;
}

export async function generateCompetitionDetails(title: string, type: string): Promise<CompetitionAIPayload> {
  void title; void type;
  throw new Error("AI generation is not enabled for competitions.");
}

export interface AdAIPayload {
  title: string;
  description: string;
  ctaText: string;
}

export async function generateAdDetails(targetAudience: string, goal: string): Promise<AdAIPayload> {
  void targetAudience; void goal;
  throw new Error("AI generation is not enabled for advertisements.");
}
