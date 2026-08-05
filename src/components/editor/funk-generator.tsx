"use client";

import { useEffect, useState } from "react";
import { funkStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  JamChord,
  JamSection,
  JamSession,
  Meter,
  Mode,
  PitchClass,
} from "@/lib/music/domain/types";
import { generateSession, retimeSession } from "@/lib/music/generator";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";
import { formatRomanChord } from "@/lib/music/rendering/format-roman-chord";
import { formatChordDuration } from "@/lib/music/rendering/format-chord-duration";
import { groupChordsForDisplay } from "@/lib/music/rendering/group-chords-for-display";
import {
  CURRENT_SCHEMA_VERSION,
  MAX_RECENT_SESSIONS,
  type PersistedJamState,
} from "@/lib/persistence/contracts";
import { createJamPersistence } from "@/lib/persistence/local-storage";
import {
  MAX_MANUAL_BPM,
  MIN_MANUAL_BPM,
} from "@/lib/music/tempo/resolve-bpm";
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
const MIN_SECTION_SECONDS = 30;
const MAX_SECTION_SECONDS = 1_800;

type CopyStatus = "idle" | "copied" | "failed";
type ResolvedGenerationSettings = GenerationSettings & { bpm: number };

function createCardCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const characters = Array.from(
    bytes,
    (byte) => CARD_CODE_ALPHABET[byte % CARD_CODE_ALPHABET.length],
  );

  return `FUNK-${characters.slice(0, 5).join("")}-${characters.slice(5).join("")}`;
}

function createCard(seed: string, settings: GenerationSettings) {
  const result = generateSession({
    seed,
    settings,
    styleProfile: funkStyleProfile,
  });
  const resolvedSettings: ResolvedGenerationSettings = {
    ...settings,
    bpm: result.value.bpm,
    timing: { ...settings.timing },
  };

  return {
    code: seed,
    settings: resolvedSettings,
    session: result.value,
    usedFallback: result.usedFallback,
  };
}

function settingsFromSession(session: JamSession): GenerationSettings {
  return {
    styleId: session.styleId,
    key: session.key,
    mode: session.mode,
    bpm: session.bpm,
    meter: session.meter,
    complexity: session.complexity,
    harmonicFreedom: session.harmonicFreedom,
    timing: {
      sectionADurationSeconds: session.timeline[0]?.durationSeconds ?? 150,
      sectionBDurationSeconds: session.timeline[1]?.durationSeconds ?? 90,
      transitionWarningSeconds: session.transitionWarningSeconds,
    },
  };
}

function HarmonySectionCard({
  section,
  warningSeconds,
  settings,
  onChordChange,
}: {
  section: JamSection;
  warningSeconds: number;
  settings: GenerationSettings;
  onChordChange: (sectionId: string, chordId: string, roman: string) => void;
}) {
  const chordOptions = Array.from(
    new Map(
      getAvailableChordDefinitions(funkStyleProfile, settings)
        .map((definition) => [definition.roman, definition]),
    ).values(),
  );
  const chordGroups = groupChordsForDisplay(section.chords);
  const hasHalfBarPair = chordGroups.some(({ chords }) => chords.length === 2);

  function renderChordEditor(
    chord: JamChord,
    index: number,
    partnerRoman?: string,
    halfBar = false,
  ) {
    const availableOptions = chordOptions.filter(
      ({ roman }) => roman === chord.roman || roman !== partnerRoman,
    );

    return (
      <div
        className={`flex min-w-0 flex-col justify-center [container-type:inline-size] ${halfBar ? "p-4 text-center sm:p-5" : "overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] p-5"}`}
        key={chord.id}
      >
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{index + 1}</span>
          {halfBar ? (
            <span className="font-black uppercase tracking-[0.15em] text-[var(--accent)]">
              ½ такта
            </span>
          ) : (
            <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-sm font-bold text-[var(--accent)]">
              {formatChordDuration(chord.durationBars)}
            </span>
          )}
        </div>
        <p
          className={`mt-5 min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.04em] ${
            chord.renderedSymbol.length > 5
              ? halfBar
                ? "text-[clamp(1rem,14cqw,2.5rem)]"
                : "text-[clamp(1rem,16cqw,3rem)]"
              : halfBar
                ? "text-[clamp(1.5rem,21cqw,3.25rem)]"
                : "text-[clamp(1.75rem,22cqw,3.75rem)]"
          }`}
        >
          {chord.renderedSymbol}
        </p>
        <p className="mt-3 text-sm font-semibold tracking-[0.12em] text-neutral-400">
          {formatRomanChord(chord.roman)}
        </p>
        <label className="mt-4 block text-left text-xs text-neutral-500">
          Заменить аккорд
          <select
            aria-label={`Аккорд ${section.label}${index + 1}`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
            onChange={(event) =>
              onChordChange(section.id, chord.id, event.target.value)
            }
            value={chord.roman}
          >
            {availableOptions.map((definition) => (
              <option key={definition.roman} value={definition.roman}>
                {renderRomanChord(
                  definition.roman,
                  settings.key,
                  settings.mode,
                )}{" "}
                · {formatRomanChord(definition.roman)}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <section
      className="jam-card flex min-h-[360px] flex-col rounded-3xl border border-white/10 p-6 sm:p-10"
      data-testid={`harmony-card-${section.label.toLowerCase()}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
            Funk · Тема {section.label}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {section.label === "A" ? "Основной хук" : "Развитие основной темы"}
            {" · "}предупреждение за {warningSeconds} сек.
          </p>
        </div>
        <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-[var(--muted)]">
          {section.bars} тактов
        </div>
      </div>

      <div className={`my-auto grid gap-3 py-8 sm:grid-cols-2 ${hasHalfBarPair ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
        {chordGroups.map((group) =>
          group.chords.length === 2 ? (
            <div
              className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[var(--surface)]"
              key={group.id}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Один такт · две смены
                </span>
                <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-sm font-black text-[var(--accent)]">
                  1 такт
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/10">
                {renderChordEditor(
                  group.chords[0]!,
                  group.startIndex,
                  group.chords[1]?.roman,
                  true,
                )}
                {renderChordEditor(
                  group.chords[1]!,
                  group.startIndex + 1,
                  group.chords[0]?.roman,
                  true,
                )}
              </div>
            </div>
          ) : (
            renderChordEditor(group.chords[0]!, group.startIndex)
          ),
        )}
      </div>
    </section>
  );
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
  const [manualBpm, setManualBpm] = useState(103);
  const [manualBpmInput, setManualBpmInput] = useState("103");
  const [durationAInput, setDurationAInput] = useState("150");
  const [durationBInput, setDurationBInput] = useState("90");
  const [recentSessions, setRecentSessions] = useState<JamSession[]>([]);
  const [card, setCard] = useState(() =>
    createCard(INITIAL_CARD_CODE, DEFAULT_SETTINGS),
  );
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(
    null,
  );
  const chordEditingSettings: ResolvedGenerationSettings = {
    ...card.settings,
    harmonicFreedom: settings.harmonicFreedom,
  };

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const loaded = createJamPersistence(window.localStorage).load();

      if (!loaded.ok) {
        setPersistenceMessage(
          "Не удалось восстановить локально сохранённую сессию.",
        );
        return;
      }

      setRecentSessions(loaded.value?.recentSessions ?? []);

      if (loaded.value?.currentSession) {
        const restoredSettings =
          loaded.value.latestSettings ??
          settingsFromSession(loaded.value.currentSession);
        setSettings(restoredSettings);
        if (typeof restoredSettings.bpm === "number") {
          setManualBpm(restoredSettings.bpm);
          setManualBpmInput(String(restoredSettings.bpm));
        }
        setDurationAInput(
          String(restoredSettings.timing.sectionADurationSeconds),
        );
        setDurationBInput(
          String(restoredSettings.timing.sectionBDurationSeconds),
        );
        setCard({
          code: loaded.value.currentSession.seed,
          settings: {
            ...restoredSettings,
            bpm: loaded.value.currentSession.bpm,
          },
          session: loaded.value.currentSession,
          usedFallback: false,
        });
        setPersistenceMessage(
          "Последняя сессия восстановлена из этого браузера.",
        );
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  function saveCurrentSession(
    session: JamSession,
    latestSettings: GenerationSettings,
    addToFront = true,
  ) {
    const nextRecent = [
      ...(addToFront ? [session] : []),
      ...recentSessions.map((item) => (item.id === session.id ? session : item)),
    ]
      .filter(
        (item, index, items) =>
          items.findIndex(({ id }) => id === item.id) === index,
      )
      .slice(0, MAX_RECENT_SESSIONS);
    const persistedState: PersistedJamState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      currentSession: session,
      recentSessions: nextRecent,
      latestSettings: {
        ...latestSettings,
        timing: { ...latestSettings.timing },
      },
      selectedTheme: "dark",
    };
    const saved = createJamPersistence(window.localStorage).save(persistedState);
    setRecentSessions(nextRecent);
    setPersistenceMessage(
      saved.ok
        ? "Сессия сохранена в этом браузере."
        : "Изменения применены, но браузер не разрешил локальное сохранение.",
    );
  }

  function openSession(session: JamSession) {
    const restoredSettings = settingsFromSession(session);
    setSettings(restoredSettings);
    setManualBpm(session.bpm);
    setManualBpmInput(String(session.bpm));
    setDurationAInput(
      String(restoredSettings.timing.sectionADurationSeconds),
    );
    setDurationBInput(
      String(restoredSettings.timing.sectionBDurationSeconds),
    );
    setCard({
      code: session.seed,
      settings: { ...restoredSettings, bpm: session.bpm },
      session,
      usedFallback: false,
    });
    saveCurrentSession(session, restoredSettings, false);
    setCopyStatus("idle");
  }

  function generateNewHarmony() {
    try {
      const code = createCardCode();
      const nextCard = createCard(code, settings);
      setCard(nextCard);
      saveCurrentSession(nextCard.session, settings);
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

  function applyTimingSettings() {
    const nextSession = retimeSession(card.session, settings, funkStyleProfile);
    const nextSettings: ResolvedGenerationSettings = {
      ...card.settings,
      bpm: nextSession.bpm,
      timing: { ...settings.timing },
    };
    setCard((current) => ({
      ...current,
      settings: nextSettings,
      session: nextSession,
    }));
    saveCurrentSession(nextSession, settings);
    setPersistenceMessage("Темп и длительности применены к этой гармонии.");
  }

  function replaceChord(sectionId: string, chordId: string, roman: string) {
    const definition = getAvailableChordDefinitions(
      funkStyleProfile,
      chordEditingSettings,
    ).find((item) => item.roman === roman);
    if (!definition) return;

    const targetSection = card.session.sections.find(
      (section) => section.id === sectionId,
    );
    const chordIndex = targetSection?.chords.findIndex(
      (chord) => chord.id === chordId,
    );
    const targetChord =
      chordIndex === undefined || chordIndex < 0
        ? undefined
        : targetSection?.chords[chordIndex];
    const previousChord =
      chordIndex === undefined || chordIndex < 1
        ? undefined
        : targetSection?.chords[chordIndex - 1];
    const nextHalfChord =
      chordIndex === undefined || chordIndex < 0
        ? undefined
        : targetSection?.chords[chordIndex + 1];
    const duplicatesHalfBarPartner =
      targetChord?.durationBars === 0.5 &&
      ((previousChord?.durationBars === 0.5 && previousChord.roman === roman) ||
        (nextHalfChord?.durationBars === 0.5 && nextHalfChord.roman === roman));

    if (duplicatesHalfBarPartner) {
      setError("В двух половинах одного такта должны быть разные аккорды.");
      return;
    }

    const nextChord = (chord: JamChord): JamChord =>
      chord.id === chordId
        ? {
            ...chord,
            source: "manual",
            roman: definition.roman,
            renderedSymbol: renderRomanChord(
              definition.roman,
              card.session.key,
              card.session.mode,
            ),
            harmonicFunction: definition.harmonicFunction,
          }
        : chord;
    const nextSession: JamSession = {
      ...card.session,
      harmonicFreedom: chordEditingSettings.harmonicFreedom,
      sections: card.session.sections.map((section) =>
        section.id === sectionId
          ? { ...section, chords: section.chords.map(nextChord) }
          : section,
      ),
    };
    setCard((current) => ({
      ...current,
      settings: chordEditingSettings,
      session: nextSession,
    }));
    saveCurrentSession(nextSession, chordEditingSettings);
    setError(null);
  }

  async function copyCardCode() {
    try {
      await copyText(card.code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function commitManualBpm(rawValue: string) {
    const parsed = Number(rawValue);
    const nextBpm = Number.isFinite(parsed)
      ? Math.min(MAX_MANUAL_BPM, Math.max(MIN_MANUAL_BPM, parsed))
      : manualBpm;
    setManualBpm(nextBpm);
    setManualBpmInput(String(nextBpm));
    setSettings((current) => ({ ...current, bpm: nextBpm }));
  }

  function commitDuration(part: "A" | "B", rawValue: string) {
    const fallback =
      part === "A"
        ? settings.timing.sectionADurationSeconds
        : settings.timing.sectionBDurationSeconds;
    const parsed = Number(rawValue);
    const duration = Number.isFinite(parsed)
      ? Math.min(MAX_SECTION_SECONDS, Math.max(MIN_SECTION_SECONDS, parsed))
      : fallback;
    if (part === "A") setDurationAInput(String(duration));
    else setDurationBInput(String(duration));
    setSettings((current) => ({
      ...current,
      timing: {
        ...current.timing,
        [part === "A"
          ? "sectionADurationSeconds"
          : "sectionBDurationSeconds"]: duration,
      },
    }));
  }

  return (
    <main className="editor-shell mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
            First playable slice
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            Jam Randomizer
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Создавайте Funk-сессию A → B → A и сохраняйте код понравившейся
            или проблемной карточки.
          </p>
        </div>
        <RouteLink href="/stage">Stage Mode</RouteLink>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="control-panel rounded-3xl border border-white/10 p-5 sm:p-6">
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
              Сложность аккордов
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

            <fieldset className="col-span-2 lg:col-span-1">
              <legend className="text-sm text-[var(--muted)]">Темп</legend>
              <div className="grid grid-cols-[1fr_112px] gap-2">
                <select
                  aria-label="Режим BPM"
                  className={FIELD_CLASS}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      bpm:
                        event.target.value === "random" ? "random" : manualBpm,
                    }))
                  }
                  value={settings.bpm === "random" ? "random" : "manual"}
                >
                  <option value="random">Random</option>
                  <option value="manual">Вручную</option>
                </select>
                <input
                  aria-label="BPM"
                  className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                  disabled={settings.bpm === "random"}
                  max={MAX_MANUAL_BPM}
                  min={MIN_MANUAL_BPM}
                  onBlur={(event) => commitManualBpm(event.target.value)}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    if (!/^\d{0,3}$/.test(rawValue)) return;
                    setManualBpmInput(rawValue);
                    const parsed = Number(rawValue);
                    if (
                      rawValue !== "" &&
                      parsed >= MIN_MANUAL_BPM &&
                      parsed <= MAX_MANUAL_BPM
                    ) {
                      setManualBpm(parsed);
                      setSettings((current) => ({ ...current, bpm: parsed }));
                    }
                  }}
                  placeholder={`${funkStyleProfile.bpmRange.min}–${funkStyleProfile.bpmRange.max}`}
                  type="number"
                  value={settings.bpm === "random" ? "" : manualBpmInput}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Random для Funk: {funkStyleProfile.bpmRange.min}–
                {funkStyleProfile.bpmRange.max} BPM
              </p>
            </fieldset>

            <fieldset className="col-span-2 lg:col-span-1">
              <legend className="text-sm text-[var(--muted)]">
                Длительность частей
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-neutral-500">
                  A, секунд
                  <input
                    aria-label="Длительность A"
                    className={FIELD_CLASS}
                    max={MAX_SECTION_SECONDS}
                    min={MIN_SECTION_SECONDS}
                    onBlur={(event) => commitDuration("A", event.target.value)}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      if (!/^\d{0,4}$/.test(rawValue)) return;
                      setDurationAInput(rawValue);
                      const parsed = Number(rawValue);
                      if (
                        rawValue !== "" &&
                        parsed >= MIN_SECTION_SECONDS &&
                        parsed <= MAX_SECTION_SECONDS
                      ) {
                        setSettings((current) => ({
                          ...current,
                          timing: {
                            ...current.timing,
                            sectionADurationSeconds: parsed,
                          },
                        }));
                      }
                    }}
                    type="number"
                    value={durationAInput}
                  />
                </label>
                <label className="text-xs text-neutral-500">
                  B, секунд
                  <input
                    aria-label="Длительность B"
                    className={FIELD_CLASS}
                    max={MAX_SECTION_SECONDS}
                    min={MIN_SECTION_SECONDS}
                    onBlur={(event) => commitDuration("B", event.target.value)}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      if (!/^\d{0,4}$/.test(rawValue)) return;
                      setDurationBInput(rawValue);
                      const parsed = Number(rawValue);
                      if (
                        rawValue !== "" &&
                        parsed >= MIN_SECTION_SECONDS &&
                        parsed <= MAX_SECTION_SECONDS
                      ) {
                        setSettings((current) => ({
                          ...current,
                          timing: {
                            ...current.timing,
                            sectionBDurationSeconds: parsed,
                          },
                        }));
                      }
                    }}
                    type="number"
                    value={durationBInput}
                  />
                </label>
              </div>
            </fieldset>
          </div>

          <button
            className="mt-6 w-full rounded-xl border border-[var(--accent)]/60 px-5 py-3 font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
            onClick={applyTimingSettings}
            type="button"
          >
            Применить темп и длительности
          </button>

          <button
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-black transition hover:brightness-90 active:scale-[0.99]"
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

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Сессии хранятся только в localStorage этого браузера и могут исчезнуть
            после очистки данных сайта или работы в приватном режиме.
          </p>
          {persistenceMessage ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{persistenceMessage}</p>
          ) : null}
        </section>

        <div className="space-y-5">
          <div className="session-strip flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 px-5 py-4">
            <h2 className="text-2xl font-black sm:text-3xl">
              {card.settings.key} {card.settings.mode}
            </h2>
            <div className="text-sm text-[var(--muted)]">
              {card.settings.meter} ·{" "}
              <span data-testid="card-bpm">{card.settings.bpm} BPM</span> · A → B → A
            </div>
          </div>

          {card.session.sections.map((section) => (
            <HarmonySectionCard
              key={section.id}
              onChordChange={replaceChord}
              section={section}
              settings={chordEditingSettings}
              warningSeconds={
                card.session.timeline.find(
                  ({ sectionId }) => sectionId === section.id,
                )?.transitionWarningSeconds ?? 0
              }
            />
          ))}

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface)] px-5 py-4 text-xs text-[var(--muted)]">
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
              {card.usedFallback ? "Безопасный вариант" : "Проверено"}
            </span>
          </footer>
        </div>
      </div>

      <section className="history-panel mt-8 rounded-3xl border border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
              Local history
            </p>
            <h2 className="mt-2 text-2xl font-black">История карточек</h2>
          </div>
          <p className="text-xs text-neutral-500">До {MAX_RECENT_SESSIONS} карточек в этом браузере</p>
        </div>
        {recentSessions.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentSessions.map((session) => (
              <article
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"
                key={session.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{session.seed}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {session.key} {session.mode} · {session.bpm} BPM
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  onClick={() => openSession(session)}
                  type="button"
                >
                  Открыть
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--muted)]">
            Здесь появятся созданные карточки.
          </p>
        )}
      </section>
    </main>
  );
}
