# Isolated Neon staging storage bucket reconciliation — 2026-10-08

Source bucket metadata came from a read-only `storage.buckets` query. Target existence and objects came from staging S3 list/read reconciliation. No source or production-storage write occurred. Target bucket access levels were inspected earlier in Neon Console; they have not been modified in this pass.

| Source bucket | Source access | Source limit | Source MIME rule | Staging | Application mapping / disposition |
| --- | --- | ---: | --- | --- | --- |
| `ad-media` | public | 5 MiB | AVIF/JPEG/PNG/WebP | exists; observed private | `advertisement`; signed public read in Neon |
| `application-files` | private | 5 MiB | PDF/DOC/DOCX | exists; private | `application_file`; cross-user authorization not yet ported |
| `chat-attachments` | private | 5 MiB | JPEG/PNG/WebP/PDF | exists; private | legacy chat path; no active Neon media-policy mapping |
| `college-media` | public | 8 MiB | AVIF/JPEG/PNG/WebP | exists; observed public-read | logo/cover/gallery; signed public read and scoped managed upload/delete tested |
| `course-media` | public | 5 MiB | AVIF/JPEG/PNG/WebP | exists; observed private | `course_thumbnail`; signed public read in Neon |
| `event-attachments` | private | 10 MiB | PDF/DOC/DOCX | exists; private | `event_attachment`; cross-user authorization not yet ported |
| `event-media` | public | 8 MiB | AVIF/JPEG/PNG/WebP | exists; observed private | `event_cover`; signed public read in Neon |
| `job-files` | private | 5 MiB | PDF/DOC/DOCX | exists; private | `job_attachment`; cross-user authorization not yet ported |
| `mentor-media` | public | 5 MiB | AVIF/JPEG/PNG/WebP | exists; observed private | `mentor_profile`; signed public read in Neon |
| `Merotalent` | private | 2 MiB | unrestricted | **absent; source empty** | legacy bucket, no runtime bucket mapping or objects; intentionally excluded |
| `payment-proofs` | private | 5 MiB | JPEG/PNG/WebP/PDF | exists; private | legacy payment-proof path; Neon authorization not yet ported |
| `profile-media` | public | 5 MiB | AVIF/JPEG/PNG/WebP | exists; observed private | `profile_avatar`; signed public read, scoped upload tested |
| `resumes` | private | 5 MiB | PDF/DOC/DOCX | exists; private | `resume`; owner-scoped signed read tested |

The only absent source bucket, uppercase `Merotalent`, has zero source objects and no application module mapping. `supabase/migrations/20260910113000_harden_live_supabase_security.sql` describes it as legacy and removes arbitrary access. Creating a differently named bucket would not provide exact parity, and copying it is not needed for current functionality. Exact bucket-name parity is therefore **12/13**, while the mapped active buckets are **12/12**. This is an intentional exclusion, not a claim that every media workflow is fully migrated.

All 22 source objects (8,552,263 bytes) exist on staging with matching SHA-256 and content type. Staging tests demonstrate signed public and private reads, a scoped upload and deletion, and denial of foreign private reads/uploads/deletes. The only tested managed write scope is college media; other modules are fail-closed in the current Neon storage abstraction.

The S3-compatible target does not expose Supabase's bucket MIME/size metadata through `ListBuckets`. `src/lib/server/media-policy.ts` applies per-module MIME and size limits before server writes, but those limits are not a verified storage-provider-level control. Neon bucket access is configured through Neon rather than S3 ACL/bucket-policy calls; `private` buckets can be served by short-lived signed URLs ([Neon Object Storage architecture](https://neon.com/blog/building-neon-object-storage), [Neon private-file example](https://neon.com/blog/building-a-private-searchable-photo-library-on-the-neon-backend)). We did not make currently private buckets anonymously readable just to mirror Supabase flags.

Open questions before storage cutover: complete job/event/mentor/payment/chat document authorization and upload tests, review target access levels in Console again at release time, and decide whether legacy `Merotalent` should remain omitted or be represented by a deliberately named compatibility bucket.
