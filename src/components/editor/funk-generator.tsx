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
  SectionLabel,
} from "@/lib/music/domain/types";
import {
  generateSession,
  regenerateSessionSections,
  retimeSession,
} from "@/lib/music/generator";
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
  resolveDifferentRandomBpm,
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
): Record<SectionLabel, SectionHarmonySettings> {
  const fallback = harmonySettingsFromGeneration(settingsFromSession(session));

  return {
    A:
      session.sections.find(({ label }) => label === "A")?.harmonySettings ??
      fallback,
    B:
      session.sections.find(({ label }) => label === "B")?.harmonySettings ??
      fallback,
  };
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

function HarmonySectionCard({
  section,
  warningSeconds,
  settings,
  onChordChange,
  onDurationChange,
  onSplitChord,
  onMergePair,
  focused,
  onToggleFocus,
}: {
  section: JamSection;
  warningSeconds: number;
  settings: GenerationSettings;
  onChordChange: (sectionId: string, chordId: string, roman: string) => void;
  onDurationChange: (
    sectionId: string,
    chordId: string,
    durationBars: number,
  ) => void;
  onSplitChord: (sectionId: string, chordId: string) => void;
  onMergePair: (sectionId: string, firstId: string, secondId: string) => void;
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
              <option value="0.5">½ такта</option>
              <option value="1">1 такт</option>
              <option value="2">2 такта</option>
              <option value="4">4 такта</option>
            </select>
          </label>
          {chord.durationBars === 1 && !halfBar ? (
            <button
              className="self-end rounded-lg border border-white/15 px-2 py-2 text-xs font-bold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={() => onSplitChord(section.id, chord.id)}
              type="button"
            >
              Разбить пополам
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section
      className={`jam-card flex min-h-[360px] flex-col rounded-3xl border p-6 transition sm:p-10 ${focused ? "border-[var(--accent)] shadow-[0_0_32px_rgba(220,255,65,0.10)]" : "border-white/10"}`}
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
          <p className="mt-2 text-sm font-semibold text-neutral-300">
            {section.harmonySettings.key}{" "}
            {section.harmonySettings.mode === "major" ? "мажор" : "минор"}
            {" · "}{section.harmonySettings.complexity}{" · "}
            {section.harmonySettings.harmonicFreedom}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-pressed={focused}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${focused ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/15 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
            onClick={() => onToggleFocus(section.label)}
            type="button"
          >
            {focused ? "В фокусе" : "Фокус"}
          </button>
          <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-[var(--muted)]">
            {formatChordDuration(section.bars)}
          </div>
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
  >({
    A: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
    B: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
  });
  const [focusedLabels, setFocusedLabels] = useState<SectionLabel[]>([]);
  const [activeSettingsLabel, setActiveSettingsLabel] =
    useState<SectionLabel>("A");
  const [manualBpm, setManualBpm] = useState(103);
  const [manualBpmInput, setManualBpmInput] = useState("103");
  const [durationAInput, setDurationAInput] = useState("150");
  const [durationBInput, setDurationBInput] = useState("90");
  const [recentSessions, setRecentSessions] = useState<JamSession[]>([]);
  const [card, setCard] = useState(() =>
    createCard(INITIAL_CARD_CODE, DEFAULT_SETTINGS, {
      A: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
      B: harmonySettingsFromGeneration(DEFAULT_SETTINGS),
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(
    null,
  );
  const editingAllThemes = focusedLabels.length === 0;
  const activeThemeFocused =
    editingAllThemes || focusedLabels.includes(activeSettingsLabel);
  const activeHarmonySettings = sectionSettings[activeSettingsLabel];
  const displayedKey =
    editingAllThemes && sectionSettings.A.key !== sectionSettings.B.key
      ? ""
      : activeHarmonySettings.key;
  const displayedMode =
    editingAllThemes && sectionSettings.A.mode !== sectionSettings.B.mode
      ? ""
      : activeHarmonySettings.mode;
  const displayedComplexity =
    editingAllThemes &&
    sectionSettings.A.complexity !== sectionSettings.B.complexity
      ? ""
      : activeHarmonySettings.complexity;
  const displayedFreedom =
    editingAllThemes &&
    sectionSettings.A.harmonicFreedom !== sectionSettings.B.harmonicFreedom
      ? ""
      : activeHarmonySettings.harmonicFreedom;
  const timingSettingsDirty =
    settings.bpm !== appliedTimingSettings.bpm ||
    settings.meter !== appliedTimingSettings.meter ||
    settings.timing.sectionADurationSeconds !==
      appliedTimingSettings.timing.sectionADurationSeconds ||
    settings.timing.sectionBDurationSeconds !==
      appliedTimingSettings.timing.sectionBDurationSeconds;

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
          loaded.value.latestSectionSettings ??
            sectionSettingsFromSession(loaded.value.currentSession),
        );
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
        ? "Сессия сохранена в этом браузере."
        : "Изменения применены, но браузер не разрешил локальное сохранение.",
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
        : ["A", "B"];
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
        session: result.value,
        usedFallback: result.usedFallback,
      };
      setCard(nextCard);
      if (settings.bpm === "random") {
        setAppliedTimingSettings((current) => ({
          ...current,
          bpm: "random",
        }));
      }
      saveCurrentSession(
        nextCard.session,
        settings,
        true,
        sectionSettings,
        settings.bpm === "random"
          ? { ...appliedTimingSettings, bpm: "random" }
          : appliedTimingSettings,
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
      "BPM, размер и длительности применены без изменения гармонии.",
      sectionSettings,
      settings,
    );
  }

  function replaceChord(sectionId: string, chordId: string, roman: string) {
    const targetSection = card.session.sections.find(
      (section) => section.id === sectionId,
    );
    if (!targetSection) return;
    const draftSettings = sectionSettings[targetSection.label];
    const chordEditingSettings: ResolvedGenerationSettings = {
      ...card.settings,
      ...targetSection.harmonySettings,
      complexity: draftSettings.complexity,
      harmonicFreedom: draftSettings.harmonicFreedom,
    };
    const definition = getAvailableChordDefinitions(
      funkStyleProfile,
      chordEditingSettings,
    ).find((item) => item.roman === roman);
    if (!definition) return;
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
              targetSection.harmonySettings.key,
              targetSection.harmonySettings.mode,
            ),
            harmonicFunction: definition.harmonicFunction,
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
    commitCardMutation(nextSession, "Аккорд изменён, создан новый код карточки.");
    setError(null);
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
      "Длительность аккорда изменена, создан новый код карточки.",
    );
    setError(null);
  }

  function splitChord(sectionId: string, chordId: string) {
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
      "Такт разделён пополам, создан новый код карточки.",
    );
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
      "Половины такта объединены, создан новый код карточки.",
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
        ? {
            A: { ...current.A, ...patch },
            B: { ...current.B, ...patch },
          }
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
          <h2 className="text-lg font-bold">Настройки тем</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Без фокуса настройки применяются ко всем темам. Фокус позволяет
            настраивать и генерировать выбранные темы независимо.
          </p>
          {focusedLabels.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2" role="tablist">
                {(["A", "B"] as const).map((label) => {
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
                      Тема {label}{focused ? " · фокус" : ""}
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] px-3 py-2 text-center text-sm font-bold text-[var(--accent)]">
              Все темы
            </div>
          )}

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
                  updateActiveHarmonySettings({
                    harmonicFreedom: event.target.value as HarmonicFreedom,
                  })
                }
                value={displayedFreedom}
              >
                {displayedFreedom === "" ? (
                  <option disabled value="">Разные значения</option>
                ) : null}
                <option value="strict">Strict</option>
                <option value="colorful">Colorful</option>
                <option value="adventurous">Adventurous</option>
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
              Изменение любого поля применится одновременно к A и B.
            </p>
          ) : null}

          <div className="my-6 border-t border-white/10" />
          <h2 className="text-lg font-bold">Настройки сессии</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Применяются ко всем темам без изменения аккордов.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
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
            className="mt-6 w-full rounded-xl border border-[var(--accent)]/60 px-5 py-3 font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-neutral-600 disabled:hover:bg-transparent"
            disabled={!timingSettingsDirty}
            onClick={applyTimingSettings}
            type="button"
          >
            Применить BPM, размер и длительности
          </button>

          <button
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-black transition hover:brightness-90 active:scale-[0.99]"
            onClick={generateNewHarmony}
            type="button"
          >
            {focusedLabels.length
              ? `Новая гармония: ${focusedLabels.join(" + ")}`
              : "Новая гармония: все темы"}
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
            <h2 className="text-2xl font-black sm:text-3xl">Funk session</h2>
            <div className="text-sm text-[var(--muted)]">
              {card.settings.meter} ·{" "}
              <span data-testid="card-bpm">{card.settings.bpm} BPM</span> · A → B → A
            </div>
          </div>

          {card.session.sections.map((section) => (
            <HarmonySectionCard
              focused={focusedLabels.includes(section.label)}
              key={section.id}
              onChordChange={replaceChord}
              onDurationChange={changeChordDuration}
              onMergePair={mergeChordPair}
              onSplitChord={splitChord}
              onToggleFocus={toggleFocus}
              section={section}
              settings={{
                ...card.settings,
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
            Здесь появятся созданные карточки.
          </p>
        )}
      </section>
    </main>
  );
}
