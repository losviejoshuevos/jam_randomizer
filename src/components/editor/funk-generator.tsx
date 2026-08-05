"use client";

import { useState } from "react";
import { funkStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Meter,
  Mode,
  PitchClass,
} from "@/lib/music/domain/types";
import { generateSectionA } from "@/lib/music/generator";
import { RouteLink } from "@/components/ui/route-link";

const KEYS: PitchClass[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const DEFAULT_SETTINGS: GenerationSettings = {
  styleId: "funk",
  key: "C",
  mode: "minor",
  bpm: "random",
  meter: "4/4",
  complexity: "easy",
  harmonicFreedom: "colorful",
  timing: {
    sectionADurationSeconds: 150,
    sectionBDurationSeconds: 90,
    transitionWarningSeconds: 10,
  },
};

const FIELD_CLASS =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent)]";
const CARD_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const INITIAL_CARD_CODE = "FUNK-START";

type CopyStatus = "idle" | "copied" | "failed";

function createResult(seed: string, settings: GenerationSettings) {
  return generateSectionA({
    seed,
    settings,
    styleProfile: funkStyleProfile,
  });
}

function createCardCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const characters = Array.from(
    bytes,
    (byte) => CARD_CODE_ALPHABET[byte % CARD_CODE_ALPHABET.length],
  );

  return `FUNK-${characters.slice(0, 5).join("")}-${characters.slice(5).join("")}`;
}

function snapshotSettings(settings: GenerationSettings): GenerationSettings {
  return {
    ...settings,
    timing: { ...settings.timing },
  };
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();

    const copied = document.execCommand("copy");
    input.remove();

    if (!copied) {
      throw new Error("Clipboard access is unavailable.");
    }
  }
}

export function FunkGenerator() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [card, setCard] = useState(() => ({
    code: INITIAL_CARD_CODE,
    settings: snapshotSettings(DEFAULT_SETTINGS),
    result: createResult(INITIAL_CARD_CODE, DEFAULT_SETTINGS),
  }));
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  function generateNewHarmony() {
    try {
      const code = createCardCode();
      setCard({
        code,
        settings: snapshotSettings(settings),
        result: createResult(code, settings),
      });
      setError(null);
      setCopyStatus("idle");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Не удалось создать гармонию.",
      );
    }
  }

  async function copyCardCode() {
    try {
      await copyText(card.code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
            First playable slice
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            Jam Randomizer
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Создавайте варианты Funk-гармонии для секции A и сохраняйте код
            понравившейся или проблемной карточки.
          </p>
        </div>
        <RouteLink href="/stage">Stage Mode</RouteLink>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-white/10 bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-lg font-bold">Настройки</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
            <label className="text-sm text-[var(--muted)]">
              Тональность
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    key: event.target.value as PitchClass,
                  }))
                }
                value={settings.key}
              >
                {KEYS.map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[var(--muted)]">
              Лад
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mode: event.target.value as Mode,
                  }))
                }
                value={settings.mode}
              >
                <option value="major">Мажор</option>
                <option value="minor">Минор</option>
              </select>
            </label>

            <label className="text-sm text-[var(--muted)]">
              Размер
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    meter: event.target.value as Meter,
                  }))
                }
                value={settings.meter}
              >
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
              </select>
            </label>

            <label className="text-sm text-[var(--muted)]">
              Сложность
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    complexity: event.target.value as Complexity,
                  }))
                }
                value={settings.complexity}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="col-span-2 text-sm text-[var(--muted)] lg:col-span-1">
              Гармоническая свобода
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    harmonicFreedom: event.target.value as HarmonicFreedom,
                  }))
                }
                value={settings.harmonicFreedom}
              >
                <option value="strict">Strict</option>
                <option value="colorful">Colorful</option>
                <option value="adventurous">Adventurous</option>
              </select>
            </label>
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-black transition hover:brightness-90 active:scale-[0.99]"
            onClick={generateNewHarmony}
            type="button"
          >
            Новая гармония
          </button>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </section>

        <section
          className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-black p-6 sm:p-10"
          data-testid="harmony-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                Funk · Theme A
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">
                {card.settings.key}{" "}
                {card.settings.mode === "major" ? "major" : "minor"}
              </h2>
            </div>
            <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-[var(--muted)]">
              {card.result.value.bars} тактов · {card.settings.meter}
            </div>
          </div>

          <div className="my-auto grid gap-3 py-10 sm:grid-cols-2 xl:grid-cols-4">
            {card.result.value.chords.map((chord, index) => (
              <div
                className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5"
                key={chord.id}
              >
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{index + 1}</span>
                  <span>
                    {chord.durationBars} {chord.durationBars === 1 ? "такт" : "такта"}
                  </span>
                </div>
                <p className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  {chord.renderedSymbol}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  {chord.roman}
                </p>
              </div>
            ))}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-[var(--muted)]">
            <div className="flex flex-wrap items-center gap-3">
              <span data-testid="card-code">Код карточки: {card.code}</span>
              <button
                className="rounded-full border border-white/15 px-3 py-1.5 text-white transition hover:border-white/30"
                onClick={copyCardCode}
                type="button"
              >
                {copyStatus === "copied" ? "Скопировано" : "Скопировать код"}
              </button>
              {copyStatus === "failed" ? (
                <span className="text-red-300">Не удалось скопировать</span>
              ) : null}
            </div>
            <span>
              {card.result.usedFallback ? "Безопасный вариант" : "Проверено"}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
