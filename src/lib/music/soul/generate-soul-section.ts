import { soulArchetype, type SoulPattern } from "@/data/styles/soul";
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

const EXPLICIT_SUFFIX = /(?:maj7|maj9|6\/9|add2|add4|add9|sus2|sus4|7sus4|9sus4|13sus4|7#9|7b9|7b5|dim7|dim|aug|11|13|9|7|6|5)$/;

function role(label: SectionLabel): SectionRole {
  if (label === "A") return "theme";
  if (label === "B") return "development";
  if (label === "C") return "bridge";
  return "coda";
}

function weightedSuffix(root: string, settings: GenerationSettings, random: RandomSource): string {
  const lower = /(?:^|[b#])[iv]+$/.test(root);
  let choices: WeightedValue<string>[];

  if (settings.complexity === "easy") {
    return "";
  }

  if (settings.complexity === "medium") {
    choices = lower
      ? [{ value: "", weight: 24 }, { value: "7", weight: 58 }, { value: "9", weight: 18 }]
      : root === "V"
        ? [{ value: "7", weight: 55 }, { value: "9", weight: 20 }, { value: "7sus4", weight: 12 }, { value: "", weight: 13 }]
        : [{ value: "", weight: 18 }, { value: "6", weight: 18 }, { value: "maj7", weight: 36 }, { value: "add9", weight: 28 }];
  } else {
    choices = lower
      ? [{ value: "7", weight: 24 }, { value: "9", weight: 42 }, { value: "11", weight: 28 }, { value: "", weight: 6 }]
      : root === "V"
        ? [{ value: "7", weight: 18 }, { value: "9", weight: 25 }, { value: "13", weight: 34 }, { value: "7b9", weight: 8 }, { value: "9sus4", weight: 9 }, { value: "", weight: 6 }]
        : [{ value: "maj7", weight: 20 }, { value: "maj9", weight: 36 }, { value: "6/9", weight: 24 }, { value: "add9", weight: 14 }, { value: "", weight: 6 }];
  }

  return weightedChoice(choices, random);
}

function colorRoman(rawRoot: string, settings: GenerationSettings, random: RandomSource): string {
  if (rawRoot === "V7/V" || EXPLICIT_SUFFIX.test(rawRoot)) return rawRoot;
  return `${rawRoot}${weightedSuffix(rawRoot, settings, random)}`;
}

function harmonicFunction(roman: string): HarmonicFunction {
  const root = roman.replace(EXPLICIT_SUFFIX, "");
  if (/^(?:I|i|iii|vi|bIII)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|bVI|#IV)$/.test(root)) return "predominant";
  if (/^(?:V|v)$/.test(root) || roman === "V7/V") return "dominant";
  return "color";
}

function fallbackPattern(settings: GenerationSettings, label: SectionLabel): SoulPattern {
  const minor = settings.mode === "minor";
  const rootsByLabel: Record<SectionLabel, string[]> = minor
    ? {
        A: ["i", "iv"],
        B: ["i", "bVII", "bVI", "v"],
        C: ["iv", "bVI", "V", "i"],
        D: ["iv", "V", "i"],
      }
    : {
        A: ["I", "IV"],
        B: ["I", "vi", "IV", "V"],
        C: ["ii", "V", "IV", "I"],
        D: ["IV", "V", "I"],
      };
  const durationsByLabel: Record<SectionLabel, number[]> = {
    A: [2, 2],
    B: [1, 1, 1, 1],
    C: [1, 1, 1, 1],
    D: [1, 1, 2],
  };
  return {
    id: label === "D" ? "fallback-ending" : "fallback-groove",
    roots: rootsByLabel[label],
    durations: durationsByLabel[label],
    weight: 1,
    modes: [settings.mode],
    sections: [label],
    minimumFreedom: "strict",
    minimumComplexity: "easy",
    tags: label === "D" ? ["ending"] : ["hook", "vamp"],
  };
}

function structuralRoot(roman: string): string {
  return roman.replace(EXPLICIT_SUFFIX, "");
}

function sectionStructure(section: JamSection): string[] {
  return section.chords.map(({ roman }) => structuralRoot(roman));
}

function isTooSimilar(pattern: SoulPattern, section: JamSection): boolean {
  const candidate = pattern.roots.map(structuralRoot);
  const previous = sectionStructure(section);
  if (candidate.join("|") === previous.join("|")) return true;
  if (candidate.length !== previous.length) return false;

  const candidateSet = new Set(candidate);
  const previousSet = new Set(previous);
  const intersection = [...candidateSet].filter((root) => previousSet.has(root)).length;
  const union = new Set([...candidateSet, ...previousSet]).size;
  return union > 0 && intersection / union >= 0.75;
}

function selectPattern(
  profile: StyleProfile,
  settings: GenerationSettings,
  label: SectionLabel,
  random: RandomSource,
  avoidSections: readonly JamSection[],
): SoulPattern {
  const config = soulArchetype(profile.archetypeId ?? "motown-pop");
  const candidates = config.patterns.filter(
    (candidate) =>
      candidate.modes.includes(settings.mode) &&
      candidate.sections.includes(label) &&
      FREEDOM_RANK[candidate.minimumFreedom] <= FREEDOM_RANK[settings.harmonicFreedom] &&
      COMPLEXITY_RANK[candidate.minimumComplexity] <= COMPLEXITY_RANK[settings.complexity],
  );
  if (candidates.length === 0) return fallbackPattern(settings, label);

  const distinctCandidates = candidates.filter(
    (candidate) => !avoidSections.some((section) => isTooSimilar(candidate, section)),
  );
  if (distinctCandidates.length === 0 && avoidSections.length > 0) {
    return fallbackPattern(settings, label);
  }
  const selectable = distinctCandidates.length > 0 ? distinctCandidates : candidates;

  return weightedChoice(
    selectable.map((candidate) => {
      let weight = candidate.weight;
      if (label === "A" && (candidate.tags?.includes("hook") || candidate.tags?.includes("vamp"))) weight *= 1.7;
      if (label === "B" && candidate.tags?.includes("chorus")) weight *= 1.45;
      if (label === "C" && candidate.tags?.includes("bridge")) weight *= 2;
      if (label === "D" && candidate.tags?.includes("ending")) weight *= 3;
      return { value: candidate, weight };
    }),
    random,
  );
}

export function generateSoulSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
  avoidSections?: JamSection[];
}): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, label, avoidSections = [] } = request;
  const random = createSeededRandom(deriveSeed(seed, `soul:section:${label}`));
  const selected = selectPattern(
    styleProfile,
    settings,
    label,
    random,
    avoidSections,
  );
  let startBar = 0;
  const chords: GeneratedChord[] = selected.roots.map((root, index) => {
    const roman = colorRoman(root, settings, random);
    const durationBars = selected.durations[index] ?? 1;
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(seed, `soul:${label}:chord:${index}`)}`,
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
      id: `section-${deriveSeed(seed, `soul:${label}:id`)}`,
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
