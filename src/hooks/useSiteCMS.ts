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

interface PublicSectionVisibility {
  section_key: string;
  display_order: number;
  is_visible: boolean;
}

interface CmsSnapshot {
  sections: PageSection[];
  sectionVisibility: Record<string, PublicSectionVisibility>;
  settings: SiteSettings;
}

const CMS_CACHE_TTL_MS = 5 * 60 * 1000;
const cmsCache = new Map<string, { expiresAt: number; value: CmsSnapshot }>();
const cmsRequests = new Map<string, Promise<CmsSnapshot>>();

const loadCmsSnapshot = (page: string): Promise<CmsSnapshot> => {
  const cached = cmsCache.get(page);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  const pending = cmsRequests.get(page);
  if (pending) return pending;

  const request = (async () => {
    const db = supabase as any;
    const [sectionsRes, visibilityRes, settingsRes] = await Promise.all([
      db.from("page_sections").select("*").eq("page", page).eq("is_visible", true).order("display_order", { ascending: true }),
      db.rpc("get_public_page_section_visibility", { requested_page: page }),
      db.from("site_settings").select("*"),
    ]);
    if (sectionsRes.error) throw sectionsRes.error;

    const visibilityRows = visibilityRes.error ? [] : (visibilityRes.data || []) as PublicSectionVisibility[];
    if (visibilityRes.error) console.error("Failed to load public section visibility:", visibilityRes.error);
    const settings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
    (settingsRes.data || []).forEach((row: { key: string; value: string }) => {
      if (row.key && row.value) settings[row.key] = row.value;
    });
    const value: CmsSnapshot = {
      sections: sectionsRes.data || [],
      sectionVisibility: visibilityRows.reduce((result: Record<string, PublicSectionVisibility>, section) => {
        result[section.section_key] = section;
        return result;
      }, {}),
      settings,
    };
    cmsCache.set(page, { expiresAt: Date.now() + CMS_CACHE_TTL_MS, value });
    return value;
  })().finally(() => cmsRequests.delete(page));

  cmsRequests.set(page, request);
  return request;
};

export function useSiteCMS(page = "home") {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, PublicSectionVisibility>>({});
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCMS() {
      setIsLoading(true);
      try {
        const snapshot = await loadCmsSnapshot(page);
        setSections(snapshot.sections);
        setSectionVisibility(snapshot.sectionVisibility);
        setSettings(snapshot.settings);

          // Dynamically update document title & favicon
          if (snapshot.settings.site_title) {
            document.title = snapshot.settings.site_title;
          }
          if (snapshot.settings.favicon_url) {
            let faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
            if (!faviconLink) {
              faviconLink = document.createElement("link");
              faviconLink.rel = "shortcut icon";
              document.getElementsByTagName("head")[0].appendChild(faviconLink);
            }
            faviconLink.href = snapshot.settings.favicon_url;
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
  const isSectionVisible = (sectionKey: string): boolean => {
    return sectionVisibility[sectionKey]?.is_visible ?? true;
  };
  const hasSectionConfiguration = (sectionKey: string): boolean => {
    return Boolean(sectionVisibility[sectionKey]);
  };

  return {
    sections: pageSections,
    allSections: sections,
    settings,
    getSection,
    getChildSections,
    isSectionVisible,
    hasSectionConfiguration,
    isLoading,
  };
}
