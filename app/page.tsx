
"use client";

import { useEffect, useState } from "react";

const languages = [
  { code: "sq", name: "Shqip", flag: "🇦🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export default function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("sq");

  useEffect(() => {
    const saved = localStorage.getItem("kelilelibot-language");
    if (saved && languages.some((item) => item.code === saved)) {
      setLanguage(saved);
    }
  }, []);

  function chooseLanguage(code: string) {
    setLanguage(code);
    localStorage.setItem("kelilelibot-language", code);
  }

  const selected =
    languages.find((item) => item.code === language) ?? languages[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Hap menune"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/30 bg-black/40 text-amber-300 transition hover:bg-amber-400/10"
      >
        {open ? (
          <span className="relative -top-px text-lg leading-none">×</span>
        ) : (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-amber-400/25 bg-[#0c0c0f] p-3 shadow-2xl shadow-black/60">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-300">
              🌐 Language / Gjuha
            </span>
            <button
              type="button"
              aria-label="Mbyll menune"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <span className="relative -top-px text-lg leading-none">×</span>
            </button>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => chooseLanguage(item.code)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  language === item.code
                    ? "bg-amber-400/15 text-amber-300"
                    : "text-gray-200 hover:bg-white/5"
                }`}
              >
                <span>{item.flag}</span>
                <span className="flex-1">{item.name}</span>
                {language === item.code && (
                  <span className="text-amber-300">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
