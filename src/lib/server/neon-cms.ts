/** Shared CMS reads and scoped Super Admin writes for the isolated Neon runtime. */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { type NeonActor, NeonAuthorizationError, requireSuperAdmin } from "./neon-authorization";
import type { CmsSnapshot, PageSection, PublicSectionVisibility } from "@/hooks/useSiteCMS";

const pages = ["home", "faq", "about", "contact", "pricing", "explore", "header_footer"] as const;
const siteKeys = ["site_title", "favicon_url", "logo_url", "meta_description", "contact_email",
  "contact_phone", "contact_address", "facebook_url", "twitter_url", "linkedin_url",
  "instagram_url", "support_email", "support_phone", "banner_url", "maintenance_mode"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicFields = `id,parent_id,section_key,title,subtitle,body,image_url,image_alt,
  cta_label,cta_url,display_order,is_visible,page,extra_data`;
const adminFields = `${publicFields},updated_at`;
type Row = QueryResultRow & PageSection & { updated_at?: string };
type Query = typeof queryRows;

export function parseCmsPage(value: string | null): string {
  if (!value || !pages.includes(value as typeof pages[number])) {
    throw new NeonAuthorizationError(400, "INVALID_CMS_PAGE", "Choose a supported CMS page.");
  }
  return value;
}

function safeUrl(value: string, allowRelative = true) {
  if (!value) return true;
  if (allowRelative && value.startsWith("/") && !value.startsWith("//") && !/[\u0000-\u001f]/.test(value)) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && Boolean(url.hostname);
  } catch { return false; }
}

export async function readPublicCms(page: string, query: Query = queryRows): Promise<CmsSnapshot> {
  const selected = parseCmsPage(page);
  const [sections, visibility, settingsRows] = await Promise.all([
    query<Row>(`SELECT ${publicFields} FROM public.page_sections
      WHERE page=$1 AND is_visible=true
        AND (parent_id IS NULL OR EXISTS (SELECT 1 FROM public.page_sections parent
          WHERE parent.id=page_sections.parent_id AND parent.is_visible=true))
      ORDER BY display_order,id`, [selected]),
    query<PublicSectionVisibility & QueryResultRow>(`SELECT section_key,display_order,is_visible
      FROM public.page_sections WHERE page=$1 AND parent_id IS NULL ORDER BY display_order,id`, [selected]),
    query<{ key: string; value: string | null } & QueryResultRow>(`SELECT key,value FROM public.site_settings
      WHERE key=ANY($1::text[])`, [[...siteKeys]]),
  ]);
  const settings: Record<string, string> = {};
  for (const row of settingsRows) if (row.value != null) settings[row.key] = row.value;
  return { sections, sectionVisibility: Object.fromEntries(visibility.map(row => [row.section_key, row])), settings };
}

export async function readAdminCms(actor: NeonActor, query: Query = queryRows) {
  requireSuperAdmin(actor);
  return query<Row>(`SELECT ${adminFields} FROM public.page_sections ORDER BY page,display_order,id`, []);
}

export async function readAdminSiteSettings(actor: NeonActor, query: Query = queryRows) {
  requireSuperAdmin(actor);
  return query<{ key: string; value: string | null } & QueryResultRow>(`SELECT key,value
    FROM public.site_settings WHERE key=ANY($1::text[]) ORDER BY key`, [[...siteKeys]]);
}

export function parseSiteSettings(value: unknown): Array<{ key: string; value: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NeonAuthorizationError(400, "INVALID_SITE_SETTINGS", "Invalid site settings.");
  }
  const entries = Object.entries(value);
  if (!entries.length || entries.length > siteKeys.length) {
    throw new NeonAuthorizationError(400, "INVALID_SITE_SETTINGS", "Invalid site settings.");
  }
  return entries.map(([key, item]) => {
    if (!siteKeys.includes(key as typeof siteKeys[number]) || typeof item !== "string" || item.length > 2000 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item) ||
      ((key.endsWith("_url") || key === "banner_url") && !safeUrl(item)) ||
      (key === "maintenance_mode" && !["true", "false"].includes(item))) {
      throw new NeonAuthorizationError(400, "INVALID_SITE_SETTINGS", `Invalid ${key} setting.`);
    }
    return { key, value: item.trim() };
  });
}

async function recheckAdmin(client: PoolClient, actor: NeonActor) {
  requireSuperAdmin(actor);
  const admin = await client.query(`SELECT p.user_id FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id=p.user_id
    WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
      AND ur.role IN ('admin','super_admin') LIMIT 1 FOR SHARE OF p`, [actor.userId]);
  if (!admin.rowCount) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
}

export async function saveAdminSiteSettings(actor: NeonActor, value: unknown,
  run: typeof withTransaction = withTransaction) {
  requireSuperAdmin(actor);
  const entries = parseSiteSettings(value);
  return run(async client => {
    await recheckAdmin(client, actor);
    for (const { key, value: setting } of entries) {
      await client.query(`INSERT INTO public.site_settings(key,value,updated_at) VALUES ($1,$2,now())
        ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`, [key, setting]);
    }
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'admin_update_site_settings','site_settings','platform',
        jsonb_build_object('keys',$2::text[]))`, [actor.userId, entries.map(entry => entry.key)]);
    return entries;
  });
}

function text(value: unknown, field: string, required = false): string | null {
  if (value == null || value === "") {
    if (required) throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", `${field} is required.`);
    return null;
  }
  if (typeof value !== "string" || value.length > (field === "body" ? 20_000 : 2_000) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", `Invalid ${field}.`);
  }
  return value.trim();
}

export function parseSection(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", "Invalid CMS section.");
  }
  const row = value as Record<string, unknown>;
  const page = parseCmsPage(typeof row.page === "string" ? row.page : null);
  const sectionKey = text(row.section_key, "section_key", true)!;
  const title = text(row.title, "title", true)!;
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(sectionKey) || title.length > 250 ||
      (row.parent_id != null && (typeof row.parent_id !== "string" || !uuid.test(row.parent_id))) ||
      typeof row.display_order !== "number" || !Number.isInteger(row.display_order) ||
      row.display_order < -10_000 || row.display_order > 10_000 || typeof row.is_visible !== "boolean") {
    throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", "Invalid CMS section fields.");
  }
  const imageUrl = text(row.image_url, "image_url");
  const ctaUrl = text(row.cta_url, "cta_url");
  if ((imageUrl && !safeUrl(imageUrl)) || (ctaUrl && !safeUrl(ctaUrl))) {
    throw new NeonAuthorizationError(400, "INVALID_CMS_URL", "CMS links must use a safe URL.");
  }
  return { page, sectionKey, title, parentId: row.parent_id ?? null,
    subtitle: text(row.subtitle, "subtitle"), body: text(row.body, "body"),
    imageUrl, imageAlt: text(row.image_alt, "image_alt"),
    ctaLabel: text(row.cta_label, "cta_label"), ctaUrl,
    displayOrder: row.display_order, visible: row.is_visible };
}

export async function saveAdminSection(actor: NeonActor, value: unknown, id?: string,
  run: typeof withTransaction = withTransaction) {
  requireSuperAdmin(actor);
  if (id && !uuid.test(id)) throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", "Invalid section ID.");
  const row = parseSection(value);
  return run(async client => {
    await recheckAdmin(client, actor);
    if (row.parentId) {
      const parent = await client.query(`SELECT id,page FROM public.page_sections WHERE id=$1::uuid
        AND parent_id IS NULL LIMIT 1`, [row.parentId]);
      if (!parent.rows[0] || parent.rows[0].page !== row.page || row.parentId === id) {
        throw new NeonAuthorizationError(400, "INVALID_CMS_PARENT", "Choose a parent on the same page.");
      }
    }
    const values = [row.page,row.sectionKey,row.title,row.parentId,row.subtitle,row.body,row.imageUrl,
      row.imageAlt,row.ctaLabel,row.ctaUrl,row.displayOrder,row.visible];
    const columns = `page=$1,section_key=$2,title=$3,parent_id=$4::uuid,subtitle=$5,body=$6,
      image_url=$7,image_alt=$8,cta_label=$9,cta_url=$10,display_order=$11,is_visible=$12,updated_at=now()`;
    const result = id
      ? await client.query<Row>(`UPDATE public.page_sections SET ${columns} WHERE id=$13::uuid
          RETURNING ${adminFields}`, [...values,id])
      : await client.query<Row>(`INSERT INTO public.page_sections
          (page,section_key,title,parent_id,subtitle,body,image_url,image_alt,cta_label,cta_url,
           display_order,is_visible)
          VALUES ($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${adminFields}`, values);
    if (!result.rows[0]) throw new NeonAuthorizationError(404, "CMS_SECTION_NOT_FOUND", "Section not found.");
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,$2,'page_section',$3::text,jsonb_build_object('page',$4::text,'section_key',$5::text))`,
    [actor.userId, id ? "admin_update_page_section" : "admin_create_page_section",
      result.rows[0].id, row.page, row.sectionKey]);
    return result.rows[0];
  });
}

export async function deleteAdminSection(actor: NeonActor, id: string,
  run: typeof withTransaction = withTransaction) {
  requireSuperAdmin(actor);
  if (!uuid.test(id)) throw new NeonAuthorizationError(400, "INVALID_CMS_SECTION", "Invalid section ID.");
  return run(async client => {
    await recheckAdmin(client, actor);
    const result = await client.query<{ id: string; page: string }>(`DELETE FROM public.page_sections
      WHERE id=$1::uuid RETURNING id,page`, [id]);
    if (!result.rows[0]) throw new NeonAuthorizationError(404, "CMS_SECTION_NOT_FOUND", "Section not found.");
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'admin_delete_page_section','page_section',$2::text,
        jsonb_build_object('page',$3::text))`, [actor.userId,id,result.rows[0].page]);
    return result.rows[0];
  });
}
