
"use client";

import { useState } from "react";

type Duration = "1_day" | "7_days" | "30_days" | "permanent";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [duration, setDuration] = useState<Duration>("30_days");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCode() {
    setLoading(true);
    setError("");
    setCode("");

    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ duration, note }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Nuk u krijua kodi.");
      }

      setCode(data.code);
      setNote("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ndodhi nje gabim."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-5">
      <section className="w-full max-w-lg rounded-2xl border border-green-500/40 bg-zinc-950 p-6 shadow-2xl shadow-green-950">
        <p className="text-sm font-bold tracking-[0.3em] text-green-400">
          KELILELIBOT
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Admin Panel
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Krijo kode hyrjeje per perdoruesit.
        </p>

        <label className="mt-6 block text-sm text-zinc-300">
          Sekreti i administratorit
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Vendos ACCESS_ADMIN_SECRET"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3 outline-none focus:border-green-500"
        />

        <label className="mt-5 block text-sm text-zinc-300">
          Kohezgjatja e kodit
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as Duration)}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3"
        >
          <option value="1_day">1 dite</option>
          <option value="7_days">7 dite</option>
          <option value="30_days">30 dite</option>
          <option value="permanent">Pergjithmone</option>
        </select>

        <label className="mt-5 block text-sm text-zinc-300">
          Shenim (opsional)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="P.sh. Kodi per shokun"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3 outline-none focus:border-green-500"
        />

        <button
          type="button"
          onClick={createCode}
          disabled={loading || !secret.trim()}
          className="mt-6 w-full rounded-lg bg-green-500 p-3 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Duke krijuar..." : "Krijo kodin"}
        </button>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {code && (
          <div className="mt-5 rounded-lg border border-green-500/40 bg-green-950/30 p-4">
            <p className="text-sm font-semibold text-green-300">
              Kodi u krijua!
            </p>
            <p className="mt-3 break-all font-mono text-lg">
              {code}
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(code);
              }}
              className="mt-3 rounded-lg border border-green-500 px-4 py-2 text-sm font-semibold text-green-300"
            >
              Kopjo kodin
            </button>
            <p className="mt-3 text-xs text-zinc-400">
              Ruaje kodin tani. Afati fillon kur perdoret per here te pare.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
