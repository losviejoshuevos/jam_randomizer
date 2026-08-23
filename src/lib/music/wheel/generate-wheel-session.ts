import { resolveStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  JamSession,
  PitchClass,
  SectionHarmonySettings,
  SectionLabel,
} from "../domain/types";
import {
  generateSession,
  regenerateSessionSections,
  retimeSession,
  setSessionForm,
} from "../generator";
import { createSeededRandom, deriveSeed, weightedChoice } from "../random";
import { addArchetypeToSessionCode } from "../session-code";

export type WheelDifficultyId = 1 | 2 | 3 | 4 | 5 | 6;

export interface WheelDifficulty {
  id: WheelDifficultyId;
  name: string;
  description: string;
}

export const WHEEL_DIFFICULTIES: readonly WheelDifficulty[] = [
  {
    id: 1,
    name: "Разминка",
    description: "Знакомые аккорды, предсказуемые переходы и минимум неожиданностей.",
  },
  {
    id: 2,
    name: "Легко",
    description: "Простая гармония, которую легко подхватить на слух, с редкими необычными ходами.",
  },
  {
    id: 3,
    name: "Уверенно",
    description: "Аккорды звучат богаче, но переходы остаются понятными и удобными для группы.",
  },
  {
    id: 4,
    name: "Интересно",
    description: "Больше гармонических красок и неожиданных ходов без потери общего направления.",
  },
  {
    id: 5,
    name: "Смело",
    description: "Для опытных музыкантов: сложнее аккорды и заметно больше свободы.",
  },
  {
    id: 6,
    name: "Эксперимент",
    description: "Сложные аккорды, смелые заимствования и самые непредсказуемые переходы.",
  },
] as const;

const KEYS: readonly PitchClass[] = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

const FORMS: ReadonlyArray<{
  value: readonly SectionLabel[];
  weight: number;
}> = [
  { value: ["A", "B", "A"], weight: 34 },
  { value: ["A", "B", "A", "B"], weight: 28 },
  { value: ["A", "B", "C", "A", "B", "C"], weight: 20 },
  { value: ["A", "B", "C", "D"], weight: 18 },
];

function difficultySettings(
  difficulty: WheelDifficultyId,
  seed: string,
): { complexity: Complexity; harmonicFreedom: HarmonicFreedom } {
  if (difficulty === 1) return { complexity: "easy", harmonicFreedom: "strict" };
  if (difficulty === 2) return { complexity: "easy", harmonicFreedom: "colorful" };
  if (difficulty === 3) return { complexity: "medium", harmonicFreedom: "strict" };
  if (difficulty === 4) return { complexity: "medium", harmonicFreedom: "colorful" };
  if (difficulty === 6) return { complexity: "advanced", harmonicFreedom: "adventurous" };

  return createSeededRandom(deriveSeed(seed, "difficulty:brave")).next() < 0.5
    ? { complexity: "advanced", harmonicFreedom: "colorful" }
    : { complexity: "medium", harmonicFreedom: "adventurous" };
}

function sessionCode(styleId: string, seed: string, archetypeId?: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const hash = deriveSeed(seed, "wheel:code");
  const characters = Array.from({ length: 10 }, (_, index) => {
    const pair = hash.slice(index * 2, index * 2 + 2);
    return alphabet[Number.parseInt(pair || "0", 16) % alphabet.length];
  });
  const marker = styleId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return addArchetypeToSessionCode(
    `${marker}-${characters.slice(0, 5).join("")}-${characters.slice(5).join("")}`,
    archetypeId,
  );
}

export interface WheelGenerationResult {
  session: JamSession;
  settings: GenerationSettings;
  sectionSettings: Record<SectionLabel, SectionHarmonySettings>;
  form: SectionLabel[];
}

export function generateWheelSession({
  styleId,
  difficulty,
  seed,
}: {
  styleId: string;
  difficulty: WheelDifficultyId;
  seed: string;
}): WheelGenerationResult {
  const profile = resolveStyleProfile(styleId, seed);
  const random = createSeededRandom(deriveSeed(seed, "wheel:settings"));
  const mode = weightedChoice(profile.allowedModes, random);
  const meter = weightedChoice(profile.allowedMeters, random);
  const key = KEYS[Math.floor(random.next() * KEYS.length)] ?? "C";
  const harmony = difficultySettings(difficulty, seed);
  const timing: GenerationSettings["timing"] = {
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
  };
  const settings: GenerationSettings = {
    styleId,
    key,
    mode,
    bpm: "random",
    meter,
    ...harmony,
    timing,
  };
  const sectionHarmony: SectionHarmonySettings = { key, mode, ...harmony };
  const sectionSettings = Object.fromEntries(
    (["A", "B", "C", "D"] as const).map((label) => [label, sectionHarmony]),
  ) as Record<SectionLabel, SectionHarmonySettings>;
  const code = sessionCode(styleId, seed, profile.archetypeId);
  const base = generateSession({
    seed: code,
    settings,
    styleProfile: profile,
    sectionSettings,
  }).value;
  const form = [...weightedChoice(FORMS, random)];
  const missing = Array.from(new Set(form)).filter(
    (label) => !base.sections.some((section) => section.label === label),
  );
  const expanded = missing.length
    ? regenerateSessionSections({
        session: base,
        sectionLabels: missing,
        sectionSettings,
        seed: code,
        styleProfile: profile,
      }).value
    : base;
  const formed = setSessionForm(expanded, form);
  const session = retimeSession(
    formed,
    { ...settings, bpm: base.bpm },
    profile,
  );

  return {
    session: { ...session, schemaVersion: 3 },
    settings: { ...settings, bpm: base.bpm },
    sectionSettings,
    form,
  };
}
