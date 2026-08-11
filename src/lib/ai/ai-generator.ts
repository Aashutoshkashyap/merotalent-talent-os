/**
 * Centralized AI Generation Utility for MeroTalent.
 * Supports configurable API key from LocalStorage / Environment with smart fallbacks.
 */

const AI_KEY_STORAGE_KEY = "merotalent_ai_api_key";
const AI_PROVIDER_STORAGE_KEY = "merotalent_ai_provider";

export interface InstituteAIPayload {
  description: string;
  courses_offered: string[];
  contact_phone: string;
  contact_email: string;
  website: string;
}

export function getStoredAIApiKey(): string {
  if (typeof window !== "undefined") {
    const key = localStorage.getItem(AI_KEY_STORAGE_KEY);
    if (key?.trim()) return key.trim();
  }
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  return (
    metaEnv.VITE_OPENAI_API_KEY ||
    metaEnv.VITE_GEMINI_API_KEY ||
    ""
  );
}

export function setStoredAIApiKey(key: string, provider = "openai"): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(AI_KEY_STORAGE_KEY, key.trim());
    localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
  }
}

export function getStoredAIProvider(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(AI_PROVIDER_STORAGE_KEY) || "openai";
  }
  return "openai";
}

/**
 * Generates rich institute details (Description, Courses, Contact Phone, Email, Website)
 * using an AI model or smart structured generation.
 */
export async function generateInstituteDetails(
  name: string,
  type = "engineering",
  location = "Kathmandu, Nepal",
): Promise<InstituteAIPayload> {
  const apiKey = getStoredAIApiKey();

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an academic directory expert for Nepal higher education. Return JSON with format: { description: string, courses_offered: string[], contact_phone: string, contact_email: string, website: string }.",
            },
            {
              role: "user",
              content: `Generate authentic profile information for the academic institution named "${name}" located in "${location}" specializing in "${type}". Return valid JSON matching the schema.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          description: parsed.description || "",
          courses_offered: Array.isArray(parsed.courses_offered) ? parsed.courses_offered : [],
          contact_phone: parsed.contact_phone || "",
          contact_email: parsed.contact_email || "",
          website: parsed.website || "",
        };
      }
    } catch {
      // Fallback to structured generator on API failure
    }
  }

  // Smart structured fallback based on institute category and location
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = `${slug.slice(0, 15)}.edu.np`;

  let courses: string[] = [];
  if (type.includes("engineering")) {
    courses = ["BE Civil Engineering", "BE Computer Engineering", "BE Electronics & Communication", "BE Electrical Engineering", "B.Architecture"];
  } else if (type.includes("management") || type.includes("business")) {
    courses = ["BBA (Bachelor of Business Administration)", "BBM (Bachelor of Business Management)", "BHM (Bachelor of Hotel Management)", "MBA"];
  } else if (type.includes("medical") || type.includes("health")) {
    courses = ["MBBS", "BSc Nursing", "B.Pharmacy", "BPH (Bachelor of Public Health)"];
  } else if (type.includes("it") || type.includes("technology")) {
    courses = ["BSc CSIT", "BCA (Bachelor of Computer Applications)", "BIT (Bachelor of Information Technology)", "BSc (Hons) Computing"];
  } else {
    courses = ["Bachelor of Arts (BA)", "Bachelor of Science (BSc)", "Bachelor of Business Studies (BBS)", "Master of Arts (MA)"];
  }

  const phoneCode = location.toLowerCase().includes("bhaktapur") ? "01-66" : location.toLowerCase().includes("lalitpur") ? "01-55" : "01-44";
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return {
    description: `${name} is a premier educational institution located in ${location}. Known for academic excellence, modern campus facilities, and experienced faculty, the institute prepares students for global careers through practical learning, research initiatives, and strong industry linkages.`,
    courses_offered: courses,
    contact_phone: `+977-${phoneCode}${randomNum}`,
    contact_email: `info@${domain}`,
    website: `https://www.${domain}`,
  };
}

export interface JobAIPayload {
  description: string;
  requirements: string[];
  skills_required: string[];
}

export async function generateJobDetails(title: string, category: string): Promise<JobAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional HR assistant. Return JSON with format: { description: string, requirements: string[], skills_required: string[] }.",
            },
            {
              role: "user",
              content: `Generate job details for a job post with title "${title}" in category "${category}". Provide a 2-3 sentence overview, a list of 4 key requirements, and a list of 4 key skills.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          description: parsed.description || "",
          requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
          skills_required: Array.isArray(parsed.skills_required) ? parsed.skills_required : [],
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    description: `We are looking for a dedicated and talented ${title} to join our growing team. In this role, you will collaborate with cross-functional teams to deliver high-quality solutions, drive innovation, and contribute to the successful execution of our core initiatives.`,
    requirements: [
      "Bachelor's degree in a relevant field or equivalent experience",
      "Proven track record of success in a similar role",
      "Excellent communication and collaborative problem-solving skills",
      "Ability to thrive in a fast-paced, dynamic work environment",
    ],
    skills_required: ["Collaboration", "Problem Solving", "Time Management", title.split(" ")[0] || "Technical Skills"],
  };
}

export interface MentorAIPayload {
  bio: string;
  skills: string[];
  title: string;
}

export async function generateMentorDetails(name: string, category: string): Promise<MentorAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a talent development assistant. Return JSON with format: { bio: string, skills: string[], title: string }.",
            },
            {
              role: "user",
              content: `Generate mentor profile details for "${name}" who is a mentor in "${category}". Return a concise professional bio, a list of 4 key skills, and a professional title/role.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          bio: parsed.bio || "",
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          title: parsed.title || "",
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    bio: `${name} is an experienced mentor in the field of ${category}. With years of industry expertise and a passion for teaching, ${name} has guided numerous professionals and students towards achieving their career goals.`,
    skills: [category, "Mentorship", "Leadership", "Career Guidance"],
    title: `Senior Consultant / Mentor in ${category}`,
  };
}

export interface EventAIPayload {
  description: string;
}

export async function generateEventDetails(title: string, format: string): Promise<EventAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an event coordination assistant. Return JSON with format: { description: string }.",
            },
            {
              role: "user",
              content: `Generate a compelling marketing description for an event titled "${title}" in a "${format}" format.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          description: parsed.description || "",
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    description: `Join us for "${title}"! This ${format} event brings together industry experts, enthusiasts, and learners to connect, share insights, and discuss key trends. Don't miss this opportunity to grow your network and skills.`,
  };
}

export interface CompanyAIPayload {
  bio: string;
  industry: string;
}

export async function generateCompanyDetails(name: string, type: string): Promise<CompanyAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a business writer assistant. Return JSON with format: { bio: string, industry: string }.",
            },
            {
              role: "user",
              content: `Generate company profile information for "${name}" which is a "${type}" company. Provide a concise company bio/mission statement and a specific industry classification.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          bio: parsed.bio || "",
          industry: parsed.industry || type,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    bio: `${name} is an innovative player in the ${type} sector, committed to delivering cutting-edge solutions, exceeding customer expectations, and building sustainable growth in Nepal and beyond.`,
    industry: type,
  };
}

export interface CompetitionAIPayload {
  description: string;
}

export async function generateCompetitionDetails(title: string): Promise<CompetitionAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a competition planning assistant. Return JSON with format: { description: string }.",
            },
            {
              role: "user",
              content: `Generate a detailed marketing and guidelines description for a challenge/competition titled "${title}".`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          description: parsed.description || "",
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    description: `Welcome to "${title}"! Register now to showcase your skills, solve challenging problems, collaborate with peers, and compete for amazing prizes. Open to all qualifying participants.`,
  };
}

export interface AdAIPayload {
  description: string;
}

export async function generateAdDetails(title: string): Promise<AdAIPayload> {
  const apiKey = getStoredAIApiKey();
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a copywriting marketing assistant. Return JSON with format: { description: string }.",
            },
            {
              role: "user",
              content: `Generate a compelling advertisement description / copy for an ad campaign titled "${title}".`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        return {
          description: parsed.description || "",
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    description: `Don't miss out on "${title}"! Click to explore our exclusive offers, find out more about the platform, and take advantage of our services today.`,
  };
}

