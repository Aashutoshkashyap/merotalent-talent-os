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
