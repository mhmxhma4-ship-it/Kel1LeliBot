
import { NextRequest, NextResponse } from "next/server";
import { createAccessCode, type CodeDuration } from "@/lib/access";

export const dynamic = "force-dynamic";

const ALLOWED_DURATIONS: CodeDuration[] = [
  "1_day",
  "7_days",
  "30_days",
  "permanent",
];

function isAdmin(request: NextRequest) {
  const secret = process.env.ACCESS_ADMIN_SECRET;
  const provided = request.headers.get("x-admin-secret");

  return Boolean(secret && provided && provided === secret);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Nuk ke leje administratori." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    const duration = body?.duration as CodeDuration;
    const note =
      typeof body?.note === "string" ? body.note.trim() : "";

    if (!ALLOWED_DURATIONS.includes(duration)) {
      return NextResponse.json(
        { success: false, error: "Kohezgjatja nuk eshte e vlefshme." },
        { status: 400 }
      );
    }

    if (note.length > 200) {
      return NextResponse.json(
        { success: false, error: "Shenimi duhet te kete maksimumi 200 karaktere." },
        { status: 400 }
      );
    }

    const result = await createAccessCode(duration, note);

    return NextResponse.json(
      {
        success: true,
        code: result.code,
        duration: result.record.duration_type,
        createdAt: result.record.created_at,
        message: "Kodi u krijua me sukses. Ruaje tani.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin code creation error:", error);

    return NextResponse.json(
      { success: false, error: "Nuk u krijua kodi. Kontrollo konfigurimin e serverit." },
      { status: 500 }
    );
  }
}
