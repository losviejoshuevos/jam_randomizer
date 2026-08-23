import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "@/lib/music/domain/style-profile";
import type {
  Complexity,
  HarmonicFreedom,
  HarmonicFunction,
  Mode,
  SectionLabel,
  WeightedValue,
} from "@/lib/music/domain/types";
import { createSeededRandom, deriveSeed, weightedChoice } from "@/lib/music/random";

export type BluesArchetypeId =
  | "classic-12"
  | "chicago-stop"
  | "texas-shuffle"
  | "minor-modern"
  | "slow-blues"
  | "one-chord-boogie"
  | "eight-bar-roadhouse";

export interface BluesPattern {
  id: string;
  roots: string[];
  durations: number[];
  weight: number;
  modes: Mode[];
  sections: SectionLabel[];
  minimumFreedom: HarmonicFreedom;
  minimumComplexity: Complexity;
  tags?: ("base" | "quick" | "turnaround" | "stop" | "ending" | "riff")[];
}

export interface BluesArchetypeConfig {
  id: BluesArchetypeId;
  weight: number;
  bpmRange: { min: number; max: number };
  bpmRanges: WeightedValue<{ min: number; max: number }>[];
  patterns: BluesPattern[];
}

const ALL_MODES: Mode[] = ["major", "minor"];
const ALL_SECTIONS: SectionLabel[] = ["A", "B", "C", "D"];

function pattern(
  id: string,
  roots: string[],
  durations: number[],
  weight: number,
  sections: SectionLabel[] = ALL_SECTIONS,
  minimumFreedom: HarmonicFreedom = "strict",
  minimumComplexity: Complexity = "easy",
  tags?: BluesPattern["tags"],
): BluesPattern {
  return {
    id,
    roots,
    durations,
    weight,
    modes: ALL_MODES,
    sections,
    minimumFreedom,
    minimumComplexity,
    tags,
  };
}

const STANDARD_12 = pattern(
  "standard-12",
  ["I", "IV", "I", "V", "IV", "I", "V"],
  [4, 2, 2, 1, 1, 1, 1],
  16,
  ["A", "B", "C"],
  "strict",
  "easy",
  ["base", "turnaround"],
);
const STANDARD_12_END = pattern(
  "standard-12-end",
  ["I", "IV", "I", "V", "IV", "I"],
  [4, 2, 2, 1, 1, 2],
  16,
  ["D"],
  "strict",
  "easy",
  ["ending"],
);
const QUICK_12 = pattern(
  "quick-change-12",
  ["I", "IV", "I", "IV", "I", "V", "IV", "I"],
  [1, 1, 2, 2, 2, 1, 1, 2],
  12,
  ALL_SECTIONS,
  "strict",
  "easy",
  ["quick"],
);
const DIMINISHED_12 = pattern(
  "diminished-passing-12",
  ["I", "IV", "#IVdim7", "I", "ii7", "V", "I", "V"],
  [4, 1, 1, 2, 1, 1, 1, 1],
  5,
  ["B", "C"],
  "adventurous",
  "advanced",
  ["turnaround"],
);

const CLASSIC_PATTERNS = [STANDARD_12, STANDARD_12_END, QUICK_12, DIMINISHED_12];

const CHICAGO_PATTERNS = [
  pattern("chicago-16", ["I", "IV", "I", "V", "IV", "I", "V"], [8, 2, 2, 1, 1, 1, 1], 18, ["A", "B"], "strict", "easy", ["base", "stop"]),
  pattern("chicago-16-end", ["I", "IV", "I", "V", "IV", "I"], [8, 2, 2, 1, 1, 2], 18, ["D"], "strict", "easy", ["ending", "stop"]),
  pattern("chicago-riff-12", ["I", "IV", "I", "V", "IV", "I"], [4, 2, 2, 1, 1, 2], 12, ALL_SECTIONS, "strict", "easy", ["riff", "stop"]),
  QUICK_12,
];

const TEXAS_PATTERNS = [
  STANDARD_12,
  STANDARD_12_END,
  QUICK_12,
  pattern("texas-riff-8", ["I", "IV", "I", "V", "I"], [2, 2, 2, 1, 1], 10, ["B", "C"], "strict", "easy", ["riff"]),
  pattern("texas-bad-sign-8", ["I", "IV", "I", "V", "IV", "I"], [3, 1, 1, 1, 1, 1], 7, ["B", "C"], "colorful", "easy", ["riff"]),
];

const MINOR_PATTERNS = [
  pattern("minor-12", ["I", "IV", "I", "V", "IV", "I", "V"], [4, 2, 2, 1, 1, 1, 1], 14, ["A", "B", "C"], "strict", "easy", ["base", "turnaround"]),
  STANDARD_12_END,
  pattern("thrill-minor-12", ["I", "IV", "I", "bVI", "V", "I", "V"], [4, 2, 2, 1, 1, 1, 1], 16, ["A", "B", "C"], "colorful", "easy", ["turnaround"]),
  pattern("thrill-minor-end", ["I", "IV", "I", "bVI", "V", "I"], [4, 2, 2, 1, 1, 2], 18, ["D"], "colorful", "easy", ["ending"]),
  DIMINISHED_12,
];

const SLOW_PATTERNS = [
  STANDARD_12,
  STANDARD_12_END,
  pattern("stormy-color", ["I", "IV", "iv", "I", "ii7", "V", "I", "V"], [4, 1, 1, 2, 1, 1, 1, 1], 13, ["B", "C"], "colorful", "medium", ["turnaround"]),
  pattern("stormy-end", ["I", "IV", "iv", "I", "V", "I"], [4, 1, 1, 2, 1, 3], 15, ["D"], "colorful", "medium", ["ending"]),
  DIMINISHED_12,
];

const ONE_CHORD_PATTERNS = [
  pattern("one-chord-4", ["I"], [4], 22, ["A", "C", "D"], "strict", "easy", ["base", "riff"]),
  pattern("one-chord-8", ["I"], [8], 15, ["A", "C"], "strict", "easy", ["base", "riff"]),
  pattern("one-chord-response", ["I", "IV", "I"], [4, 2, 2], 10, ["B"], "strict", "easy", ["riff"]),
  pattern("one-chord-turn", ["I", "V"], [7, 1], 8, ["B"], "colorful", "easy", ["turnaround"]),
];

const EIGHT_BAR_PATTERNS = [
  pattern("key-to-highway-8", ["I", "V", "IV", "I", "V", "I", "V"], [1, 1, 2, 1, 1, 1, 1], 20, ["A", "B", "C"], "strict", "easy", ["base", "turnaround"]),
  pattern("key-to-highway-end", ["I", "V", "IV", "I", "V", "I"], [1, 1, 2, 1, 1, 2], 20, ["D"], "strict", "easy", ["ending"]),
  pattern("roadhouse-riff-8", ["I", "IV", "I", "V", "IV", "I"], [2, 1, 1, 1, 1, 2], 13, ALL_SECTIONS, "strict", "easy", ["riff"]),
];

export const BLUES_ARCHETYPES: BluesArchetypeConfig[] = [
  { id: "classic-12", weight: 24, bpmRange: { min: 65, max: 155 }, bpmRanges: [{ value: { min: 82, max: 128 }, weight: 72 }, { value: { min: 65, max: 81 }, weight: 14 }, { value: { min: 129, max: 155 }, weight: 14 }], patterns: CLASSIC_PATTERNS },
  { id: "chicago-stop", weight: 15, bpmRange: { min: 58, max: 135 }, bpmRanges: [{ value: { min: 70, max: 102 }, weight: 78 }, { value: { min: 58, max: 69 }, weight: 10 }, { value: { min: 103, max: 135 }, weight: 12 }], patterns: CHICAGO_PATTERNS },
  { id: "texas-shuffle", weight: 18, bpmRange: { min: 84, max: 158 }, bpmRanges: [{ value: { min: 104, max: 134 }, weight: 76 }, { value: { min: 84, max: 103 }, weight: 12 }, { value: { min: 135, max: 158 }, weight: 12 }], patterns: TEXAS_PATTERNS },
  { id: "minor-modern", weight: 13, bpmRange: { min: 55, max: 115 }, bpmRanges: [{ value: { min: 70, max: 94 }, weight: 80 }, { value: { min: 55, max: 69 }, weight: 10 }, { value: { min: 95, max: 115 }, weight: 10 }], patterns: MINOR_PATTERNS },
  { id: "slow-blues", weight: 12, bpmRange: { min: 42, max: 92 }, bpmRanges: [{ value: { min: 55, max: 76 }, weight: 82 }, { value: { min: 42, max: 54 }, weight: 9 }, { value: { min: 77, max: 92 }, weight: 9 }], patterns: SLOW_PATTERNS },
  { id: "one-chord-boogie", weight: 9, bpmRange: { min: 68, max: 175 }, bpmRanges: [{ value: { min: 90, max: 142 }, weight: 76 }, { value: { min: 68, max: 89 }, weight: 10 }, { value: { min: 143, max: 175 }, weight: 14 }], patterns: ONE_CHORD_PATTERNS },
  { id: "eight-bar-roadhouse", weight: 9, bpmRange: { min: 68, max: 150 }, bpmRanges: [{ value: { min: 88, max: 124 }, weight: 78 }, { value: { min: 68, max: 87 }, weight: 10 }, { value: { min: 125, max: 150 }, weight: 12 }], patterns: EIGHT_BAR_PATTERNS },
];

export const BLUES_ARCHETYPE_WEIGHTS = BLUES_ARCHETYPES.map(({ id, weight }) => ({ value: id, weight }));

export function bluesArchetype(id: string): BluesArchetypeConfig {
  return BLUES_ARCHETYPES.find((item) => item.id === id) ?? BLUES_ARCHETYPES[0];
}

function functionForRoman(roman: string): HarmonicFunction {
  const root = roman.replace(/(?:maj7|7#9|7b9|13sus4|9sus4|7sus4|dim7|7b5|11|13|9|7|6)$/, "");
  if (/^(?:I|i)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|#IV)$/.test(root)) return "predominant";
  if (/^(?:V|v)$/.test(root)) return "dominant";
  return "color";
}

function chordVocabulary(): ChordDefinition[] {
  const result: ChordDefinition[] = [];
  const roots: { root: string; modes: Mode[]; pool: HarmonicPool }[] = [
    { root: "I", modes: ["major"], pool: "core" },
    { root: "IV", modes: ["major"], pool: "core" },
    { root: "V", modes: ALL_MODES, pool: "core" },
    { root: "i", modes: ["minor"], pool: "core" },
    { root: "iv", modes: ["minor"], pool: "core" },
    { root: "bVI", modes: ["minor"], pool: "nearby" },
    { root: "ii", modes: ALL_MODES, pool: "nearby" },
    { root: "#IV", modes: ALL_MODES, pool: "chromatic-near" },
  ];
  for (const { root, modes, pool } of roots) {
    const fn = functionForRoman(root);
    const baseSuffix = root === "ii" ? "7" : root === "#IV" ? "dim7" : "7";
    result.push({ roman: `${root}${baseSuffix}`, harmonicFunction: fn, weight: 12, minimumComplexity: "easy", allowedModes: modes, harmonicPool: pool });
    for (const suffix of root === "#IV" ? [] : ["9", "13"]) {
      result.push({ roman: `${root}${suffix}`, harmonicFunction: fn, weight: suffix === "9" ? 8 : 5, minimumComplexity: suffix === "9" ? "medium" : "advanced", allowedModes: modes, harmonicPool: pool });
    }
    if (root === "V") {
      for (const suffix of ["7sus4", "9sus4", "7b9", "7#9"]) {
        result.push({ roman: `${root}${suffix}`, harmonicFunction: fn, weight: 3, minimumComplexity: suffix === "7sus4" ? "medium" : "advanced", allowedModes: modes, harmonicPool: pool });
      }
    }
  }
  return result;
}

const BASE_RULE = {
  bars: [{ value: 12, weight: 1 }],
  allowedStartFunctions: [{ value: "tonic" as const, weight: 1 }],
  allowedEndFunctions: [{ value: "tonic" as const, weight: 2 }, { value: "dominant" as const, weight: 1 }],
  tension: "medium" as const,
  minimumDistinctFunctions: 1,
  requireLoopability: true,
};

export function resolveBluesStyleProfile(
  seed: string,
  requestedArchetypeId?: string,
): StyleProfile {
  const random = createSeededRandom(deriveSeed(seed, "blues:session-profile"));
  const archetypeId = requestedArchetypeId && BLUES_ARCHETYPES.some(({ id }) => id === requestedArchetypeId)
    ? requestedArchetypeId as BluesArchetypeId
    : weightedChoice(BLUES_ARCHETYPE_WEIGHTS, random);
  const config = bluesArchetype(archetypeId);
  return {
    id: "blues",
    name: "Blues",
    generatorKind: "blues",
    archetypeId,
    bpmRange: config.bpmRange,
    bpmRanges: config.bpmRanges,
    allowedMeters: [{ value: "4/4", weight: 98 }, { value: "3/4", weight: 2 }],
    allowedModes: [{ value: "major", weight: 68 }, { value: "minor", weight: 32 }],
    chordVocabulary: chordVocabulary(),
    transitions: {
      tonic: [{ value: "tonic", weight: 6 }, { value: "predominant", weight: 3 }, { value: "dominant", weight: 1 }],
      predominant: [{ value: "tonic", weight: 7 }, { value: "dominant", weight: 3 }],
      dominant: [{ value: "tonic", weight: 9 }, { value: "predominant", weight: 1 }],
      color: [{ value: "dominant", weight: 6 }, { value: "tonic", weight: 4 }],
      passing: [{ value: "tonic", weight: 5 }, { value: "dominant", weight: 5 }],
    },
    harmonicRhythms: [],
    sectionRules: { A: BASE_RULE, B: { ...BASE_RULE, requireLoopability: false } },
    harmonicPoolWeights: {
      strict: { core: 1, nearby: 0, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      colorful: { core: 1, nearby: 0.35, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      adventurous: { core: 1, nearby: 0.5, "chromatic-near": 0.2, "chromatic-medium": 0, "chromatic-far": 0 },
    },
    validationRules: { maximumSameChordInSequence: 12, maximumGenerationAttempts: 8, maximumPassingDurationBars: 0.5, requireDifferentBFromA: true },
  };
}

export const bluesStyleDescriptor = {
  id: "blues",
  name: "Blues",
  bpmRange: { min: 42, max: 175 },
} as const;
