
import { NextRequest, NextResponse } from "next/server";
import { validateAccessCode } from "@/lib/access";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "keli_access";
const PERMANENT_COOKIE_DAYS = 365;

type SessionPayload = {
  access: true;
  expiresAt: string | null;
  createdAt: number;
};

function signSession(value: string) {
  const secret = process.env.ACCESS_ADMIN_SECRET;

  if (!secret) {
    throw new Error("Mungon ACCESS_ADMIN_SECRET ne server.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function createSessionToken(expiresAt: string | null) {
  const payload = Buffer.from(
    JSON.stringify({
      access: true,
      expiresAt,
      createdAt: Date.now(),
    } satisfies SessionPayload)
  ).toString("base64url");

  return `${payload}.${signSession(payload)}`;
}

function readSessionToken(token: string): SessionPayload | null {
  try {
    const separator = token.lastIndexOf(".");
    if (separator <= 0) return null;

    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);

    if (!payload || !signature) return null;

    const expected = signSession(payload);
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");

    if (
      a.length !== b.length ||
      a.length === 0 ||
      !timingSafeEqual(a, b)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;

    if (
      data.access !== true ||
      typeof data.createdAt !== "number" ||
      !Number.isFinite(data.createdAt)
    ) {
      return null;
    }

    if (
      data.expiresAt !== null &&
      (typeof data.expiresAt !== "string" ||
        !Number.isFinite(Date.parse(data.expiresAt)))
    ) {
      return null;
    }

    if (
      typeof data.expiresAt === "string" &&
      Date.parse(data.expiresAt) <= Date.now()
    ) {
      return null;
    }

    return {
      access: true,
      expiresAt: data.expiresAt ?? null,
      createdAt: data.createdAt,
    };
  } catch {
    return null;
  }
}

function cookieOptions(expiresAt: string | null) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt
      ? new Date(expiresAt)
      : new Date(
          Date.now() +
            PERMANENT_COOKIE_DAYS * 24 * 60 * 60 * 1000
        ),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const code =
      typeof body?.code === "string" ? body.code.trim() : "";

    if (!code || code.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Shkruaj nje kod te vlefshem.",
        },
        { status: 400 }
      );
    }

    const result = await validateAccessCode(code);

    if (!result.valid) {
      const messages: Record<string, string> = {
        invalid: "Kodi nuk eshte i vlefshem.",
        paused: "Ky kod eshte pezulluar.",
        expired: "Ky kod ka skaduar.",
        revoked: "Ky kod eshte anuluar.",
      };

      return NextResponse.json(
        {
          success: false,
          error:
            messages[result.reason] ?? "Aksesi u refuzua.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      authorized: true,
      expiresAt: result.expiresAt,
    });

    response.cookies.set(
      COOKIE_NAME,
      createSessionToken(result.expiresAt),
      cookieOptions(result.expiresAt)
    );

    return response;
  } catch (error) {
    console.error("Access API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Gabim ne server. Provo perseri.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { authorized: false },
        { status: 401 }
      );
    }

    const session = readSessionToken(token);

    if (!session) {
      const response = NextResponse.json(
        { authorized: false },
        { status: 401 }
      );

      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json({
      authorized: true,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      permanent: session.expiresAt === null,
    });
  } catch (error) {
    console.error("Access session error:", error);

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
