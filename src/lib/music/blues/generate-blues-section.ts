import { bluesArchetype, type BluesPattern } from "@/data/styles/blues";
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

function role(label: SectionLabel): SectionRole {
  if (label === "A") return "theme";
  if (label === "B") return "development";
  if (label === "C") return "bridge";
  return "coda";
}

function contextualRoot(root: string, settings: GenerationSettings): string {
  if (settings.mode !== "minor") return root;
  if (root === "I") return "i";
  if (root === "IV") return "iv";
  if (root === "ii7") return "ii7b5";
  return root;
}

function weightedSuffix(
  root: string,
  settings: GenerationSettings,
  random: RandomSource,
): string {
  const lowercase = /(?:^|[b#])[iv]+$/.test(root);
  let choices: WeightedValue<string>[];

  if (settings.complexity === "easy") {
    choices = [{ value: "7", weight: 1 }];
  } else if (settings.complexity === "medium") {
    choices = lowercase
      ? [{ value: "7", weight: 72 }, { value: "9", weight: 28 }]
      : root === "V"
        ? [{ value: "7", weight: 58 }, { value: "9", weight: 30 }, { value: "7sus4", weight: 12 }]
        : [{ value: "7", weight: 62 }, { value: "9", weight: 30 }, { value: "6", weight: 8 }];
  } else {
    choices = lowercase
      ? [{ value: "7", weight: 30 }, { value: "9", weight: 36 }, { value: "11", weight: 34 }]
      : root === "V"
        ? [
            { value: "7", weight: 22 },
            { value: "9", weight: 22 },
            { value: "13", weight: 22 },
            { value: "7b9", weight: 12 },
            { value: "7#9", weight: 12 },
            { value: "9sus4", weight: 10 },
          ]
        : [{ value: "7", weight: 24 }, { value: "9", weight: 38 }, { value: "13", weight: 30 }, { value: "6", weight: 8 }];
  }

  return weightedChoice(choices, random);
}

function colorRoman(
  rawRoot: string,
  settings: GenerationSettings,
  random: RandomSource,
): string {
  const contextual = contextualRoot(rawRoot, settings);
  const explicit = /(?:dim7|7b5|7#9|7b9|13sus4|9sus4|7sus4|11|13|9|7|6)$/.test(contextual);
  if (explicit) return contextual;
  return `${contextual}${weightedSuffix(contextual, settings, random)}`;
}

function harmonicFunction(roman: string): HarmonicFunction {
  const root = roman.replace(/(?:dim7|7b5|7#9|7b9|13sus4|9sus4|7sus4|11|13|9|7|6)$/, "");
  if (/^(?:I|i)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|#IV)$/.test(root)) return "predominant";
  if (/^(?:V|v)$/.test(root)) return "dominant";
  return "color";
}

function fallbackPattern(settings: GenerationSettings, label: SectionLabel): BluesPattern {
  return {
    id: label === "D" ? "fallback-ending" : "fallback-12",
    roots: label === "D"
      ? ["I", "IV", "I", "V", "IV", "I"]
      : ["I", "IV", "I", "V", "IV", "I", "V"],
    durations: label === "D"
      ? [4, 2, 2, 1, 1, 2]
      : [4, 2, 2, 1, 1, 1, 1],
    weight: 1,
    modes: [settings.mode],
    sections: [label],
    minimumFreedom: "strict",
    minimumComplexity: "easy",
    tags: label === "D" ? ["ending"] : ["base"],
  };
}

function selectPattern(
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
  random: RandomSource,
): BluesPattern {
  const config = bluesArchetype(profile.archetypeId ?? "classic-12");
  const candidates = config.patterns.filter(
    (candidate) =>
      candidate.modes.includes(settings.mode) &&
      candidate.sections.includes(label) &&
      FREEDOM_RANK[candidate.minimumFreedom] <= FREEDOM_RANK[settings.harmonicFreedom] &&
      COMPLEXITY_RANK[candidate.minimumComplexity] <= COMPLEXITY_RANK[settings.complexity],
  );
  if (candidates.length === 0) return fallbackPattern(settings, label);

  return weightedChoice(
    candidates.map((candidate) => {
      let weight = candidate.weight;
      if (label === "A" && candidate.tags?.includes("base")) weight *= 1.7;
      if (label === "B" && candidate.tags?.includes("turnaround")) weight *= 1.5;
      if (label === "C" && (candidate.tags?.includes("riff") || candidate.tags?.includes("stop"))) weight *= 1.8;
      if (label === "D" && candidate.tags?.includes("ending")) weight *= 3;
      return { value: candidate, weight };
    }),
    random,
  );
}

export function generateBluesSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
}): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, label } = request;
  const random = createSeededRandom(deriveSeed(seed, `blues:section:${label}`));
  const selected = selectPattern(styleProfile, settings, label, random);
  let startBar = 0;
  const chords: GeneratedChord[] = selected.roots.map((root, index) => {
    const roman = colorRoman(root, settings, random);
    const durationBars = selected.durations[index] ?? 1;
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(seed, `blues:${label}:chord:${index}`)}`,
      source: "generated",
      roman,
      renderedSymbol: renderRomanChord(roman, settings.key, settings.mode),
      harmonicFunction: harmonicFunction(roman),
      startBar,
      durationBars,
    };
    startBar += durationBars;
    return chord;
  });

  return {
    value: {
      id: `section-${deriveSeed(seed, `blues:${label}:id`)}`,
      label,
      displayName: `Тема ${label}`,
      role: role(label),
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
    usedFallback: false,
  };
}
