import { jazzArchetype, type JazzPattern } from "@/data/styles/jazz";
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
  WeightedValue,
} from "../domain/types";
import type { GenerationResult } from "../generator/contracts";
import {
  createSeededRandom,
  deriveSeed,
  weightedChoice,
  type RandomSource,
} from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";

const FREEDOM_RANK: Record<HarmonicFreedom, number> = { strict: 0, colorful: 1, adventurous: 2 };
const COMPLEXITY_RANK: Record<Complexity, number> = { easy: 0, medium: 1, advanced: 2 };
const EXPLICIT_SUFFIX = /(?:maj7#11|maj9#11|maj7|maj9|6\/9|add2|add4|add9|sus2|sus4|7sus4|9sus4|13sus4|13b9|7alt|7#9|7b9|7b5|dim7|dim|aug|11|13|9|7|6|5)$/;

function role(label: SectionLabel): SectionRole {
  if (label === "A") return "theme";
  if (label === "B") return "development";
  if (label === "C") return "bridge";
  return "coda";
}

function suffix(
  root: string,
  harmonicFunction: HarmonicFunction,
  pattern: JazzPattern,
  settings: GenerationSettings,
  random: RandomSource,
): string {
  if (settings.complexity === "easy") return "";
  const lower = /(?:^|[b#])[iv]+$/.test(root);
  const sus = pattern.tags?.includes("sus") && !lower;
  let choices: WeightedValue<string>[];

  if (settings.complexity === "medium") {
    if (sus) choices = [{ value: "7sus4", weight: 78 }, { value: "sus4", weight: 22 }];
    else if (harmonicFunction === "dominant") choices = [{ value: "7", weight: 68 }, { value: "9", weight: 24 }, { value: "", weight: 8 }];
    else if (lower) choices = [{ value: "7", weight: 65 }, { value: "9", weight: 22 }, { value: "", weight: 13 }];
    else if (harmonicFunction === "tonic") choices = [{ value: "maj7", weight: 50 }, { value: "6", weight: 28 }, { value: "", weight: 22 }];
    else choices = [{ value: "maj7", weight: 42 }, { value: "7", weight: 28 }, { value: "6", weight: 15 }, { value: "", weight: 15 }];
  } else if (sus) {
    choices = [{ value: "13sus4", weight: 45 }, { value: "9sus4", weight: 35 }, { value: "7sus4", weight: 20 }];
  } else if (harmonicFunction === "dominant") {
    choices = root === "bII"
      ? [{ value: "13", weight: 42 }, { value: "9", weight: 30 }, { value: "7", weight: 18 }, { value: "7b5", weight: 10 }]
      : [{ value: "13", weight: 25 }, { value: "9", weight: 20 }, { value: "7b9", weight: 18 }, { value: "7#9", weight: 13 }, { value: "7alt", weight: 12 }, { value: "13b9", weight: 7 }, { value: "7", weight: 5 }];
  } else if (lower) {
    choices = [{ value: "9", weight: 38 }, { value: "11", weight: 32 }, { value: "7", weight: 24 }, { value: "", weight: 6 }];
  } else if (harmonicFunction === "tonic") {
    choices = [{ value: "maj9", weight: 32 }, { value: "6/9", weight: 25 }, { value: "maj7", weight: 20 }, { value: "maj7#11", weight: pattern.tags?.includes("modal") ? 17 : 8 }, { value: "6", weight: 10 }, { value: "", weight: 5 }];
  } else {
    choices = [{ value: "maj9", weight: 28 }, { value: "maj7#11", weight: 24 }, { value: "13", weight: 18 }, { value: "9", weight: 15 }, { value: "maj7", weight: 10 }, { value: "", weight: 5 }];
  }
  return weightedChoice(choices, random);
}

function coloredRoman(
  rawRoot: string,
  harmonicFunction: HarmonicFunction,
  pattern: JazzPattern,
  settings: GenerationSettings,
  random: RandomSource,
): string {
  if (EXPLICIT_SUFFIX.test(rawRoot)) return rawRoot;
  return `${rawRoot}${suffix(rawRoot, harmonicFunction, pattern, settings, random)}`;
}

function fallbackPattern(settings: GenerationSettings, label: SectionLabel): JazzPattern {
  const minor = settings.mode === "minor";
  if (label === "D") {
    return {
      id: "jazz-fallback-ending",
      roots: minor ? ["iv", "V", "i"] : ["ii", "V", "I"],
      functions: ["predominant", "dominant", "tonic"],
      durations: [2, 2, 4],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      minimumComplexity: "easy",
      tags: ["ending"],
    };
  }
  if (label === "B") {
    return {
      id: "jazz-fallback-development",
      roots: minor ? ["i", "bVII", "bVI", "V"] : ["I", "IV", "ii", "V"],
      functions: minor
        ? ["tonic", "color", "predominant", "dominant"]
        : ["tonic", "predominant", "predominant", "dominant"],
      durations: [2, 2, 2, 2],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      minimumComplexity: "easy",
      tags: ["release"],
    };
  }
  if (label === "C") {
    return {
      id: "jazz-fallback-bridge",
      roots: minor ? ["bIII", "iv", "V", "i"] : ["IV", "I", "ii", "V"],
      functions: minor
        ? ["tonic", "predominant", "dominant", "tonic"]
        : ["predominant", "tonic", "predominant", "dominant"],
      durations: [2, 2, 2, 2],
      weight: 1,
      modes: [settings.mode],
      sections: [label],
      minimumFreedom: "strict",
      minimumComplexity: "easy",
      tags: ["bridge"],
    };
  }
  return {
    id: "jazz-fallback-form",
    roots: minor ? ["i", "iv", "V", "i"] : ["I", "vi", "ii", "V"],
    functions: minor ? ["tonic", "predominant", "dominant", "tonic"] : ["tonic", "tonic", "predominant", "dominant"],
    durations: [2, 2, 2, 2],
    weight: 1,
    modes: [settings.mode],
    sections: [label],
    minimumFreedom: "strict",
    minimumComplexity: "easy",
    tags: label === "A" ? ["hook"] : ["release"],
  };
}

function structuralRoot(roman: string): string {
  return roman.replace(EXPLICIT_SUFFIX, "");
}

function isTooSimilar(pattern: JazzPattern, section: JamSection): boolean {
  const candidate = pattern.roots.map(structuralRoot);
  const previous = section.chords.map(({ roman }) => structuralRoot(roman));
  if (candidate.join("|") === previous.join("|")) return true;
  if (candidate.length !== previous.length) return false;
  const overlap = candidate.filter((root, index) => root === previous[index]).length;
  return overlap / candidate.length >= 0.75;
}

function candidatesFor(
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
): JazzPattern[] {
  return jazzArchetype(profile.archetypeId ?? "swing-standard").patterns.filter(
    (candidate) =>
      candidate.modes.includes(settings.mode) &&
      candidate.sections.includes(label) &&
      (!candidate.allowedMeters || candidate.allowedMeters.includes(settings.meter)) &&
      (settings.meter !== "3/4" || candidate.durations.every(Number.isInteger)) &&
      FREEDOM_RANK[candidate.minimumFreedom] <= FREEDOM_RANK[settings.harmonicFreedom] &&
      COMPLEXITY_RANK[candidate.minimumComplexity] <= COMPLEXITY_RANK[settings.complexity],
  );
}

function selectPattern(
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
  avoidSections: readonly JamSection[],
  random: RandomSource,
): JazzPattern {
  const candidates = candidatesFor(profile, settings, label);
  if (candidates.length === 0) return fallbackPattern(settings, label);
  const distinct = candidates.filter((candidate) => avoidSections.every((section) => !isTooSimilar(candidate, section)));
  const selectable = distinct.length > 0 ? distinct : candidates;
  return weightedChoice(selectable.map((candidate) => {
    let weight = candidate.weight;
    if (label === "A" && candidate.tags?.includes("hook")) weight *= 1.8;
    if (label === "B" && candidate.tags?.includes("release")) weight *= 1.5;
    if (label === "C" && candidate.tags?.includes("bridge")) weight *= 2;
    if (label === "D" && candidate.tags?.includes("ending")) weight *= 3;
    return { value: candidate, weight };
  }), random);
}

export function generateJazzSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
  avoidSections?: JamSection[];
}): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, label, avoidSections = [] } = request;
  const random = createSeededRandom(deriveSeed(seed, `jazz:section:${label}`));
  const selected = selectPattern(styleProfile, settings, label, avoidSections, random);
  let startBar = 0;
  const chords: GeneratedChord[] = selected.roots.map((root, index) => {
    const harmonicFunction = selected.functions[index] ?? "color";
    const roman = coloredRoman(root, harmonicFunction, selected, settings, random);
    const durationBars = selected.durations[index] ?? 1;
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(seed, `jazz:${label}:chord:${index}`)}`,
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
      id: `section-${deriveSeed(seed, `jazz:${label}:id`)}`,
      label,
      displayName: `Тема ${label}`,
      role: role(label),
      bars: startBar,
      repeats: 1,
      locked: false,
      generationSeed: seed,
      harmonySettings: { key: settings.key, mode: settings.mode, complexity: settings.complexity, harmonicFreedom: settings.harmonicFreedom },
      chords,
    },
    attempts: 1,
    usedFallback: selected.id.startsWith("jazz-fallback"),
  };
}
