
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

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Mungon konfigurimi i Supabase.");
  }

  return { url: url.replace(/\/+$/, ""), key };
}

type AccessCodeRecord = {
  id: string;
  code_hash: string;
  duration_type: CodeDuration;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  paused_at: string | null;
  note: string | null;
};

function getStatus(record: AccessCodeRecord) {
  if (record.revoked_at) return "revoked";
  if (record.paused_at) return "paused";

  if (
    record.expires_at &&
    new Date(record.expires_at).getTime() <= Date.now()
  ) {
    return "expired";
  }

  if (!record.activated_at) return "unused";

  return "active";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Nuk ke leje administratori." },
      { status: 401 }
    );
  }

  try {
    const { url, key } = supabaseConfig();

    const response = await fetch(
      `${url}/rest/v1/access_codes?select=id,code_hash,duration_type,created_at,activated_at,expires_at,revoked_at,paused_at,note&order=created_at.desc`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase u pergjigj me statusin ${response.status}.`);
    }

    const records = (await response.json()) as AccessCodeRecord[];

    const codes = records.map((record) => ({
      id: record.id,
      codeReference: record.code_hash.slice(-8).toUpperCase(),
      duration: record.duration_type,
      note: record.note,
      createdAt: record.created_at,
      activatedAt: record.activated_at,
      expiresAt: record.expires_at,
      status: getStatus(record),
    }));

    const stats = {
      total: codes.length,
      active: codes.filter((code) => code.status === "active").length,
      unused: codes.filter((code) => code.status === "unused").length,
      expired: codes.filter((code) => code.status === "expired").length,
      paused: codes.filter((code) => code.status === "paused").length,
      revoked: codes.filter((code) => code.status === "revoked").length,
    };

    return NextResponse.json({ success: true, codes, stats });
  } catch (error) {
    console.error("Admin code list error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Nuk u lexua lista e kodeve. Kontrollo konfigurimin e Supabase.",
      },
      { status: 500 }
    );
  }
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
        {
          success: false,
          error: "Shenimi duhet te kete maksimumi 200 karaktere.",
        },
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
      {
        success: false,
        error: "Nuk u krijua kodi. Kontrollo konfigurimin e serverit.",
      },
      { status: 500 }
    );
  }
}
