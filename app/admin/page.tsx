
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Duration = "1_day" | "7_days" | "30_days" | "permanent";
type Status = "active" | "unused" | "expired" | "paused" | "revoked";

type AccessCode = {
  id: string;
  codeReference: string;
  duration: Duration;
  note: string | null;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  status: Status;
};

type Stats = {
  total: number;
  active: number;
  unused: number;
  expired: number;
  paused: number;
  revoked: number;
};

const durationLabels: Record<Duration, string> = {
  "1_day": "1 dite",
  "7_days": "7 dite",
  "30_days": "30 dite",
  permanent: "Pergjithmone",
};

const statusLabels: Record<Status, string> = {
  active: "Aktiv",
  unused: "I paperdorur",
  expired: "Skaduar",
  paused: "Pezulluar",
  revoked: "Anuluar",
};

const emptyStats: Stats = {
  total: 0,
  active: 0,
  unused: 0,
  expired: 0,
  paused: 0,
  revoked: 0,
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timeRemaining(expiresAt: string | null) {
  if (!expiresAt) return "Pa skadim";

  const remaining = new Date(expiresAt).getTime() - Date.now();

  if (remaining <= 0) return "Ka skaduar";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}o mbetur`;
  if (hours > 0) return `${hours}o ${minutes}m mbetur`;

  return `${Math.max(1, minutes)} minuta mbetur`;
}

function statusColor(status: Status) {
  switch (status) {
    case "active":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "unused":
      return "border-sky-400/30 bg-sky-400/10 text-sky-300";
    case "expired":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "paused":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "revoked":
      return "border-red-400/30 bg-red-400/10 text-red-300";
  }
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [duration, setDuration] = useState<Duration>("30_days");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadCodes = useCallback(async () => {
    if (!secret.trim()) {
      setError("Vendos sekretin e administratorit fillimisht.");
      return;
    }

    setListLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/codes", {
        method: "GET",
        cache: "no-store",
        headers: { "x-admin-secret": secret },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Nuk u lexua lista e kodeve.");
      }

      setCodes(data.codes ?? []);
      setStats(data.stats ?? emptyStats);
      setNotice("Lista u perditesua me sukses.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ndodhi nje gabim.");
    } finally {
      setListLoading(false);
    }
  }, [secret]);

  async function createCode() {
    setLoading(true);
    setError("");
    setNotice("");
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
      setNotice("Kodi u krijua. Kopjoje dhe ruaje tani.");

      await loadCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ndodhi nje gabim.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("U kopjua me sukses.");
      setError("");
    } catch {
      setError("Kopjimi automatik deshtoi. Zgjidhe tekstin dhe kopjoje manualisht.");
    }
  }

  const filteredCodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return codes.filter((item) => {
      const matchesSearch =
        !query ||
        item.codeReference.toLowerCase().includes(query) ||
        (item.note ?? "").toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);

      return matchesSearch && (filter === "all" || item.status === filter);
    });
  }, [codes, search, filter, clock]);

  const statCards: { label: string; value: number; color: string }[] = [
    { label: "Gjithsej", value: stats.total, color: "text-white" },
    { label: "Aktive", value: stats.active, color: "text-emerald-300" },
    { label: "Te paperdorura", value: stats.unused, color: "text-sky-300" },
    { label: "Te skaduara", value: stats.expired, color: "text-zinc-300" },
    { label: "Te pezulluara", value: stats.paused, color: "text-amber-300" },
    { label: "Te anuluara", value: stats.revoked, color: "text-red-300" },
  ];

  return (
    <main className="min-h-screen bg-[#050706] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-emerald-400/20 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.35em] text-emerald-400">
              KELILELIBOT <span className="text-amber-300">◆</span>
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Admin <span className="text-emerald-400">Dashboard</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Menaxhimi dhe monitorimi i kodeve te hyrjes.
            </p>
          </div>
          <div className="w-fit rounded-full border border-amber-300/30 bg-amber-300/5 px-4 py-2 text-xs font-semibold text-amber-200">
            ● PANELI I ADMINISTRATORIT
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-amber-300/20 bg-[#0c0d0b] p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Siguria e administratorit</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sekreti dergohet vetem ne kerkesa ndaj API-se se administratorit.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              autoComplete="new-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Vendos ACCESS_ADMIN_SECRET"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none transition focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={() => void loadCodes()}
              disabled={listLoading || !secret.trim()}
              className="rounded-xl border border-amber-300/40 px-5 py-3 font-bold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50"
            >
              {listLoading ? "Duke lexuar..." : "Ngarko listen"}
            </button>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {statCards.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-emerald-400/15 bg-[#0b0e0c] p-4"
            >
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className={`mt-3 text-3xl font-black ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="h-fit rounded-2xl border border-emerald-400/30 bg-[#0b0e0c] p-5 shadow-[0_0_35px_rgba(16,185,129,0.05)] sm:p-6">
            <p className="text-xs font-bold tracking-[0.25em] text-emerald-400">
              ACCESS CONTROL
            </p>
            <h2 className="mt-2 text-2xl font-black">Krijo kod te ri</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Afati fillon kur kodi perdoret per here te pare.
            </p>

            <label className="mt-6 block text-sm font-semibold text-zinc-300">
              Kohezgjatja
            </label>
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value as Duration)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 outline-none focus:border-emerald-400"
            >
              <option value="1_day">1 dite</option>
              <option value="7_days">7 dite</option>
              <option value="30_days">30 dite</option>
              <option value="permanent">Pergjithmone</option>
            </select>

            <label className="mt-5 block text-sm font-semibold text-zinc-300">
              Shenim (opsional)
            </label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
              placeholder="P.sh. Kodi per shokun"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 outline-none focus:border-emerald-400"
            />

            <button
              type="button"
              onClick={() => void createCode()}
              disabled={loading || !secret.trim()}
              className="mt-6 w-full rounded-xl bg-emerald-400 p-3 font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Duke krijuar..." : "+ Krijo kodin"}
            </button>

            {code && (
              <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
                <p className="text-sm font-bold text-emerald-300">
                  Kodi i ri — ruaje tani!
                </p>
                <p className="mt-3 break-all rounded-lg bg-black p-3 font-mono text-sm text-white">
                  {code}
                </p>
                <button
                  type="button"
                  onClick={() => void copyText(code)}
                  className="mt-3 w-full rounded-lg border border-emerald-400/40 p-3 text-sm font-bold text-emerald-300 hover:bg-emerald-400/10"
                >
                  Kopjo kodin e plote
                </button>
                <p className="mt-3 text-xs text-zinc-400">
                  Ky eshte momenti i vetem kur kodi i plote shfaqet.
                </p>
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-amber-300/20 bg-[#0b0e0c] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.25em] text-amber-200">
                  DATABASE
                </p>
                <h2 className="mt-2 text-2xl font-black">Lista e kodeve</h2>
              </div>
              <button
                type="button"
                onClick={() => void loadCodes()}
                disabled={listLoading || !secret.trim()}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold hover:border-emerald-400 disabled:opacity-50"
              >
                {listLoading ? "Duke rifreskuar..." : "↻ Rifresko"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_170px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kerko sipas references, ID-se ose shenimit..."
                className="min-w-0 rounded-xl border border-zinc-700 bg-black px-4 py-3 outline-none focus:border-emerald-400"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as "all" | Status)}
                className="rounded-xl border border-zinc-700 bg-black px-3 py-3 outline-none focus:border-emerald-400"
              >
                <option value="all">Te gjitha statuset</option>
                <option value="active">Aktive</option>
                <option value="unused">Te paperdorura</option>
                <option value="expired">Te skaduara</option>
                <option value="paused">Te pezulluara</option>
                <option value="revoked">Te anuluara</option>
              </select>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              Shfaqen {filteredCodes.length} nga {codes.length} kode.
            </p>

            {codes.length === 0 && !listLoading ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-8 text-center">
                <p className="font-semibold text-zinc-300">Nuk ka liste per t'u shfaqur.</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Vendos sekretin dhe shtyp “Ngarko listen”.
                </p>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
                Nuk u gjet asnje kod me kete kerkim.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredCodes.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-zinc-800 bg-black/60 p-4 transition hover:border-emerald-400/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-sm font-bold text-amber-200">
                          REF-{item.codeReference}
                        </p>
                        <p className="mt-1 break-all text-xs text-zinc-600">
                          ID: {item.id}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusColor(item.status)}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500">Kohezgjatja</p>
                        <p className="mt-1 text-zinc-200">
                          {durationLabels[item.duration]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Koha e mbetur</p>
                        <p className="mt-1 text-emerald-300">
                          {item.status === "unused"
                            ? "Nis ne aktivizim"
                            : item.status === "paused"
                              ? "Pezulluar"
                              : item.status === "revoked"
                                ? "Anuluar"
                                : timeRemaining(item.expiresAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Krijuar</p>
                        <p className="mt-1 text-zinc-300">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Aktivizuar</p>
                        <p className="mt-1 text-zinc-300">
                          {formatDate(item.activatedAt)}
                        </p>
                      </div>
                    </div>

                    {item.note && (
                      <p className="mt-3 break-words border-t border-zinc-800 pt-3 text-sm text-zinc-400">
                        Shenim: {item.note}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void copyText(item.id)}
                      className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-300/50 hover:text-amber-200"
                    >
                      Kopjo ID-ne
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mt-6 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-500/30 bg-red-950/20 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
            }`}
          >
            {error || notice}
          </div>
        )}

        <footer className="mt-8 border-t border-zinc-800 pt-5 text-center text-xs text-zinc-600">
          KELILELIBOT ADMIN • Access management
        </footer>
      </div>
    </main>
  );
}
