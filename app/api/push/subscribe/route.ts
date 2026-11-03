import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "keli_access";

function hasValidSession(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.ACCESS_ADMIN_SECRET;

  if (!token || !secret) return false;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) return false;

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return (
      session.access === true &&
      (!session.expiresAt ||
        Date.parse(session.expiresAt) > Date.now())
    );
  } catch {
    return false;
  }
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Mungojne SUPABASE_URL ose SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { url: url.replace(/\/$/, ""), key };
}

export async function POST(request: NextRequest) {
  if (!hasValidSession(request)) {
    return NextResponse.json(
      { error: "Sesioni nuk eshte aktiv." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const subscription = body?.subscription;

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Abonimi Push nuk eshte i vlefshem." },
        { status: 400 }
      );
    }

    const { url, key } = supabaseConfig();

    const response = await fetch(
      `${url}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription,
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Supabase push subscription error:",
        await response.text()
      );

      return NextResponse.json(
        { error: "Nuk u ruajt abonimi ne databaze." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gabim gjate regjistrimit te njoftimeve.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasValidSession(request)) {
    return NextResponse.json(
      { error: "Sesioni nuk eshte aktiv." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const endpoint = body?.endpoint;

    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://")
    ) {
      return NextResponse.json(
        { error: "Endpoint nuk eshte i vlefshem." },
        { status: 400 }
      );
    }

    const { url, key } = supabaseConfig();

    const response = await fetch(
      `${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Nuk u hoq abonimi." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gabim gjate heqjes se njoftimeve." },
      { status: 500 }
    );
  }
}
