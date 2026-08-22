import type { StyleProfile } from "../domain/style-profile";
import type {
  Complexity,
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
import {
  createSeededRandom,
  deriveSeed,
  weightedChoice,
  type RandomSource,
} from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";
import type {
  GrooveChordCategory,
  GroovePattern,
  GrooveStyleConfig,
} from "./groove-style-types";

const FREEDOM_RANK: Record<HarmonicFreedom, number> = {
  strict: 0,
  colorful: 1,
  adventurous: 2,
};
const COMPLEXITY_RANK: Record<Complexity, number> = {
  easy: 0,
  medium: 1,
  advanced: 2,
};
const EXPLICIT_SUFFIX = /(?:maj7#11|maj9#11|maj7|maj9|mMaj7|6\/9|add2|add4|add9|sus2|sus4|7sus4|9sus4|13sus4|13b9|7alt|7#9|7b9|7b5|dim7|dim|aug|11|13|9|7|6|5)$/;

function sectionRole(label: SectionLabel): SectionRole {
  if (label === "A") return "theme";
  if (label === "B") return "development";
  if (label === "C") return "bridge";
  return "coda";
}

function chordCategory(
  root: string,
  harmonicFunction: HarmonicFunction,
  pattern: GroovePattern,
): GrooveChordCategory {
  const minor = /(?:^|[b#])[iv]+$/.test(root);
  if (pattern.tags?.includes("sus") && !minor) return "suspended";
  if (harmonicFunction === "dominant") return "dominant";
  if (harmonicFunction === "tonic") return minor ? "tonic-minor" : "tonic-major";
  return minor ? "minor" : "major";
}

function colorRoman(
  rawRoot: string,
  harmonicFunction: HarmonicFunction,
  pattern: GroovePattern,
  settings: GenerationSettings,
  config: GrooveStyleConfig,
  random: RandomSource,
): string {
  if (EXPLICIT_SUFFIX.test(rawRoot) || settings.complexity === "easy") return rawRoot;
  const category = chordCategory(rawRoot, harmonicFunction, pattern);
  const suffix = weightedChoice(config.palette[settings.complexity][category], random);
  return `${rawRoot}${suffix}`;
}

function structuralRoot(roman: string): string {
  return roman.replace(EXPLICIT_SUFFIX, "");
}

function tooSimilar(pattern: GroovePattern, section: JamSection): boolean {
  const candidate = pattern.roots.map(structuralRoot);
  const previous = section.chords.map(({ roman }) => structuralRoot(roman));
  if (candidate.join("|") === previous.join("|")) return true;
  if (candidate.length !== previous.length || candidate.length === 0) return false;
  const overlap = candidate.filter((root, index) => root === previous[index]).length;
  return overlap / candidate.length >= 0.75;
}

function fallbackPattern(
  settings: GenerationSettings,
  label: SectionLabel,
): GroovePattern {
  const minor = settings.mode === "minor";
  if (label === "D") {
    return {
      id: "groove-fallback-ending",
      roots: minor ? ["iv", "V", "i"] : ["IV", "V", "I"],
      functions: ["predominant", "dominant", "tonic"],
      durations: [1, 1, 2],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      tags: ["ending"],
    };
  }
  if (label === "B") {
    return {
      id: "groove-fallback-development",
      roots: minor ? ["i", "bVII", "bVI", "V"] : ["I", "IV", "vi", "V"],
      functions: minor
        ? ["tonic", "color", "predominant", "dominant"]
        : ["tonic", "predominant", "tonic", "dominant"],
      durations: [2, 2, 2, 2],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      tags: ["release"],
    };
  }
  if (label === "C") {
    return {
      id: "groove-fallback-bridge",
      roots: minor ? ["bVI", "bVII", "i"] : ["IV", "I", "V"],
      functions: ["predominant", "color", "tonic"],
      durations: [2, 2, 4],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      tags: ["bridge"],
    };
  }
  return {
    id: "groove-fallback-theme",
    roots: minor ? ["i", "iv"] : ["I", "IV"],
    functions: ["tonic", "predominant"],
    durations: [4, 4],
    weight: 1,
    modes: [settings.mode],
    sections: [label],
    minimumFreedom: "strict",
    tags: ["hook"],
  };
}

function selectPattern(
  settings: GenerationSettings,
  styleProfile: StyleProfile,
  label: SectionLabel,
  avoidSections: readonly JamSection[],
  config: GrooveStyleConfig,
  random: RandomSource,
): GroovePattern {
  const archetype = config.archetype(
    styleProfile.archetypeId ?? config.defaultArchetypeId,
  );
  const candidates = archetype.patterns.filter(
    (candidate) =>
      candidate.modes.includes(settings.mode) &&
      candidate.sections.includes(label) &&
      (!candidate.allowedMeters || candidate.allowedMeters.includes(settings.meter)) &&
      (settings.meter !== "3/4" || candidate.durations.every(Number.isInteger)) &&
      FREEDOM_RANK[candidate.minimumFreedom] <= FREEDOM_RANK[settings.harmonicFreedom] &&
      COMPLEXITY_RANK[candidate.minimumComplexity ?? "easy"] <=
        COMPLEXITY_RANK[settings.complexity],
  );
  if (candidates.length === 0) return fallbackPattern(settings, label);
  const distinct = candidates.filter((candidate) =>
    avoidSections.every((section) => !tooSimilar(candidate, section)),
  );
  const selectable = distinct.length > 0 ? distinct : candidates;
  return weightedChoice(
    selectable.map((candidate) => {
      let weight = candidate.weight;
      if (label === "A" && candidate.tags?.includes("hook")) weight *= 1.7;
      if (label === "B" && candidate.tags?.includes("release")) weight *= 1.45;
      if (label === "C" && candidate.tags?.includes("bridge")) weight *= 1.8;
      if (label === "D" && candidate.tags?.includes("ending")) weight *= 2.4;
      return { value: candidate, weight };
    }),
    random,
  );
}

export function generateGrooveStyleSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
  config: GrooveStyleConfig;
  avoidSections?: JamSection[];
}): GenerationResult<JamSection> {
  const {
    seed,
    settings,
    styleProfile,
    label,
    config,
    avoidSections = [],
  } = request;
  const random = createSeededRandom(
    deriveSeed(seed, `${config.styleId}:section:${label}`),
  );
  const selected = selectPattern(
    settings,
    styleProfile,
    label,
    avoidSections,
    config,
    random,
  );
  let startBar = 0;
  const chords: GeneratedChord[] = selected.roots.map((root, index) => {
    const harmonicFunction = selected.functions[index] ?? "color";
    const roman = colorRoman(
      root,
      harmonicFunction,
      selected,
      settings,
      config,
      random,
    );
    const durationBars = selected.durations[index] ?? 1;
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(seed, `${config.styleId}:${label}:chord:${index}`)}`,
      source: "generated",
      roman,
      renderedSymbol: renderRomanChord(roman, settings.key, settings.mode),
      harmonicFunction,
      startBar,
      durationBars,
    };
    startBar += durationBars;
    return chord;
  });

  return {
    value: {
      id: `section-${deriveSeed(seed, `${config.styleId}:${label}:id`)}`,
      label,
      displayName: `Тема ${label}`,
      role: sectionRole(label),
      bars: startBar,
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
    usedFallback: selected.id.startsWith("groove-fallback"),
  };
}
