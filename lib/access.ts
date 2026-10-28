
import { createHash, randomBytes } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Mungojne variablat e Supabase ne server.");
  }

  return {
    url: SUPABASE_URL.replace(/\/+$/, ""),
    key: SUPABASE_SERVICE_ROLE_KEY,
  };
}

function hashCode(code: string) {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export type CodeDuration =
  | "1_day"
  | "7_days"
  | "30_days"
  | "permanent";

type AccessRecord = {
  id: string;
  code_hash: string;
  duration_type: CodeDuration;
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  paused_at: string | null;
};

async function requestSupabase(
  path: string,
  init: RequestInit = {}
) {
  const config = getConfig();

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Gabim ne databazen Supabase (${response.status}).`);
  }

  return response;
}

export function generateAccessCode() {
  return `KELI-${randomBytes(12).toString("hex").toUpperCase()}`;
}

export async function createAccessCode(
  duration: CodeDuration,
  note = ""
) {
  const code = generateAccessCode();

  const response = await requestSupabase(
    "access_codes?select=id,duration_type,created_at",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        code_hash: hashCode(code),
        duration_type: duration,
        note: note.trim() || null,
      }),
    }
  );

  const rows = await response.json();

  return { code, record: rows[0] };
}

export async function validateAccessCode(code: string) {
  if (!code || code.trim().length < 8) {
    return { valid: false as const, reason: "invalid" };
  }

  const hash = hashCode(code);

  const response = await requestSupabase(
    `access_codes?code_hash=eq.${hash}&select=id,duration_type,activated_at,expires_at,revoked_at,paused_at`,
    { method: "GET" }
  );

  const rows = (await response.json()) as AccessRecord[];
  const record = rows[0];

  if (!record || record.revoked_at) {
    return { valid: false as const, reason: "invalid" };
  }

  if (record.paused_at) {
    return { valid: false as const, reason: "paused" };
  }

  const now = new Date();

  if (record.expires_at && new Date(record.expires_at) <= now) {
    return { valid: false as const, reason: "expired" };
  }

  if (!record.activated_at) {
    const activatedAt = now.toISOString();
    let expiresAt: string | null = null;

    if (record.duration_type !== "permanent") {
      const days =
        record.duration_type === "1_day"
          ? 1
          : record.duration_type === "7_days"
            ? 7
            : 30;

      expiresAt = new Date(
        now.getTime() + days * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const update = await requestSupabase(
      `access_codes?id=eq.${record.id}&activated_at=is.null&revoked_at=is.null&paused_at=is.null`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          activated_at: activatedAt,
          expires_at: expiresAt,
        }),
      }
    );

    if (!update.ok) {
      return { valid: false as const, reason: "invalid" };
    }

    const check = await requestSupabase(
      `access_codes?id=eq.${record.id}&select=activated_at,expires_at,revoked_at,paused_at`,
      { method: "GET" }
    );

    const updated = (await check.json())[0];

    if (
      !updated ||
      updated.revoked_at ||
      updated.paused_at ||
      (updated.expires_at && new Date(updated.expires_at) <= new Date())
    ) {
      return { valid: false as const, reason: "invalid" };
    }

    return {
      valid: true as const,
      expiresAt: updated.expires_at as string | null,
    };
  }

  return {
    valid: true as const,
    expiresAt: record.expires_at,
  };
}
