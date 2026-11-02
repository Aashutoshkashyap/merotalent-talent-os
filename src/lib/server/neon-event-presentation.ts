import { z } from "zod";
import { withTransaction } from "./db";
import { assertRoleWorkspaceIdentity, requireRoleWorkspaceAccess } from "./neon-role-workspaces";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { assertMediaObjectPath } from "./media-policy";
import { headObject } from "./storage";
import { publicObjectUrl } from "./application-storage";
const presentationSchema = z.object({ cover_image_url: z.string().max(2048).nullable(), logo_url: z.string().max(2048).nullable(),
  gallery_urls: z.array(z.string().max(2048)).max(10), contact_email: z.string().email().max(254).nullable(),
  contact_phone: z.string().trim().regex(/^[+\d ()-]{5,30}$/).nullable() }).strict();
type Presentation = z.infer<typeof presentationSchema>;
export async function eventPresentation(actor: NeonActor, eventId: string, raw?: unknown, run = withTransaction) {
  z.string().uuid().parse(eventId);
  const payload = raw === undefined ? undefined : presentationSchema.parse(raw);
  return run(async db => {
    await assertRoleWorkspaceIdentity(db, actor);
    await requireRoleWorkspaceAccess(db, actor, "events", "event", eventId, "event_management");
    const row = (await db.query<Presentation>(`SELECT cover_image_url,logo_url,gallery_urls,contact_email,contact_phone
      FROM public.events WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [eventId])).rows[0];
    if (!row) throw new NeonAuthorizationError(404, "EVENT_UNAVAILABLE", "Event unavailable.");
    if (!payload) return row;
    const old = [row.cover_image_url, row.logo_url, ...row.gallery_urls].filter(Boolean);
    const images = [payload.cover_image_url, payload.logo_url, ...payload.gallery_urls].filter(Boolean);
    if (JSON.stringify([row.cover_image_url, row.logo_url, row.gallery_urls]) !== JSON.stringify([payload.cover_image_url, payload.logo_url, payload.gallery_urls]))
      await requireRoleWorkspaceAccess(db, actor, "events", "event", eventId, "media_management");
    for (const path of new Set(images)) {
      if (old.includes(path)) continue;
      assertMediaObjectPath({ module: "event_cover", resourceId: eventId, path }, actor.userId);
      const own = (await db.query(`SELECT id FROM public.media_upload_intents WHERE user_id=$1::uuid
        AND resource_id=$2::uuid AND module='event_cover' AND object_path=$3 FOR SHARE`, [actor.userId, eventId, path])).rowCount;
      const object = own ? await headObject("event-media", path) : null;
      if (!object || !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(object.contentType ?? "") ||
        !object.contentLength || object.contentLength > 8 * 1024 * 1024) throw new NeonAuthorizationError(403, "MEDIA_NOT_OWNED", "Use a validated image uploaded for this event.");
    }
    await db.query(`UPDATE public.events SET cover_image_url=$2,logo_url=$3,gallery_urls=$4::text[],contact_email=$5,contact_phone=$6,
      updated_at=now() WHERE id=$1::uuid`, [eventId, payload.cover_image_url, payload.logo_url, payload.gallery_urls, payload.contact_email, payload.contact_phone]);
    await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'save_event_presentation','events',$2,'{"public_presentation":true}'::jsonb)`, [actor.userId, eventId]);
    return payload;
  });
}

/** Call only after the repository's published-event or owned-ticket predicate. No private bucket is signed. */
export async function resolvePublicEventImages<T extends { cover_image_url?: string | null; logo_url?: string | null; gallery_urls?: string[] }>(event: T,
  sign: typeof publicObjectUrl = publicObjectUrl): Promise<T> {
  const resolve = async (value?: string | null) => {
    if (!value) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return null;
    let path = value;
    if (/^https?:\/\//i.test(value)) {
      try { const url = new URL(value);
        if (url.hostname === "dtirpilgzlsfryucanlg.supabase.co" && url.pathname.startsWith("/storage/v1/object/public/event-media/"))
          path = decodeURIComponent(url.pathname.slice("/storage/v1/object/public/event-media/".length));
        else return url.protocol === "https:" && !url.username && !url.password ? value : null;
      } catch { return null; }
    }
    try { return await sign("event_cover", path); } catch { return null; }
  };
  const [cover, logo, gallery] = await Promise.all([resolve(event.cover_image_url), resolve(event.logo_url), Promise.all((event.gallery_urls ?? []).slice(0, 10).map(resolve))]);
  return { ...event, cover_image_url: cover, logo_url: logo, gallery_urls: gallery.filter((url): url is string => !!url) };
}
