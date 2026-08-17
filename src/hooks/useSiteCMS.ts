import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: "MeroTalent",
  favicon_url: "",
  logo_url: "",
  meta_description: "Discover colleges, mentors, jobs, events, and partner courses across Nepal.",
  contact_email: "",
  contact_phone: "",
};

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
  extra_data?: Record<string, unknown> | null;
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
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
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

        if (sectionsRes.data && sectionsRes.data.length > 0) {
          setSections(sectionsRes.data);
        } else setSections([]);

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

  const pageSections = sections.filter((s) => s.page === page);
  const getSection = (sectionKey: string): PageSection | undefined => {
    return pageSections.find((section) => section.section_key === sectionKey && !section.parent_id);
  };
  const getChildSections = (sectionOrKey: PageSection | string): PageSection[] => {
    const parent = typeof sectionOrKey === "string" ? getSection(sectionOrKey) : sectionOrKey;
    if (!parent) return [];
    return pageSections
      .filter((section) => section.parent_id === parent.id)
      .sort((a, b) => a.display_order - b.display_order);
  };

  return {
    sections: pageSections,
    allSections: sections,
    settings,
    getSection,
    getChildSections,
    isLoading,
  };
}
