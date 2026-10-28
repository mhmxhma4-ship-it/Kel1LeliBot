
import { NextRequest, NextResponse } from "next/server";
import { validateAccessCode } from "@/lib/access";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "keli_access";

function signSession(value: string) {
  const secret = process.env.ACCESS_ADMIN_SECRET;

  if (!secret) {
    throw new Error("Mungon ACCESS_ADMIN_SECRET ne server.");
  }

  return createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

function createSessionToken(expiresAt: string | null) {
  const payload = Buffer.from(
    JSON.stringify({
      access: true,
      expiresAt,
      createdAt: Date.now(),
    })
  ).toString("base64url");

  return `${payload}.${signSession(payload)}`;
}

function verifySessionToken(token: string) {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) return false;

    const expected = signSession(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return false;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (data.access !== true) return false;

    if (data.expiresAt && Date.parse(data.expiresAt) <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const code =
      typeof body?.code === "string" ? body.code.trim() : "";

    if (!code || code.length > 100) {
      return NextResponse.json(
        { success: false, error: "Shkruaj nje kod te vlefshem." },
        { status: 400 }
      );
    }

    const result = await validateAccessCode(code);

    if (!result.valid) {
      const messages: Record<string, string> = {
        invalid: "Kodi nuk eshte i vlefshem.",
        paused: "Ky kod eshte pezulluar.",
        expired: "Ky kod ka skaduar.",
      };

      return NextResponse.json(
        {
          success: false,
          error: messages[result.reason] ?? "Aksesi u refuzua.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      expiresAt: result.expiresAt,
    });

    response.cookies.set(
      COOKIE_NAME,
      createSessionToken(result.expiresAt),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: result.expiresAt
          ? new Date(result.expiresAt)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    );

    return response;
  } catch (error) {
    console.error("Access API error:", error);

    return NextResponse.json(
      { success: false, error: "Gabim ne server. Provo perseri." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token || !verifySessionToken(token)) {
      return NextResponse.json(
        { authorized: false },
        { status: 401 }
      );
    }

    return NextResponse.json({ authorized: true });
  } catch {
    return NextResponse.json(
      { authorized: false },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
