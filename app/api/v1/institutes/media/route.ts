import { NextResponse } from "next/server";
import { publicObjectUrl } from "@/lib/server/application-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public college-media paths only; private application files never use this route. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const path = params.get("path");
  if (!path || params.size !== 1) {
    return NextResponse.json({ error: "Invalid college media path." }, { status: 400 });
  }
  try {
    const signedOrPublicUrl = await publicObjectUrl("college_logo", path);
    return NextResponse.redirect(signedOrPublicUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "College image is unavailable." }, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
