/** Private payment evidence is never payment confirmation. */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { ApplicationStorageError, privateDownloadUrl, uploadBytes } from "@/lib/server/application-storage";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { buildMediaObjectPath, MediaPolicyError, parseMediaUploadIntent } from "@/lib/server/media-policy";
import { deleteObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "cache-control": "private, no-store" };
const maxBytes = 5 * 1024 * 1024;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError || error instanceof MediaPolicyError || error instanceof ApplicationStorageError) {
    return NextResponse.json({ error: error instanceof ApplicationStorageError ? "STORAGE_DENIED" : error.code },
      { status: error.status, headers: noStore });
  }
  if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  return NextResponse.json({ error: "PROOF_UNAVAILABLE" }, { status: 503, headers: noStore });
}
function matchesMagic(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  if (type === "image/png") return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, i) => bytes[i] === value);
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP";
  return false;
}

export async function POST(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length < 1) return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411, headers: noStore });
  if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers: noStore });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const form = await request.formData();
    const paymentId = form.get("paymentId");
    const file = form.get("file");
    const userNote = form.get("note");
    const proofType = form.get("proofType") || "screenshot";
    if (typeof paymentId !== "string" || !/^[0-9a-f-]{36}$/i.test(paymentId) || !(file instanceof File) ||
        typeof userNote !== "string" || userNote.trim().length < 5 || userNote.trim().length > 2000 ||
        typeof proofType !== "string" || !["screenshot","bank_voucher","statement","receipt","other"].includes(proofType)) {
      return NextResponse.json({ error: "INVALID_PROOF" }, { status: 422, headers: noStore });
    }
    const [payment] = await queryRows<{ id: string; status: string }>(`SELECT id,status FROM public.payments
      WHERE id=$1::uuid AND user_id=$2::uuid AND deleted_at IS NULL`, [paymentId,actor.userId]);
    if (!payment || !["pending","failed"].includes(payment.status)) {
      return NextResponse.json({ error: "PAYMENT_NOT_REVIEWABLE" }, { status: 403, headers: noStore });
    }
    const intent = parseMediaUploadIntent({ module: "payment_proof", resourceId: paymentId,
      fileName: file.name, contentType: file.type, sizeBytes: file.size });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesMagic(bytes, intent.contentType)) return NextResponse.json({ error: "INVALID_FILE" }, { status: 415, headers: noStore });
    const path = buildMediaObjectPath(intent, actor.userId);
    const stored = await uploadBytes(actor, { ...intent, bytes, path });
    try {
      const [proof] = await queryRows<{ id: string; status: string }>(`INSERT INTO public.payment_proofs
        (payment_id,uploaded_by_user_id,file_name,storage_path,mime_type,file_size,proof_type,user_note,status)
        SELECT p.id,$2::uuid,$3,$4,$5,$6,$7,$8,'pending'
        FROM public.payments p WHERE p.id=$1::uuid AND p.user_id=$2::uuid AND p.status IN ('pending','failed')
          AND p.deleted_at IS NULL
        RETURNING id,status`, [paymentId,actor.userId,file.name,path,intent.contentType,file.size,proofType,userNote.trim()]);
      if (!proof) throw new NeonAuthorizationError(403, "PAYMENT_NOT_REVIEWABLE", "Payment changed before proof was saved.");
      return NextResponse.json({ data: { id: proof.id, status: proof.status } }, { status: 201, headers: noStore });
    } catch (error) {
      await deleteObject(stored.bucket, stored.path).catch(() => undefined);
      throw error;
    }
  } catch (error) { return failure(error); }
}

export async function GET(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const proofId = new URL(request.url).searchParams.get("id");
    const adminQueue = new URL(request.url).searchParams.get("queue") === "1";
    if (proofId && !/^[0-9a-f-]{36}$/i.test(proofId)) return NextResponse.json({ error: "INVALID_PROOF" }, { status: 422, headers: noStore });
    if (!proofId) {
      if (adminQueue && !actor.platformAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
      if (adminQueue) {
        const proofs = await queryRows(`SELECT pp.id,pp.payment_id,pp.uploaded_by_user_id,pp.file_name,
          pp.proof_type,pp.status,pp.review_note,pp.created_at,p.amount::float AS amount,p.currency,
          p.payment_type,p.status AS payment_status FROM public.payment_proofs pp
          JOIN public.payments p ON p.id=pp.payment_id
          ORDER BY pp.created_at DESC LIMIT 100`);
        return NextResponse.json({ data: proofs }, { headers: noStore });
      }
      const proofs = await queryRows(`SELECT pp.id,pp.payment_id,pp.file_name,pp.proof_type,
        pp.status,pp.review_note,pp.created_at FROM public.payment_proofs pp
        WHERE pp.uploaded_by_user_id=$1::uuid ORDER BY pp.created_at DESC LIMIT 50`, [actor.userId]);
      return NextResponse.json({ data: proofs }, { headers: noStore });
    }
    const [proof] = await queryRows<{ storage_path: string; payment_id: string; uploaded_by_user_id: string }>(
      `SELECT storage_path,payment_id,uploaded_by_user_id FROM public.payment_proofs
       WHERE id=$1::uuid AND (uploaded_by_user_id=$2::uuid OR $3::boolean)`, [proofId,actor.userId,actor.platformAdmin]);
    if (!proof) return NextResponse.json({ error: "PROOF_NOT_FOUND" }, { status: 404, headers: noStore });
    const signedUrl = await privateDownloadUrl(actor, { module: "payment_proof", resourceId: proof.payment_id,
      path: proof.storage_path, expiresIn: 300 });
    return NextResponse.json({ data: { signedUrl, expiresIn: 300 } }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    if (!actor.platformAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) ||
        !["accepted","rejected"].includes(body.status) || typeof body.note !== "string" ||
        body.note.trim().length < 5 || body.note.trim().length > 2000 ||
        Object.keys(body).some((key) => !["id","status","note"].includes(key))) {
      return NextResponse.json({ error: "INVALID_REVIEW" }, { status: 422, headers: noStore });
    }
    const reviewed = await withTransaction(async (client) => {
      const result = await client.query<{ id: string; status: string; payment_id: string }>(`
        UPDATE public.payment_proofs SET status=$2,reviewed_by_user_id=$3::uuid,
          reviewed_at=now(),review_note=$4,updated_at=now()
        WHERE id=$1::uuid AND status='pending' RETURNING id,status,payment_id`, [
        body.id,body.status,actor.userId,body.note.trim()]);
      if (!result.rows[0]) throw new NeonAuthorizationError(409, "PROOF_ALREADY_REVIEWED", "Proof is no longer pending.");
      // A reviewed document alone is not gateway verification. A separate
      // reconciliation decision is required before paid content can activate.
      await client.query(`UPDATE public.payments SET reconciliation_status='manual_review_required',
        updated_at=now() WHERE id=$1::uuid AND status IN ('pending','failed')`, [result.rows[0].payment_id]);
      return { id: result.rows[0].id, status: result.rows[0].status, paymentActivated: false };
    });
    return NextResponse.json({ data: reviewed }, { headers: noStore });
  } catch (error) { return failure(error); }
}
