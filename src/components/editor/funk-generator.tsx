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
  SectionHarmonySettings,
  SectionDurationMode,
  SectionLabel,
} from "@/lib/music/domain/types";
import {
  generateSession,
  regenerateSessionSections,
  retimeSession,
  sessionForm,
  setSessionForm,
  transposeSessionSections,
} from "@/lib/music/generator";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";
import { parseChordSymbol } from "@/lib/music/rendering/parse-chord-symbol";
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
  resolveDifferentRandomBpm,
} from "@/lib/music/tempo/resolve-bpm";
import {
  durationSecondsFromSquares,
  RANDOM_SQUARE_RANGES,
  sectionDurationMode,
  sectionDurationSettings,
  squareDurationSeconds,
} from "@/lib/music/tempo/section-duration";
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
    sectionADurationMode: "random",
    sectionBDurationMode: "random",
    sectionASquares: 16,
    sectionBSquares: 8,
    sectionDurations: {
      A: { mode: "random", seconds: 150, squares: 16 },
      B: { mode: "random", seconds: 90, squares: 8 },
      C: { mode: "random", seconds: 90, squares: 8 },
      D: { mode: "random", seconds: 60, squares: 8 },
    },
    transitionWarningSeconds: 10,
  },
};

const SECTION_LABELS: SectionLabel[] = ["A", "B", "C", "D"];
const SECTION_DESCRIPTIONS: Record<SectionLabel, string> = {
  A: "Основная тема",
  B: "Развитие",
  C: "Бридж",
  D: "Кода",
};
const FORM_PRESETS: Record<string, SectionLabel[]> = {
  ABA: ["A", "B", "A"],
  ABAB: ["A", "B", "A", "B"],
  ABCABC: ["A", "B", "C", "A", "B", "C"],
  ABCD: ["A", "B", "C", "D"],
};

const FIELD_CLASS =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent)]";
const CARD_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const INITIAL_CARD_CODE = "FUNK-START";
const MIN_SECTION_SECONDS = 30;
const MAX_SECTION_SECONDS = 1_800;
const MIN_SECTION_SQUARES = 1;
const MAX_SECTION_SQUARES = 64;

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

function harmonySettingsFromGeneration(
  settings: GenerationSettings,
): SectionHarmonySettings {
  return {
    key: settings.key,
    mode: settings.mode,
    complexity: settings.complexity,
    harmonicFreedom: settings.harmonicFreedom,
  };
}

function sectionSettingsFromSession(
  session: JamSession,
  drafts?: Partial<Record<SectionLabel, SectionHarmonySettings>> | null,
): Record<SectionLabel, SectionHarmonySettings> {
  const fallback = harmonySettingsFromGeneration(settingsFromSession(session));
  return Object.fromEntries(
    SECTION_LABELS.map((label) => [
      label,
      drafts?.[label] ??
        session.sections.find((section) => section.label === label)
          ?.harmonySettings ??
        fallback,
    ]),
  ) as Record<SectionLabel, SectionHarmonySettings>;
}

function createCard(
  seed: string,
  settings: GenerationSettings,
  sectionSettings: Record<SectionLabel, SectionHarmonySettings>,
) {
  const result = generateSession({
    seed,
    settings,
    styleProfile: funkStyleProfile,
    sectionSettings,
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
  const sectionDurations = Object.fromEntries(
    SECTION_LABELS.map((label) => {
      const section = session.sections.find((item) => item.label === label);
      const durationSeconds = session.timeline.find(
        (step) => step.sectionId === section?.id,
      )?.durationSeconds;
      return [
        label,
        {
          mode: "seconds" as const,
          seconds: durationSeconds ?? (label === "A" ? 150 : label === "D" ? 60 : 90),
          squares: RANDOM_SQUARE_RANGES[label].min,
        },
      ];
    }),
  ) as NonNullable<GenerationSettings["timing"]["sectionDurations"]>;
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
      sectionADurationMode: "seconds",
      sectionBDurationMode: "seconds",
      sectionASquares: 16,
      sectionBSquares: 8,
      sectionDurations,
      transitionWarningSeconds: session.transitionWarningSeconds,
    },
  };
}

function rebuildSectionChords(
  section: JamSection,
  chords: JamChord[],
): JamSection {
  let startBar = 0;
  const normalizedChords = chords.map((chord) => {
    const normalized = { ...chord, startBar };
    startBar += chord.durationBars;
    return normalized;
  });

  return {
    ...section,
    bars: startBar,
    chords: normalizedChords,
  };
}

function recalculateEditedSession(session: JamSession): JamSession {
  const timing = settingsFromSession(session).timing;
  return retimeSession(
    session,
    {
      ...settingsFromSession(session),
      bpm: session.bpm,
      meter: session.meter,
      timing,
    },
    funkStyleProfile,
  );
}

function formatComplexity(complexity: Complexity): string {
  return {
    easy: "простые аккорды",
    medium: "средние аккорды",
    advanced: "сложные аккорды",
  }[complexity];
}

function formatHarmonicFreedom(freedom: HarmonicFreedom): string {
  return {
    strict: "строго в тональности",
    colorful: "с гармоническими красками",
    adventurous: "свободная гармония",
  }[freedom];
}

function formatApproximateTime(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const JAZZ_CHORD_INPUT_SUGGESTIONS = [
  ["", "мажорное трезвучие"],
  ["m", "минорное трезвучие"],
  ["min", "минор — альтернативная запись"],
  ["-", "минор — джазовая запись"],
  ["6", "мажорный секстаккорд"],
  ["6/9", "секстаккорд с ноной"],
  ["7", "доминантсептаккорд"],
  ["maj7", "большой мажорный септаккорд"],
  ["M7", "maj7 — альтернативная запись"],
  ["Δ7", "maj7 — джазовая запись"],
  ["m7", "минорный септаккорд"],
  ["min7", "m7 — альтернативная запись"],
  ["-7", "m7 — джазовая запись"],
  ["9", "доминантовый нонаккорд"],
  ["maj9", "большой мажорный нонаккорд"],
  ["m9", "минорный нонаккорд"],
  ["11", "ундецимаккорд"],
  ["m11", "минорный ундецимаккорд"],
  ["13", "терцдецимаккорд"],
  ["m13", "минорный терцдецимаккорд"],
  ["sus2", "аккорд с задержанной второй"],
  ["sus4", "аккорд с задержанной четвёртой"],
  ["add9", "трезвучие с добавленной ноной"],
  ["7b9", "доминанта с пониженной ноной"],
  ["7#9", "доминанта с повышенной ноной"],
  ["13sus4", "терцдецимаккорд sus4"],
  ["m7b5", "полууменьшённый септаккорд"],
  ["ø7", "m7b5 — джазовая запись"],
  ["dim", "уменьшённое трезвучие"],
  ["dim7", "уменьшённый септаккорд"],
  ["°7", "dim7 — джазовая запись"],
  ["aug", "увеличенное трезвучие"],
  ["+", "aug — джазовая запись"],
] as const;

function ChordCombobox({
  chordId,
  label,
  mode,
  options,
  onCommit,
}: {
  chordId: string;
  label: string;
  mode: Mode;
  options: { symbol: string; roman: string }[];
  onCommit: (symbol: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const listId = `chord-options-${chordId}`;
  const rootMatch = /^([A-Ga-g])([#b♯♭]?)/.exec(draft.trim());
  const inputRoot = rootMatch
    ? `${rootMatch[1].toUpperCase()}${rootMatch[2] ?? ""}`
    : null;
  const suggestions = Array.from(
    new Map(
      [
        ...options.map(({ symbol, roman }) => ({
          symbol,
          description: formatRomanChord(roman, mode),
        })),
        ...(inputRoot
          ? JAZZ_CHORD_INPUT_SUGGESTIONS.map(([suffix, description]) => ({
              symbol: `${inputRoot}${suffix}`,
              description,
            }))
          : []),
      ].map((suggestion) => [suggestion.symbol, suggestion]),
    ).values(),
  );

  function commit(): boolean {
    const normalized = draft.trim();
    if (normalized === "") return false;
    if (onCommit(normalized)) {
      setDraft("");
      return true;
    }
    setDraft("");
    return false;
  }

  return (
    <div className="mt-1 flex min-w-0 gap-2">
      <input
        aria-label={label}
        autoComplete="off"
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white outline-none transition focus:border-[var(--accent)]"
        list={listId}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (commit()) event.currentTarget.blur();
        }}
        placeholder="Новый аккорд"
        value={draft}
      />
      <datalist id={listId}>
        {suggestions.map(({ symbol, description }) => (
          <option key={`${description}-${symbol}`} value={symbol}>
            {description}
          </option>
        ))}
      </datalist>
      <button
        aria-label={`Применить ${label.toLowerCase()}`}
        className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        disabled={draft.trim() === ""}
        onClick={commit}
        type="button"
      >
        OK
      </button>
    </div>
  );
}

function HarmonySectionCard({
  section,
  warningSeconds,
  settings,
  onChordChange,
  onDurationChange,
  onSplitChord,
  onMergePair,
  onAddChord,
  onRemoveChord,
  focused,
  onToggleFocus,
}: {
  section: JamSection;
  warningSeconds: number;
  settings: GenerationSettings;
  onChordChange: (sectionId: string, chordId: string, symbol: string) => boolean;
  onDurationChange: (
    sectionId: string,
    chordId: string,
    durationBars: number,
  ) => void;
  onSplitChord: (sectionId: string, chordId: string) => void;
  onMergePair: (sectionId: string, firstId: string, secondId: string) => void;
  onAddChord: (sectionId: string) => void;
  onRemoveChord: (sectionId: string, chordId: string) => void;
  focused: boolean;
  onToggleFocus: (label: SectionLabel) => void;
}) {
  const chordOptions = Array.from(
    new Map(
      [
        ...getAvailableChordDefinitions(funkStyleProfile, settings),
        ...funkStyleProfile.chordVocabulary.filter(({ roman }) =>
          section.chords.some((chord) => chord.roman === roman),
        ),
      ]
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
          {formatRomanChord(chord.roman, settings.mode)}
        </p>
        <div className="mt-4 block text-left text-xs text-neutral-500">
          <p>Заменить аккорд</p>
          <ChordCombobox
            chordId={chord.id}
            key={`${chord.id}-${chord.renderedSymbol}`}
            label={`Аккорд ${section.label}${index + 1}`}
            mode={settings.mode}
            onCommit={(symbol) =>
              onChordChange(section.id, chord.id, symbol)
            }
            options={availableOptions.map((definition) => ({
              symbol: renderRomanChord(
                definition.roman,
                settings.key,
                settings.mode,
              ),
              roman: definition.roman,
            }))}
          />
        </div>
        <div className="mt-3">
          <label className="block text-left text-xs text-neutral-500">
            Длительность
            <select
              aria-label={`Длительность ${section.label}${index + 1}`}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
              onChange={(event) =>
                onDurationChange(
                  section.id,
                  chord.id,
                  Number(event.target.value),
                )
              }
              value={chord.durationBars}
            >
              {settings.meter === "4/4" ? (
                <option value="0.5">½ такта</option>
              ) : null}
              <option value="1">1 такт</option>
              <option value="2">2 такта</option>
              <option value="4">4 такта</option>
            </select>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              aria-hidden={
                chord.durationBars !== 1 || halfBar || settings.meter !== "4/4"
              }
              className={`rounded-lg border border-white/15 px-2 py-2 text-xs font-bold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)] ${chord.durationBars === 1 && !halfBar && settings.meter === "4/4" ? "visible" : "invisible pointer-events-none"}`}
              disabled={
                chord.durationBars !== 1 || halfBar || settings.meter !== "4/4"
              }
              onClick={() => onSplitChord(section.id, chord.id)}
              tabIndex={
                chord.durationBars === 1 && !halfBar && settings.meter === "4/4"
                  ? 0
                  : -1
              }
              type="button"
            >
              Разбить
            </button>
            <button
              className="rounded-lg border border-red-400/25 px-2 py-2 text-xs font-bold text-red-200 transition hover:border-red-300 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-neutral-700"
              disabled={section.chords.length <= 1}
              onClick={() => onRemoveChord(section.id, chord.id)}
              title={
                section.chords.length <= 1
                  ? "В теме должен остаться хотя бы один аккорд"
                  : "Удалить аккорд"
              }
              type="button"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`jam-card flex min-h-[420px] flex-col rounded-3xl border p-6 transition sm:p-8 xl:p-10 ${focused ? "border-[var(--accent)] shadow-[0_0_32px_rgba(220,255,65,0.10)]" : "border-white/10"}`}
      data-testid={`harmony-card-${section.label.toLowerCase()}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
            Funk · Тема {section.label}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {SECTION_DESCRIPTIONS[section.label]}
            {" · "}следующая тема появится за {warningSeconds} сек.
          </p>
          <p className="mt-2 text-sm font-semibold text-neutral-300">
            {section.harmonySettings.key}{" "}
            {section.harmonySettings.mode === "major" ? "мажор" : "минор"}
            {" · "}{formatComplexity(section.harmonySettings.complexity)}{" · "}
            {formatHarmonicFreedom(section.harmonySettings.harmonicFreedom)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:border-white/5 disabled:text-neutral-600"
            disabled={section.chords.length >= 8}
            onClick={() => onAddChord(section.id)}
            title={
              section.chords.length >= 8
                ? "В теме уже максимальные 8 аккордов"
                : "Добавить аккорд в конец темы"
            }
            type="button"
          >
            + Аккорд
          </button>
          <button
            aria-pressed={focused}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${focused ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/15 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
            onClick={() => onToggleFocus(section.label)}
            type="button"
          >
            {focused ? "Настраивается" : "Настроить отдельно"}
          </button>
          <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-[var(--muted)]">
            {formatChordDuration(section.bars)}
          </div>
        </div>
      </div>

      <div className={`my-auto grid gap-4 py-8 sm:grid-cols-2 ${hasHalfBarPair ? "2xl:grid-cols-3" : "2xl:grid-cols-4"}`}>
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
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-sm font-black text-[var(--accent)]">
                    1 такт
                  </span>
                  <button
                    className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    onClick={() =>
                      onMergePair(
                        section.id,
                        group.chords[0]!.id,
                        group.chords[1]!.id,
                      )
                    }
                    type="button"
                  >
                    Объединить
                  </button>
                </div>
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
  const [appliedTimingSettings, setAppliedTimingSettings] =
    useState(DEFAULT_SETTINGS);
  const [sectionSettings, setSectionSettings] = useState<
    Record<SectionLabel, SectionHarmonySettings>
  >(
    Object.fromEntries(
      SECTION_LABELS.map((label) => [
        label,
        harmonySettingsFromGeneration(DEFAULT_SETTINGS),
      ]),
    ) as Record<SectionLabel, SectionHarmonySettings>,
  );
  const [focusedLabels, setFocusedLabels] = useState<SectionLabel[]>([]);
  const [activeSettingsLabel, setActiveSettingsLabel] =
    useState<SectionLabel>("A");
  const [manualBpm, setManualBpm] = useState(103);
  const [manualBpmInput, setManualBpmInput] = useState("103");
  const [durationInputs, setDurationInputs] = useState<Record<SectionLabel, string>>({
    A: "150", B: "90", C: "90", D: "60",
  });
  const [squaresInputs, setSquaresInputs] = useState<Record<SectionLabel, string>>({
    A: "16", B: "8", C: "8", D: "8",
  });
  const [recentSessions, setRecentSessions] = useState<JamSession[]>([]);
  const [card, setCard] = useState(() =>
    createCard(INITIAL_CARD_CODE, DEFAULT_SETTINGS, {
      A: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
      B: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
      C: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
      D: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
    }),
  );
  const [formEditorMode, setFormEditorMode] = useState<"preset" | "custom">("preset");
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(
    null,
  );
  const editingAllThemes = focusedLabels.length === 0;
  const activeThemeFocused =
    editingAllThemes || focusedLabels.includes(activeSettingsLabel);
  const activeHarmonySettings = sectionSettings[activeSettingsLabel];
  const existingLabels = card.session.sections.map(({ label }) => label);
  const currentForm = sessionForm(card.session);
  const currentPreset = Object.entries(FORM_PRESETS).find(
    ([, form]) => form.join("") === currentForm.join(""),
  )?.[0];
  const allExistingThemesShare = <K extends keyof SectionHarmonySettings>(key: K) =>
    existingLabels.every(
      (label) => sectionSettings[label][key] === activeHarmonySettings[key],
    );
  const displayedKey =
    editingAllThemes && !allExistingThemesShare("key")
      ? ""
      : activeHarmonySettings.key;
  const displayedMode =
    editingAllThemes && !allExistingThemesShare("mode")
      ? ""
      : activeHarmonySettings.mode;
  const displayedComplexity =
    editingAllThemes &&
    !allExistingThemesShare("complexity")
      ? ""
      : activeHarmonySettings.complexity;
  const displayedFreedom =
    editingAllThemes &&
    !allExistingThemesShare("harmonicFreedom")
      ? ""
      : activeHarmonySettings.harmonicFreedom;
  const timingSettingsDirty =
    settings.bpm !== appliedTimingSettings.bpm ||
    settings.meter !== appliedTimingSettings.meter ||
    JSON.stringify(settings.timing) !==
      JSON.stringify(appliedTimingSettings.timing);
  const harmonyTargetLabels = focusedLabels.length
    ? focusedLabels
    : existingLabels;
  const transpositionBlockedByMode = harmonyTargetLabels.some((label) => {
    const section = card.session.sections.find((item) => item.label === label);
    return section?.harmonySettings.mode !== sectionSettings[label].mode;
  });
  const transpositionDirty =
    !transpositionBlockedByMode &&
    harmonyTargetLabels.some((label) => {
      const section = card.session.sections.find((item) => item.label === label);
      return section?.harmonySettings.key !== sectionSettings[label].key;
    });

  function syncTimingInputs(nextSettings: GenerationSettings) {
    setDurationInputs(
      Object.fromEntries(
        SECTION_LABELS.map((label) => [
          label,
          String(sectionDurationSettings(nextSettings.timing, label).seconds),
        ]),
      ) as Record<SectionLabel, string>,
    );
    setSquaresInputs(
      Object.fromEntries(
        SECTION_LABELS.map((label) => [
          label,
          String(sectionDurationSettings(nextSettings.timing, label).squares),
        ]),
      ) as Record<SectionLabel, string>,
    );
  }

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
        setAppliedTimingSettings(
          loaded.value.appliedTimingSettings ??
            settingsFromSession(loaded.value.currentSession),
        );
        setSectionSettings(
          sectionSettingsFromSession(
            loaded.value.currentSession,
            loaded.value.latestSectionSettings,
          ),
        );
        if (typeof restoredSettings.bpm === "number") {
          setManualBpm(restoredSettings.bpm);
          setManualBpmInput(String(restoredSettings.bpm));
        }
        syncTimingInputs(restoredSettings);
        setCard({
          code: loaded.value.currentSession.seed,
          settings: {
            ...restoredSettings,
            bpm: loaded.value.currentSession.bpm,
          },
          session: loaded.value.currentSession,
          usedFallback: false,
        });
        setPersistenceMessage(null);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  function saveCurrentSession(
    session: JamSession,
    latestSettings: GenerationSettings,
    addToFront = true,
    nextSectionSettings = sectionSettings,
    nextAppliedTimingSettings = appliedTimingSettings,
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
      latestSectionSettings: nextSectionSettings,
      appliedTimingSettings: nextAppliedTimingSettings,
      selectedTheme: "dark",
    };
    const saved = createJamPersistence(window.localStorage).save(persistedState);
    setRecentSessions(nextRecent);
    setPersistenceMessage(
      saved.ok
        ? null
        : "Изменения применены, но браузер не разрешил сохранить сессию на этом устройстве.",
    );
  }

  function commitCardMutation(
    session: JamSession,
    message: string,
    nextSectionSettings = sectionSettings,
    nextAppliedTimingSettings = appliedTimingSettings,
  ) {
    const code = createCardCode();
    const identifiedSession: JamSession = {
      ...session,
      id: `session-${code}`,
      seed: code,
      createdAt: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    setCard((current) => ({
      ...current,
      code,
      session: identifiedSession,
    }));
    saveCurrentSession(
      identifiedSession,
      settings,
      true,
      nextSectionSettings,
      nextAppliedTimingSettings,
    );
    setPersistenceMessage(message);
    setCopyStatus("idle");
  }

  function openSession(session: JamSession) {
    const restoredSettings = settingsFromSession(session);
    setSettings(restoredSettings);
    setAppliedTimingSettings(restoredSettings);
    setSectionSettings(sectionSettingsFromSession(session));
    setFocusedLabels([]);
    setManualBpm(session.bpm);
    setManualBpmInput(String(session.bpm));
    syncTimingInputs(restoredSettings);
    setCard({
      code: session.seed,
      settings: { ...restoredSettings, bpm: session.bpm },
      session,
      usedFallback: false,
    });
    saveCurrentSession(
      session,
      restoredSettings,
      false,
      sectionSettingsFromSession(session),
      restoredSettings,
    );
    setCopyStatus("idle");
  }

  function generateNewHarmony() {
    try {
      const code = createCardCode();
      const targetLabels: SectionLabel[] = focusedLabels.length
        ? focusedLabels
        : card.session.sections.map(({ label }) => label);
      const generationSession =
        settings.bpm === "random"
          ? {
              ...card.session,
              bpm: resolveDifferentRandomBpm(
                card.session.bpm,
                funkStyleProfile.bpmRange,
                code,
              ),
            }
          : card.session;
      const result = regenerateSessionSections({
        session: generationSession,
        sectionLabels: targetLabels,
        sectionSettings,
        seed: code,
        styleProfile: funkStyleProfile,
      });
      const retimedSession = retimeSession(
        result.value,
        {
          ...settings,
          bpm: result.value.bpm,
        },
        funkStyleProfile,
      );
      const nextCard = {
        code,
        settings: {
          ...settings,
          key: result.value.key,
          mode: result.value.mode,
          complexity: result.value.complexity,
          harmonicFreedom: result.value.harmonicFreedom,
          bpm: result.value.bpm,
          timing: { ...settings.timing },
        } satisfies ResolvedGenerationSettings,
        session: retimedSession,
        usedFallback: result.usedFallback,
      };
      setCard(nextCard);
      setAppliedTimingSettings(settings);
      saveCurrentSession(
        nextCard.session,
        settings,
        true,
        sectionSettings,
        settings,
      );
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

  function applyTransposition() {
    const nextSession = transposeSessionSections(
      card.session,
      harmonyTargetLabels,
      Object.fromEntries(
        harmonyTargetLabels.map((label) => [label, sectionSettings[label].key]),
      ),
    );
    commitCardMutation(
      nextSession,
      `Транспонированы темы: ${harmonyTargetLabels.join(" + ")}.`,
    );
    setError(null);
  }

  function applyTimingSettings() {
    const nextSession = retimeSession(card.session, settings, funkStyleProfile);
    const nextSettings: ResolvedGenerationSettings = {
      ...card.settings,
      bpm: nextSession.bpm,
      meter: nextSession.meter,
      timing: { ...settings.timing },
    };
    setCard((current) => ({ ...current, settings: nextSettings }));
    setAppliedTimingSettings(settings);
    commitCardMutation(
      nextSession,
      "Темп, размер и длительности обновлены. Аккорды не изменились.",
      sectionSettings,
      settings,
    );
  }

  function replaceChord(sectionId: string, chordId: string, symbol: string): boolean {
    const targetSection = card.session.sections.find(
      (section) => section.id === sectionId,
    );
    if (!targetSection) return false;
    const draftSettings = sectionSettings[targetSection.label];
    const parsed = parseChordSymbol(
      symbol,
      targetSection.harmonySettings.key,
      targetSection.harmonySettings.mode,
    );
    if (!parsed) {
      setError(
        "Не удалось распознать аккорд. Используйте обозначение вроде C#m7b5, Bb13sus4 или C/E.",
      );
      return false;
    }
    const chordIndex = targetSection?.chords.findIndex(
      (chord) => chord.id === chordId,
    );
    const targetChord =
      chordIndex === undefined || chordIndex < 0
        ? undefined
        : targetSection?.chords[chordIndex];
    if (targetChord?.roman === parsed.roman) {
      setError(null);
      return true;
    }
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
      ((previousChord?.durationBars === 0.5 && previousChord.roman === parsed.roman) ||
        (nextHalfChord?.durationBars === 0.5 && nextHalfChord.roman === parsed.roman));

    if (duplicatesHalfBarPartner) {
      setError("В двух половинах одного такта должны быть разные аккорды.");
      return false;
    }

    const nextChord = (chord: JamChord): JamChord =>
      chord.id === chordId
        ? {
            ...chord,
            source: "manual",
            roman: parsed.roman,
            renderedSymbol: parsed.renderedSymbol,
            harmonicFunction: parsed.harmonicFunction,
          }
        : chord;
    const nextSession: JamSession = {
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              harmonySettings: {
                ...section.harmonySettings,
                complexity: draftSettings.complexity,
                harmonicFreedom: draftSettings.harmonicFreedom,
              },
              chords: section.chords.map(nextChord),
            }
          : section,
      ),
    };
    commitCardMutation(nextSession, "Аккорд изменён.");
    setError(null);
    return true;
  }

  function changeChordDuration(
    sectionId: string,
    chordId: string,
    durationBars: number,
  ) {
    const targetSection = card.session.sections.find(
      ({ id }) => id === sectionId,
    );
    if (!targetSection || ![0.5, 1, 2, 4].includes(durationBars)) return;
    if (settings.meter === "3/4" && durationBars === 0.5) {
      setError("Половина такта доступна только в размере 4/4.");
      return;
    }
    const chordIndex = targetSection.chords.findIndex(({ id }) => id === chordId);
    const chord = targetSection.chords[chordIndex];
    if (!chord) return;
    const previous = targetSection.chords[chordIndex - 1];
    const next = targetSection.chords[chordIndex + 1];
    if (
      durationBars === 0.5 &&
      ((previous?.durationBars === 0.5 && previous.roman === chord.roman) ||
        (next?.durationBars === 0.5 && next.roman === chord.roman))
    ) {
      setError("В двух половинах одного такта должны быть разные аккорды.");
      return;
    }

    const editedSection = rebuildSectionChords(
      targetSection,
      targetSection.chords.map((item) =>
        item.id === chordId
          ? { ...item, source: "manual", durationBars }
          : item,
      ),
    );
    const nextSession = recalculateEditedSession({
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId ? editedSection : section,
      ),
    });
    commitCardMutation(
      nextSession,
      "Длительность аккорда изменена.",
    );
    setError(null);
  }

  function splitChord(sectionId: string, chordId: string) {
    if (settings.meter !== "4/4") {
      setError("Деление такта пополам доступно только в размере 4/4.");
      return;
    }
    const targetSection = card.session.sections.find(
      ({ id }) => id === sectionId,
    );
    const targetChord = targetSection?.chords.find(({ id }) => id === chordId);
    if (!targetSection || !targetChord || targetChord.durationBars !== 1) return;
    const draftSettings = sectionSettings[targetSection.label];
    const editingSettings: ResolvedGenerationSettings = {
      ...card.settings,
      ...targetSection.harmonySettings,
      complexity: draftSettings.complexity,
      harmonicFreedom: draftSettings.harmonicFreedom,
    };
    const alternate = getAvailableChordDefinitions(
      funkStyleProfile,
      editingSettings,
    ).find(({ roman }) => roman !== targetChord.roman);
    if (!alternate) {
      setError("Для второй половины не найден другой доступный аккорд.");
      return;
    }
    const splitChords = targetSection.chords.flatMap((chord): JamChord[] =>
      chord.id === chordId
        ? [
            { ...chord, source: "manual", durationBars: 0.5 },
            {
              id: `chord-${crypto.randomUUID()}`,
              source: "manual",
              roman: alternate.roman,
              renderedSymbol: renderRomanChord(
                alternate.roman,
                targetSection.harmonySettings.key,
                targetSection.harmonySettings.mode,
              ),
              harmonicFunction: alternate.harmonicFunction,
              startBar: chord.startBar + 0.5,
              durationBars: 0.5,
            },
          ]
        : [chord],
    );
    const editedSection = rebuildSectionChords(targetSection, splitChords);
    const nextSession = recalculateEditedSession({
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId ? editedSection : section,
      ),
    });
    commitCardMutation(
      nextSession,
      "Такт разделён пополам.",
    );
    setError(null);
  }

  function addChord(sectionId: string) {
    const targetSection = card.session.sections.find(
      ({ id }) => id === sectionId,
    );
    if (!targetSection) return;
    if (targetSection.chords.length >= 8) {
      setError("В одной теме может быть не больше 8 аккордов.");
      return;
    }

    const draftSettings = sectionSettings[targetSection.label];
    const editingSettings: ResolvedGenerationSettings = {
      ...card.settings,
      ...targetSection.harmonySettings,
      complexity: draftSettings.complexity,
      harmonicFreedom: draftSettings.harmonicFreedom,
    };
    const available = getAvailableChordDefinitions(
      funkStyleProfile,
      editingSettings,
    );
    const previousRoman = targetSection.chords.at(-1)?.roman;
    const definition =
      available.find(({ roman }) => roman !== previousRoman) ?? available[0];
    if (!definition) {
      setError("Не удалось подобрать доступный аккорд.");
      return;
    }

    const addedChord: JamChord = {
      id: `chord-${crypto.randomUUID()}`,
      source: "manual",
      roman: definition.roman,
      renderedSymbol: renderRomanChord(
        definition.roman,
        targetSection.harmonySettings.key,
        targetSection.harmonySettings.mode,
      ),
      harmonicFunction: definition.harmonicFunction,
      startBar: targetSection.bars,
      durationBars: 1,
    };
    const editedSection = rebuildSectionChords(targetSection, [
      ...targetSection.chords,
      addedChord,
    ]);
    const nextSession = recalculateEditedSession({
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId ? editedSection : section,
      ),
    });
    commitCardMutation(nextSession, "Аккорд добавлен.");
    setError(null);
  }

  function removeChord(sectionId: string, chordId: string) {
    const targetSection = card.session.sections.find(
      ({ id }) => id === sectionId,
    );
    if (!targetSection) return;
    if (targetSection.chords.length <= 1) {
      setError("В теме должен остаться хотя бы один аккорд.");
      return;
    }

    const pairedGroup = groupChordsForDisplay(targetSection.chords).find(
      ({ chords }) =>
        chords.length === 2 && chords.some(({ id }) => id === chordId),
    );
    const partnerId = pairedGroup?.chords.find(({ id }) => id !== chordId)?.id;
    const remainingChords = targetSection.chords
      .filter(({ id }) => id !== chordId)
      .map((chord) =>
        chord.id === partnerId
          ? { ...chord, source: "manual" as const, durationBars: 1 }
          : chord,
      );
    const editedSection = rebuildSectionChords(
      targetSection,
      remainingChords,
    );
    const nextSession = recalculateEditedSession({
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId ? editedSection : section,
      ),
    });
    commitCardMutation(nextSession, "Аккорд удалён.");
    setError(null);
  }

  function mergeChordPair(
    sectionId: string,
    firstId: string,
    secondId: string,
  ) {
    const targetSection = card.session.sections.find(
      ({ id }) => id === sectionId,
    );
    if (!targetSection) return;
    const first = targetSection.chords.find(({ id }) => id === firstId);
    const second = targetSection.chords.find(({ id }) => id === secondId);
    if (first?.durationBars !== 0.5 || second?.durationBars !== 0.5) return;
    const mergedChords = targetSection.chords
      .filter(({ id }) => id !== secondId)
      .map((chord) =>
        chord.id === firstId
          ? { ...chord, source: "manual" as const, durationBars: 1 }
          : chord,
      );
    const editedSection = rebuildSectionChords(targetSection, mergedChords);
    const nextSession = recalculateEditedSession({
      ...card.session,
      sections: card.session.sections.map((section) =>
        section.id === sectionId ? editedSection : section,
      ),
    });
    commitCardMutation(
      nextSession,
      "Половины такта объединены.",
    );
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

  function updateSectionTiming(
    part: SectionLabel,
    patch: Partial<ReturnType<typeof sectionDurationSettings>>,
  ) {
    setSettings((current) => {
      const nextValue = {
        ...sectionDurationSettings(current.timing, part),
        ...patch,
      };
      const timing = {
        ...current.timing,
        sectionDurations: {
          ...current.timing.sectionDurations,
          [part]: nextValue,
        },
      };
      if (part === "A") {
        timing.sectionADurationSeconds = nextValue.seconds;
        timing.sectionADurationMode = nextValue.mode;
        timing.sectionASquares = nextValue.squares;
      } else if (part === "B") {
        timing.sectionBDurationSeconds = nextValue.seconds;
        timing.sectionBDurationMode = nextValue.mode;
        timing.sectionBSquares = nextValue.squares;
      }
      return { ...current, timing };
    });
  }

  function commitDuration(part: SectionLabel, rawValue: string) {
    const fallback = sectionDurationSettings(settings.timing, part).seconds;
    const parsed = Number(rawValue);
    const duration = Number.isFinite(parsed)
      ? Math.min(MAX_SECTION_SECONDS, Math.max(MIN_SECTION_SECONDS, parsed))
      : fallback;
    setDurationInputs((current) => ({ ...current, [part]: String(duration) }));
    updateSectionTiming(part, { seconds: duration });
  }

  function updateDurationInput(part: SectionLabel, rawValue: string) {
    if (!/^\d{0,4}$/.test(rawValue)) return;
    setDurationInputs((current) => ({ ...current, [part]: rawValue }));
    const parsed = Number(rawValue);
    if (
      rawValue !== "" &&
      parsed >= MIN_SECTION_SECONDS &&
      parsed <= MAX_SECTION_SECONDS
    ) {
      updateSectionTiming(part, { seconds: parsed });
    }
  }

  function commitSquares(part: SectionLabel, rawValue: string) {
    const fallback = sectionDurationSettings(settings.timing, part).squares;
    const parsed = Number(rawValue);
    const squares = Number.isFinite(parsed)
      ? Math.min(
          MAX_SECTION_SQUARES,
          Math.max(MIN_SECTION_SQUARES, Math.round(parsed)),
        )
      : fallback;
    setSquaresInputs((current) => ({ ...current, [part]: String(squares) }));
    updateSectionTiming(part, { squares });
  }

  function updateSquaresInput(part: SectionLabel, rawValue: string) {
    if (!/^\d{0,2}$/.test(rawValue)) return;
    setSquaresInputs((current) => ({ ...current, [part]: rawValue }));
    const parsed = Number(rawValue);
    if (
      rawValue !== "" &&
      parsed >= MIN_SECTION_SQUARES &&
      parsed <= MAX_SECTION_SQUARES
    ) {
      updateSectionTiming(part, { squares: parsed });
    }
  }

  function setDurationMode(part: SectionLabel, mode: SectionDurationMode) {
    updateSectionTiming(part, { mode });
  }

  function applySessionForm(nextForm: SectionLabel[], custom = false) {
    try {
      const code = createCardCode();
      const existing = new Set(card.session.sections.map(({ label }) => label));
      const missing = Array.from(new Set(nextForm)).filter(
        (label) => !existing.has(label),
      );
      const generated = missing.length
        ? regenerateSessionSections({
            session: card.session,
            sectionLabels: missing,
            sectionSettings,
            seed: code,
            styleProfile: funkStyleProfile,
          })
        : { value: card.session, usedFallback: false };
      const formed = setSessionForm(generated.value, nextForm);
      const retimed = retimeSession(
        formed,
        { ...settings, bpm: card.session.bpm },
        funkStyleProfile,
      );
      setFormEditorMode(custom ? "custom" : "preset");
      setFocusedLabels((current) =>
        current.filter((label) => nextForm.includes(label)),
      );
      if (!nextForm.includes(activeSettingsLabel)) {
        setActiveSettingsLabel(nextForm[0] ?? "A");
      }
      commitCardMutation(retimed, `Форма ${nextForm.join("")} применена.`);
      setError(null);
    } catch (formError) {
      setError(
        formError instanceof Error
          ? formError.message
          : "Не удалось изменить форму сессии.",
      );
    }
  }

  function appendFormLabel(label: SectionLabel) {
    applySessionForm([...sessionForm(card.session), label], true);
  }

  function removeFormStep(index: number) {
    const next = sessionForm(card.session).filter((_, stepIndex) => stepIndex !== index);
    if (!next.includes("A")) {
      setError("В форме должна остаться хотя бы одна тема A.");
      return;
    }
    applySessionForm(next, true);
  }

  function toggleFocus(label: SectionLabel) {
    setFocusedLabels((current) => {
      if (current.includes(label)) {
        const next = current.filter((item) => item !== label);
        if (activeSettingsLabel === label && next[0]) {
          setActiveSettingsLabel(next[0]);
        }
        return next;
      }

      setActiveSettingsLabel(label);
      return [...current, label];
    });
  }

  function updateActiveHarmonySettings(
    patch: Partial<SectionHarmonySettings>,
  ) {
    if (!activeThemeFocused) return;
    setSectionSettings((current) => {
      const next = editingAllThemes
        ? Object.fromEntries(
            SECTION_LABELS.map((label) => [
              label,
              existingLabels.includes(label)
                ? { ...current[label], ...patch }
                : current[label],
            ]),
          ) as Record<SectionLabel, SectionHarmonySettings>
        : {
            ...current,
            [activeSettingsLabel]: {
              ...current[activeSettingsLabel],
              ...patch,
            },
          };
      const persistedState: PersistedJamState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        currentSession: card.session,
        recentSessions,
        latestSettings: settings,
        latestSectionSettings: next,
        appliedTimingSettings,
        selectedTheme: "dark",
      };
      createJamPersistence(window.localStorage).save(persistedState);
      return next;
    });
  }

  return (
    <main className="editor-shell mx-auto min-h-screen max-w-[1680px] px-5 py-8 !pb-28 sm:px-8 sm:!pb-28 lg:py-12">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Jam Randomizer
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Соберите Funk-сессию из тем A–D, настройте её форму и сохраните
            код понравившегося варианта.
          </p>
        </div>
        <RouteLink href="/stage">На сцену</RouteLink>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="control-panel rounded-3xl border border-white/10 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Настройки тем</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            По умолчанию изменения применяются ко всем созданным темам.
            Выберите карточки, чтобы настраивать и генерировать только их.
          </p>
          {focusedLabels.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2" role="tablist">
                {existingLabels.map((label) => {
                  const focused = focusedLabels.includes(label);
                  return (
                    <button
                      aria-selected={activeSettingsLabel === label}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${activeSettingsLabel === label ? focused ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/25 bg-white/5 text-neutral-400" : focused ? "border-white/25 text-white hover:border-[var(--accent)]" : "border-white/10 text-neutral-600"}`}
                      key={label}
                      onClick={() => setActiveSettingsLabel(label)}
                      role="tab"
                      type="button"
                    >
                      Тема {label}{focused ? " · выбрана" : ""}
                    </button>
                  );
                })}
            </div>
          ) : null}

          <fieldset
            className="mt-5 grid grid-cols-2 gap-4 disabled:opacity-40 lg:grid-cols-1"
            disabled={!activeThemeFocused}
          >
            <label className="text-sm text-[var(--muted)]">
              Тональность
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  updateActiveHarmonySettings({
                    key: event.target.value as PitchClass,
                  })
                }
                value={displayedKey}
              >
                {displayedKey === "" ? (
                  <option disabled value="">Разные значения</option>
                ) : null}
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
                  updateActiveHarmonySettings({
                    mode: event.target.value as Mode,
                  })
                }
                value={displayedMode}
              >
                {displayedMode === "" ? (
                  <option disabled value="">Разные значения</option>
                ) : null}
                <option value="major">Мажор</option>
                <option value="minor">Минор</option>
              </select>
            </label>

            <label className="text-sm text-[var(--muted)]">
              Сложность аккордов
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  updateActiveHarmonySettings({
                    complexity: event.target.value as Complexity,
                  })
                }
                value={displayedComplexity}
              >
                {displayedComplexity === "" ? (
                  <option disabled value="">Разные значения</option>
                ) : null}
                <option value="easy">Простые</option>
                <option value="medium">Средние</option>
                <option value="advanced">Сложные</option>
              </select>
            </label>

            <label className="col-span-2 text-sm text-[var(--muted)] lg:col-span-1">
              Гармоническая свобода
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  updateActiveHarmonySettings({
                    harmonicFreedom: event.target.value as HarmonicFreedom,
                  })
                }
                value={displayedFreedom}
              >
                {displayedFreedom === "" ? (
                  <option disabled value="">Разные значения</option>
                ) : null}
                <option value="strict">Строго в тональности</option>
                <option value="colorful">С гармоническими красками</option>
                <option value="adventurous">Свободная гармония</option>
              </select>
            </label>
          </fieldset>
          {!activeThemeFocused ? (
            <p className="mt-3 text-xs text-neutral-500">
              Настройки темы {activeSettingsLabel} доступны только для
              просмотра. Добавьте тему в фокус, чтобы изменить их.
            </p>
          ) : editingAllThemes ? (
            <p className="mt-3 text-xs text-neutral-500">
              Изменение любого поля применится одновременно ко всем созданным темам.
            </p>
          ) : null}

          <button
            className="mt-4 w-full rounded-xl border border-[var(--accent-cool)]/50 px-4 py-2.5 text-sm font-bold text-[var(--accent-cool)] transition hover:bg-[var(--accent-cool)]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-neutral-600 disabled:hover:bg-transparent"
            disabled={!transpositionDirty}
            onClick={applyTransposition}
            type="button"
          >
            {transpositionBlockedByMode
              ? "Смена лада — через новую гармонию"
              : focusedLabels.length
                ? `Транспонировать: ${focusedLabels.join(" + ")}`
                : "Транспонировать все темы"}
          </button>

          <div className="my-6 border-t border-white/10" />
          <h2 className="text-lg font-bold">Настройки сессии</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Темп, размер и длительность меняются без замены аккордов.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
            <fieldset className="col-span-2 lg:col-span-1">
              <legend className="text-sm text-[var(--muted)]">Форма сессии</legend>
              <select
                aria-label="Форма сессии"
                className={FIELD_CLASS}
                onChange={(event) => {
                  const choice = event.target.value;
                  if (choice === "custom") {
                    setFormEditorMode("custom");
                    return;
                  }
                  applySessionForm(FORM_PRESETS[choice] ?? FORM_PRESETS.ABA);
                }}
                value={formEditorMode === "custom" || !currentPreset ? "custom" : currentPreset}
              >
                {Object.keys(FORM_PRESETS).map((preset) => (
                  <option key={preset} value={preset}>{preset}</option>
                ))}
                <option value="custom">Своя форма</option>
              </select>
              {formEditorMode === "custom" || !currentPreset ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    {currentForm.map((label, index) => (
                      <button
                        className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm font-black text-[var(--accent)]"
                        key={`${label}-${index}`}
                        onClick={() => removeFormStep(index)}
                        title={`Убрать тему ${label} из формы`}
                        type="button"
                      >
                        {label} ×
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">Добавить следующий шаг:</p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {SECTION_LABELS.map((label) => (
                      <button
                        className="rounded-lg border border-white/15 py-2 text-sm font-bold hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        key={label}
                        onClick={() => appendFormLabel(label)}
                        type="button"
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="mt-2 text-xs text-neutral-500">
                Текущая форма: {currentForm.join(" → ")}
              </p>
            </fieldset>

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
                  <option value="random">Случайно</option>
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
                Случайный темп для Funk: {funkStyleProfile.bpmRange.min}–
                {funkStyleProfile.bpmRange.max} BPM
              </p>
            </fieldset>

            <fieldset className="col-span-2 lg:col-span-1">
              <legend className="text-sm text-[var(--muted)]">
                Длительность частей
              </legend>
              <div className="mt-2 space-y-3">
                {existingLabels.map((part) => {
                  const mode = sectionDurationMode(settings.timing, part);
                  const section = card.session.sections.find(
                    ({ label }) => label === part,
                  );
                  const currentDuration = card.session.timeline.find(
                    ({ sectionId }) => sectionId === section?.id,
                  )?.durationSeconds;
                  const currentRandomSquares = Math.max(
                    1,
                    Math.round(
                      (currentDuration ?? 0) /
                        squareDurationSeconds(
                          section?.bars ?? 4,
                          card.session.bpm,
                          card.session.meter,
                        ),
                    ),
                  );
                  const squares = sectionDurationSettings(
                    settings.timing,
                    part,
                  ).squares;
                  const approximateSeconds = durationSecondsFromSquares(
                    squares,
                    section?.bars ?? 4,
                    typeof settings.bpm === "number"
                      ? settings.bpm
                      : card.session.bpm,
                    settings.meter,
                  );

                  return (
                    <div
                      className="rounded-xl border border-white/10 bg-black/20 p-3"
                      key={part}
                    >
                      <p className="text-xs font-bold text-white">Тема {part}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <select
                          aria-label={`Режим длительности ${part}`}
                          className={`${FIELD_CLASS} mt-0 min-w-0`}
                          onChange={(event) =>
                            setDurationMode(
                              part,
                              event.target.value as SectionDurationMode,
                            )
                          }
                          value={mode}
                        >
                          <option value="random">Случайно</option>
                          <option value="seconds">Вручную, секунды</option>
                          <option value="squares">Вручную, квадраты</option>
                        </select>
                        <input
                          aria-label={`Значение длительности ${part}`}
                          className={`${FIELD_CLASS} mt-0 min-w-0 disabled:cursor-not-allowed disabled:opacity-45`}
                          disabled={mode === "random"}
                          max={
                            mode === "squares"
                              ? MAX_SECTION_SQUARES
                              : MAX_SECTION_SECONDS
                          }
                          min={
                            mode === "squares"
                              ? MIN_SECTION_SQUARES
                              : MIN_SECTION_SECONDS
                          }
                          onBlur={(event) =>
                            mode === "squares"
                              ? commitSquares(part, event.target.value)
                              : commitDuration(part, event.target.value)
                          }
                          onChange={(event) =>
                            mode === "squares"
                              ? updateSquaresInput(part, event.target.value)
                              : updateDurationInput(part, event.target.value)
                          }
                          type={mode === "random" ? "text" : "number"}
                          value={
                            mode === "random"
                              ? `${currentRandomSquares} кв.`
                              : mode === "squares"
                                ? squaresInputs[part]
                                : durationInputs[part]
                          }
                        />
                      </div>
                      <p className="mt-2 text-[0.68rem] text-neutral-500">
                        {mode === "random"
                          ? `При применении будет выбрано от ${RANDOM_SQUARE_RANGES[part].min} до ${RANDOM_SQUARE_RANGES[part].max} квадратов.`
                          : mode === "squares"
                            ? `Примерно ${formatApproximateTime(approximateSeconds)} при текущем квадрате.`
                            : "Точная длительность в секундах."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <button
            className="mt-6 w-full rounded-xl border border-[var(--accent)]/60 px-5 py-3 font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-neutral-600 disabled:hover:bg-transparent"
            disabled={!timingSettingsDirty}
            onClick={applyTimingSettings}
            type="button"
          >
            Применить BPM, размер и длительности
          </button>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Сессии сохраняются только на этом устройстве. Они могут исчезнуть
            после очистки данных браузера или в приватном режиме.
          </p>
          {persistenceMessage ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{persistenceMessage}</p>
          ) : null}

          <div className="fixed bottom-3 left-1/2 z-50 w-[min(calc(100%-1.5rem),32rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[rgba(20,20,17,0.94)] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:bottom-4 sm:p-4">
            <button
              className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-black transition hover:brightness-90 active:scale-[0.99]"
              onClick={generateNewHarmony}
              type="button"
            >
              {focusedLabels.length
                ? `Новая гармония: ${focusedLabels.join(" + ")}`
                : "Новая гармония: все темы"}
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <div className="session-strip flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 px-5 py-4">
            <h2 className="text-2xl font-black sm:text-3xl">Funk-сессия</h2>
            <div className="text-sm text-[var(--muted)]">
              {card.settings.meter} ·{" "}
              <span data-testid="card-bpm">{card.settings.bpm} BPM</span> · {currentForm.join(" → ")}
            </div>
          </div>

          {card.session.sections.map((section) => (
            <HarmonySectionCard
              focused={focusedLabels.includes(section.label)}
              key={section.id}
              onChordChange={replaceChord}
              onAddChord={addChord}
              onDurationChange={changeChordDuration}
              onMergePair={mergeChordPair}
              onRemoveChord={removeChord}
              onSplitChord={splitChord}
              onToggleFocus={toggleFocus}
              section={section}
              settings={{
                ...card.settings,
                meter: settings.meter,
                ...section.harmonySettings,
                complexity: sectionSettings[section.label].complexity,
                harmonicFreedom:
                  sectionSettings[section.label].harmonicFreedom,
              }}
              warningSeconds={
                card.session.timeline.find(
                  ({ sectionId }) => sectionId === section.id,
                )?.transitionWarningSeconds ?? 0
              }
            />
          ))}

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface)] px-5 py-4 text-xs text-[var(--muted)]">
            <div className="flex flex-wrap items-center gap-3">
            <span data-testid="card-code">Код сессии: {card.code}</span>
              <button
                className="rounded-full border border-white/15 px-3 py-1.5 text-white transition hover:border-white/30"
                onClick={copyCardCode}
                type="button"
              >
                {copyStatus === "copied" ? "Скопировано" : "Копировать"}
              </button>
              {copyStatus === "failed" ? (
                <span className="text-red-300">Не удалось скопировать</span>
              ) : null}
            </div>
          </footer>
        </div>
      </div>

      <section className="history-panel mt-8 rounded-3xl border border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">История сессий</h2>
          </div>
          <p className="text-xs text-neutral-500">До {MAX_RECENT_SESSIONS} сессий на этом устройстве</p>
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
                    {session.sections
                      .map(
                        (section) =>
                          `${section.label}: ${section.harmonySettings?.key ?? session.key} ${section.harmonySettings?.mode ?? session.mode}`,
                      )
                      .join(" · ")} · {session.bpm} BPM
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
            Здесь появятся созданные сессии.
          </p>
        )}
      </section>
    </main>
  );
}
