/**
 * Neon staging College / Institute repository.
 * Enforces active profiles, verified identity links, and exact role/entity grants.
 */
import type { QueryResultRow } from "pg";
import { queryRows } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  requireEntityAccess,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";

export interface PublicInstituteSummary extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  updated_at: Date;
}

export interface CollegeLeadRow extends QueryResultRow {
  id: string;
  college_id: string;
  user_id: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  course_interest: string | null;
  status: string;
  created_at: Date;
}

export class NeonCollegesRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listPublicInstitutes(params: {
    search?: string;
    location?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PublicInstituteSummary[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const searchFilter = params.search?.trim() ? `%${params.search.trim().toLowerCase()}%` : null;
    const locationFilter = params.location?.trim() ? `%${params.location.trim().toLowerCase()}%` : null;

    return this.db.query<PublicInstituteSummary>(`
      SELECT id, name, description, location, status, logo_url, cover_image_url, updated_at
      FROM public.institutes
      WHERE status = 'approved' AND deleted_at IS NULL
        AND ($1::text IS NULL OR lower(name) LIKE $1 OR lower(description) LIKE $1)
        AND ($2::text IS NULL OR lower(location) LIKE $2)
      ORDER BY name ASC
      LIMIT $3 OFFSET $4`, [searchFilter, locationFilter, limit, offset]);
  }

  async getPublicInstitute(id: string): Promise<PublicInstituteSummary | null> {
    const rows = await this.db.query<PublicInstituteSummary>(`
      SELECT id, name, description, location, status, logo_url, cover_image_url, updated_at
      FROM public.institutes
      WHERE id = $1::uuid AND status = 'approved' AND deleted_at IS NULL
      LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async getManagedInstitute(actor: NeonActor, id: string): Promise<PublicInstituteSummary | null> {
    await requireEntityAccess(actor, "college", "college", id, "profile_editing", this.db);
    const rows = await this.db.query<PublicInstituteSummary>(`
      SELECT id, name, description, location, status, logo_url, cover_image_url, updated_at
      FROM public.institutes
      WHERE id = $1::uuid AND deleted_at IS NULL
      LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async listCollegeLeads(actor: NeonActor, collegeId: string): Promise<CollegeLeadRow[]> {
    await requireEntityAccess(actor, "college", "college", collegeId, "leads_viewing", this.db);
    return this.db.query<CollegeLeadRow>(`
      SELECT id, college_id, user_id, applicant_name, applicant_email, applicant_phone, course_interest, status, created_at
      FROM public.leads
      WHERE college_id = $1::uuid AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100`, [collegeId]);
  }
}
