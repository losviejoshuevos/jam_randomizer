import { rockArchetype, type RockPattern } from "@/data/styles/rock";
import type { StyleProfile } from "../domain/style-profile";
import type {
  GeneratedChord,
  GenerationSettings,
  HarmonicFreedom,
  HarmonicFunction,
  JamSection,
  SectionLabel,
  SectionRole,
  Seed,
} from "../domain/types";
import type { GenerationResult } from "../generator/contracts";
import { createSeededRandom, deriveSeed, weightedChoice, type RandomSource } from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";

const FREEDOM_RANK: Record<HarmonicFreedom, number> = {
  strict: 0,
  colorful: 1,
  adventurous: 2,
};

function role(label: SectionLabel): SectionRole {
  if (label === "A") return "theme";
  if (label === "B") return "development";
  if (label === "C") return "bridge";
  return "coda";
}

function genericFallbackPatterns(mode: GenerationSettings["mode"]): RockPattern[] {
  return mode === "minor"
    ? [
        { id: "fallback-minor-vamp", roots: ["i", "bVII"], weight: 1, modes: ["minor"], sections: ["A", "B", "C", "D"], minimumFreedom: "strict" },
        { id: "fallback-minor-loop", roots: ["i", "bVI", "bIII", "bVII"], weight: 1, modes: ["minor"], sections: ["A", "B", "C", "D"], minimumFreedom: "strict" },
      ]
    : [
        { id: "fallback-major-vamp", roots: ["I", "IV"], weight: 1, modes: ["major"], sections: ["A", "B", "C", "D"], minimumFreedom: "strict" },
        { id: "fallback-major-loop", roots: ["I", "bVII", "IV", "I"], weight: 1, modes: ["major"], sections: ["A", "B", "C", "D"], minimumFreedom: "strict" },
      ];
}

function selectPattern(
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
  random: RandomSource,
  sectionA?: JamSection,
): RockPattern {
  const config = rockArchetype(profile.archetypeId ?? "classic-modal");
  let candidates = config.patterns.filter(
    (pattern) =>
      pattern.modes.includes(settings.mode) &&
      pattern.sections.includes(label) &&
      FREEDOM_RANK[pattern.minimumFreedom] <=
        FREEDOM_RANK[settings.harmonicFreedom],
  );
  if (candidates.length === 0) {
    candidates = genericFallbackPatterns(settings.mode);
  }

  const aIsStatic = sectionA ? sectionA.chords.length <= 2 : false;
  const weighted = candidates.map((pattern) => {
    let weight = pattern.weight;
    if (label === "A") {
      if (pattern.roots.length <= 2) weight *= 1.8;
      if (pattern.tags?.includes("pedal")) weight *= 1.6;
    }
    if (label === "B") {
      if (pattern.roots.length >= 3) weight *= aIsStatic ? 2.4 : 1.5;
      if (pattern.roots.length === 1) weight *= 0.15;
    }
    if (label === "C") {
      if (pattern.roots.length <= 2) weight *= 3;
      if (pattern.tags?.includes("pedal")) weight *= 2.5;
      if (pattern.roots.length >= 4) weight *= 0.18;
    }
    if (label === "D") {
      if (pattern.roots.length >= 3) weight *= 1.8;
      if (pattern.tags?.includes("peak")) weight *= 2.2;
      if (pattern.roots.at(-1)?.replace(/^b/, "").toUpperCase() === "I") {
        weight *= 1.5;
      }
    }
    return { value: pattern, weight };
  });
  return weightedChoice(weighted, random);
}

function powerRoman(root: string): string {
  const match = /^(b|#)?([iv]+)$/i.exec(root);
  if (!match) return root;
  return `${match[1] ?? ""}${match[2].toUpperCase()}5`;
}

function chordFunction(roman: string): HarmonicFunction {
  const root = roman.replace(/(?:maj7|add9|sus2|sus4|7|5)$/, "");
  if (/^(?:I|i|vi|bIII)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|bVI)$/.test(root)) return "predominant";
  if (/^(?:V|v|VII)$/.test(root)) return "dominant";
  return "color";
}

function coloredRoman(
  root: string,
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
  pattern: RockPattern,
  random: RandomSource,
): string {
  const config = rockArchetype(profile.archetypeId ?? "classic-modal");
  const treatment = profile.chordTreatment ?? "power";
  // Shared major-ish/blues patterns use I as a neutral tonal-center marker.
  // In an explicitly minor theme it must become a minor tonic whenever the
  // chord contains a third. Power/sus chords remain quality-neutral.
  const contextualRoot = settings.mode === "minor" && root === "I" ? "i" : root;
  const powerChance = {
    easy: treatment === "power" ? 0.9 : treatment === "mixed" ? 0.62 : 0,
    medium: treatment === "power" ? 0.48 : treatment === "mixed" ? 0.3 : 0,
    advanced: treatment === "power" ? 0.16 : treatment === "mixed" ? 0.08 : 0,
  }[settings.complexity];
  const usePower = random.next() < powerChance;
  if (usePower) return powerRoman(contextualRoot);
  if (settings.complexity === "easy") return contextualRoot;

  const sectionMultiplier = label === "D" ? 1.15 : label === "A" ? 0.75 : 1;
  const complexityColorChance =
    settings.complexity === "advanced" ? 0.62 : 0.28;
  const colorChance = Math.max(config.colorChance, complexityColorChance);
  if (random.next() >= Math.min(0.85, colorChance * sectionMultiplier)) {
    return contextualRoot;
  }

  if (config.id === "blues-rock" && pattern.tags?.includes("blues")) {
    return `${contextualRoot}7`;
  }
  const basicColors = ["sus2", "sus4", "add9"] as const;
  if (settings.complexity === "advanced" && config.id === "rock-ballad" && random.next() < 0.35) {
    return contextualRoot === contextualRoot.toLowerCase()
      ? `${contextualRoot}7`
      : `${contextualRoot}maj7`;
  }
  const color = basicColors[Math.floor(random.next() * basicColors.length)];
  const coloredRoot = color === "add9"
    ? contextualRoot
    : contextualRoot.replace(/[iv]+$/i, (degree) => degree.toUpperCase());
  return `${coloredRoot}${color}`;
}

function rhythm(
  roots: string[],
  profile: StyleProfile,
  meter: GenerationSettings["meter"],
  label: SectionLabel,
  random: RandomSource,
): { roots: string[]; durations: number[] } {
  const config = rockArchetype(profile.archetypeId ?? "classic-modal");
  const active =
    (label === "B" || label === "D") &&
    meter === "4/4" &&
    roots.length === 4 &&
    random.next() < (config.activeRhythmChance[label] ?? 0);
  if (active) {
    return { roots: [...roots, ...roots], durations: Array(8).fill(0.5) };
  }
  if (roots.length === 1) return { roots, durations: [4] };
  if (roots.length === 2) return { roots, durations: [2, 2] };
  if (roots.length === 3) {
    return random.next() < 0.5
      ? { roots, durations: [1, 1, 2] }
      : { roots, durations: [2, 1, 1] };
  }
  return { roots, durations: [1, 1, 1, 1] };
}

export function generateRockSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
  sectionA?: JamSection;
}): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, label, sectionA } = request;
  const random = createSeededRandom(deriveSeed(seed, `rock:section:${label}`));
  const pattern = selectPattern(styleProfile, settings, label, random, sectionA);
  const selectedRhythm = rhythm(
    pattern.roots,
    styleProfile,
    settings.meter,
    label,
    random,
  );
  let startBar = 0;
  const chords: GeneratedChord[] = selectedRhythm.roots.map((root, index) => {
    const roman = coloredRoman(root, styleProfile, settings, label, pattern, random);
    const durationBars = selectedRhythm.durations[index];
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(seed, `rock:${label}:chord:${index}`)}`,
      source: "generated",
      roman,
      renderedSymbol: renderRomanChord(roman, settings.key, settings.mode),
      harmonicFunction: chordFunction(roman),
      startBar,
      durationBars,
    };
    startBar += durationBars;
    return chord;
  });
  return {
    value: {
      id: `section-${deriveSeed(seed, `rock:${label}:id`)}`,
      label,
      displayName: `Тема ${label}`,
      role: role(label),
      bars: 4,
      repeats: 1,
      locked: false,
      generationSeed: seed,
      harmonySettings: {
        key: settings.key,
        mode: settings.mode,
        complexity: settings.complexity,
        harmonicFreedom: settings.harmonicFreedom,
      },
      chords,
    },
    attempts: 1,
    usedFallback: false,
  };
}
