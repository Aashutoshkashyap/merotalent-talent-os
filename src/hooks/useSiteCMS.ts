import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const isNeonStaging = isNeonClientRuntime();

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

export interface PublicSectionVisibility {
  section_key: string;
  display_order: number;
  is_visible: boolean;
}

export interface CmsSnapshot {
  sections: PageSection[];
  sectionVisibility: Record<string, PublicSectionVisibility>;
  settings: SiteSettings;
}

const CMS_CACHE_TTL_MS = 5 * 60 * 1000;
const cmsCache = new Map<string, { expiresAt: number; value: CmsSnapshot }>();
const cmsRequests = new Map<string, Promise<CmsSnapshot>>();

const getStoredCmsSnapshot = (page: string): CmsSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage?.getItem(`merotalent_cms_cache_${page}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.value && typeof parsed.expiresAt === "number") {
      if (parsed.expiresAt > Date.now()) {
        return parsed.value as CmsSnapshot;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
};

const setStoredCmsSnapshot = (page: string, value: CmsSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(
      `merotalent_cms_cache_${page}`,
      JSON.stringify({ expiresAt: Date.now() + CMS_CACHE_TTL_MS, value })
    );
  } catch {
    // Ignore storage write errors
  }
};

export const invalidateCmsCache = (page?: string) => {
  if (page) {
    cmsCache.delete(page);
    try {
      window.localStorage?.removeItem(`merotalent_cms_cache_${page}`);
    } catch {}
  } else {
    cmsCache.clear();
    try {
      Object.keys(window.localStorage || {}).forEach((k) => {
        if (k.startsWith("merotalent_cms_cache_")) {
          window.localStorage.removeItem(k);
        }
      });
    } catch {}
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("merotalent:cms-invalidated", { detail: { page } }));
  }
};

const loadCmsSnapshot = (page: string, force = false): Promise<CmsSnapshot> => {
  if (!force) {
    const cached = cmsCache.get(page) || (() => {
      const stored = getStoredCmsSnapshot(page);
      return stored ? { expiresAt: Date.now() + CMS_CACHE_TTL_MS, value: stored } : null;
    })();
    if (cached && cached.expiresAt > Date.now()) {
      cmsCache.set(page, cached);
      return Promise.resolve(cached.value);
    }
  }
  const pending = cmsRequests.get(page);
  if (pending) return pending;

  const request = (async () => {
    if (isNeonStaging) {
      const response = await fetch(`/api/v1/neon-staging/cms?page=${encodeURIComponent(page)}`,
        { cache: "no-store" });
      if (!response.ok) throw new Error("CMS content is unavailable.");
      const payload = await response.json() as { data?: CmsSnapshot };
      if (!payload.data) throw new Error("CMS content is unavailable.");
      cmsCache.set(page, { expiresAt: Date.now() + CMS_CACHE_TTL_MS, value: payload.data });
      setStoredCmsSnapshot(page, payload.data);
      return payload.data;
    }
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
    setStoredCmsSnapshot(page, value);
    return value;
  })().finally(() => cmsRequests.delete(page));

  cmsRequests.set(page, request);
  return request;
};

export function useSiteCMS(page = "home", serverSnapshot?: CmsSnapshot | null) {
  const initialSnapshot = serverSnapshot || cmsCache.get(page)?.value || getStoredCmsSnapshot(page);
  // The server snapshot is the authoritative first-render state. Seed the
  // request cache synchronously so a stale browser snapshot cannot replace it
  // immediately after hydration and re-introduce a hidden-section flash.
  if (serverSnapshot) {
    cmsCache.set(page, { expiresAt: Date.now() + CMS_CACHE_TTL_MS, value: serverSnapshot });
  }
  const [sections, setSections] = useState<PageSection[]>(initialSnapshot?.sections || []);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, PublicSectionVisibility>>(
    initialSnapshot?.sectionVisibility || {}
  );
  const [settings, setSettings] = useState<SiteSettings>(initialSnapshot?.settings || DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(!initialSnapshot);

  useEffect(() => {
    let isMounted = true;

    async function loadCMS(force = false) {
      if (force) {
        setIsLoading(true);
      }
      try {
        const snapshot = await loadCmsSnapshot(page, force);
        if (!isMounted) return;
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCMS();

    const handleInvalidation = (e: Event) => {
      const customEvent = e as CustomEvent<{ page?: string }>;
      if (!customEvent.detail?.page || customEvent.detail.page === page) {
        void loadCMS(true);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("merotalent:cms-invalidated", handleInvalidation);
    }
    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("merotalent:cms-invalidated", handleInvalidation);
      }
    };
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
