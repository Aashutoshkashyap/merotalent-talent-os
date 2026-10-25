import { NextResponse } from 'next/server';
import { getBackendMode } from '@/lib/server/backend-mode';
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from '@/lib/server/neon-session';
import { NeonAuthorizationError } from '@/lib/server/neon-authorization';
import { getNeonPaymentAvailability } from '@/lib/server/neon-payment-availability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  if (getBackendMode() === 'legacy') return new Response(null, { status: 404, headers });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    return NextResponse.json({ data: await getNeonPaymentAvailability(actor.userId) }, { headers });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) return NextResponse.json(
      { error: error.code, message: error.message }, { status: error.status, headers });
    return NextResponse.json({ error: error instanceof NeonSessionUnavailable ? 'AUTH_UNAVAILABLE' : 'PAYMENT_STATUS_UNAVAILABLE',
      message: 'Payment readiness could not be checked. Please retry.' }, { status: 503, headers });
  }
}
