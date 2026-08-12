import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PageSection {
  id: string;
  parent_id?: string | null;
  section_key: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  image_alt: string | null;
  cta_label: string | null;
  cta_url: string | null;
  display_order: number;
  is_visible: boolean;
  page: string;
}

export interface SiteSettings {
  site_title?: string;
  favicon_url?: string;
  logo_url?: string;
  meta_description?: string;
  contact_email?: string;
  contact_phone?: string;
  [key: string]: string | undefined;
}

export function useSiteCMS(page = "home") {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    site_title: "MeroTalent - Higher Education & Career OS",
    meta_description: "Connect with top colleges, mentors, jobs, and competitions across Nepal.",
    contact_email: "support@merotalent.com",
    contact_phone: "+977-01-4400000",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCMS() {
      setIsLoading(true);
      try {
        const db = supabase as any;
        const [sectionsRes, settingsRes] = await Promise.all([
          db.from("page_sections").select("*").eq("is_visible", true).order("display_order", { ascending: true }),
          db.from("site_settings").select("*"),
        ]);

        if (sectionsRes.data) {
          setSections(sectionsRes.data);
        }

        if (settingsRes.data && settingsRes.data.length > 0) {
          const settingsObj: SiteSettings = {};
          settingsRes.data.forEach((row: { key: string; value: string }) => {
            if (row.key && row.value) {
              settingsObj[row.key] = row.value;
            }
          });
          setSettings((prev) => ({ ...prev, ...settingsObj }));

          // Dynamically update document title & favicon
          if (settingsObj.site_title) {
            document.title = settingsObj.site_title;
          }
          if (settingsObj.favicon_url) {
            let faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
            if (!faviconLink) {
              faviconLink = document.createElement("link");
              faviconLink.rel = "shortcut icon";
              document.getElementsByTagName("head")[0].appendChild(faviconLink);
            }
            faviconLink.href = settingsObj.favicon_url;
          }
        }
      } catch (err) {
        console.error("Failed to load CMS content:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCMS();
  }, [page]);

  const getSection = (sectionKey: string): PageSection | undefined => {
    return sections.find((s) => s.section_key === sectionKey);
  };

  const pageSections = sections.filter((s) => s.page === page);

  return {
    sections: pageSections,
    allSections: sections,
    settings,
    getSection,
    isLoading,
  };
}
