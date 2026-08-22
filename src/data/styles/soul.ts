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

export type SoulArchetypeId =
  | "motown-pop"
  | "stax-groove"
  | "gospel-soul"
  | "deep-ballad"
  | "minor-vamp"
  | "philly-smooth"
  | "southern-build";

export interface SoulPattern {
  id: string;
  roots: string[];
  durations: number[];
  weight: number;
  modes: Mode[];
  sections: SectionLabel[];
  minimumFreedom: HarmonicFreedom;
  minimumComplexity: Complexity;
  tags?: ("hook" | "chorus" | "bridge" | "ending" | "vamp" | "gospel")[];
}

export interface SoulArchetypeConfig {
  id: SoulArchetypeId;
  weight: number;
  bpmRange: { min: number; max: number };
  bpmRanges: WeightedValue<{ min: number; max: number }>[];
  patterns: SoulPattern[];
}

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const ALL_SECTIONS: SectionLabel[] = ["A", "B", "C", "D"];

function pattern(
  id: string,
  roots: string[],
  durations: number[],
  weight: number,
  modes: Mode[],
  sections: SectionLabel[] = ALL_SECTIONS,
  minimumFreedom: HarmonicFreedom = "strict",
  minimumComplexity: Complexity = "easy",
  tags?: SoulPattern["tags"],
): SoulPattern {
  return { id, roots, durations, weight, modes, sections, minimumFreedom, minimumComplexity, tags };
}

const MOTOWN_PATTERNS: SoulPattern[] = [
  pattern("motown-i-iv", ["I", "IV"], [2, 2], 18, MAJOR, ["A"], "strict", "easy", ["hook", "vamp"]),
  pattern("motown-my-girl", ["I", "ii", "IV", "V"], [1, 1, 1, 1], 16, MAJOR, ["A", "B"], "strict", "easy", ["hook", "chorus"]),
  pattern("motown-pop-cycle", ["I", "vi", "IV", "V"], [1, 1, 1, 1], 15, MAJOR, ["A", "B"], "strict", "easy", ["hook", "chorus"]),
  pattern("motown-turnaround", ["I", "vi", "ii", "V"], [1, 1, 1, 1], 13, MAJOR, ["B", "C"], "strict", "easy", ["chorus"]),
  pattern("motown-bridge", ["IV", "V", "iii", "vi", "ii", "V", "I"], [1, 1, 1, 1, 1, 1, 2], 9, MAJOR, ["C"], "strict", "medium", ["bridge"]),
  pattern("motown-ending", ["IV", "V", "I"], [1, 1, 2], 20, MAJOR, ["D"], "strict", "easy", ["ending"]),
];

const STAX_PATTERNS: SoulPattern[] = [
  pattern("stax-i-iv-vamp", ["I", "IV"], [2, 2], 24, MAJOR, ["A", "B"], "strict", "easy", ["hook", "vamp"]),
  pattern("stax-dorian-vamp", ["i", "IV"], [2, 2], 22, MINOR, ["A", "B"], "strict", "easy", ["hook", "vamp"]),
  pattern("stax-midnight", ["I", "IV", "I", "V", "IV"], [2, 2, 1, 1, 2], 15, MAJOR, ["A", "B", "C"], "strict", "easy", ["hook"]),
  pattern("stax-knock", ["IV", "I", "IV", "V", "I"], [2, 2, 1, 1, 2], 12, MAJOR, ["B", "C"], "strict", "easy", ["chorus"]),
  pattern("stax-borrowed", ["I", "bVII", "IV", "I"], [2, 1, 1, 4], 8, MAJOR, ["B", "C"], "colorful", "easy", ["bridge"]),
  pattern("stax-ending-major", ["IV", "I"], [1, 3], 18, MAJOR, ["D"], "strict", "easy", ["ending"]),
  pattern("stax-ending-minor", ["IV", "i"], [1, 3], 18, MINOR, ["D"], "strict", "easy", ["ending"]),
];

const GOSPEL_PATTERNS: SoulPattern[] = [
  pattern("gospel-pop", ["I", "vi", "IV", "V"], [1, 1, 1, 1], 16, MAJOR, ["A", "B"], "strict", "easy", ["gospel", "hook"]),
  pattern("gospel-plagal", ["I", "iii", "IV", "I"], [1, 1, 1, 1], 15, MAJOR, ["A", "B"], "strict", "easy", ["gospel"]),
  pattern("gospel-two-five", ["ii", "V", "I", "vi"], [1, 1, 1, 1], 14, MAJOR, ["B", "C"], "strict", "medium", ["gospel", "chorus"]),
  pattern("gospel-minor-plagal", ["IV", "iv", "I"], [1, 1, 2], 9, MAJOR, ["B", "C"], "colorful", "medium", ["gospel", "bridge"]),
  pattern("gospel-minor", ["i", "iv", "bVI", "V"], [1, 1, 1, 1], 13, MINOR, ["A", "B", "C"], "strict", "easy", ["gospel"]),
  pattern("gospel-ending-major", ["ii", "V", "IV", "I"], [1, 1, 1, 1], 18, MAJOR, ["D"], "strict", "medium", ["ending", "gospel"]),
  pattern("gospel-ending-minor", ["iv", "V", "i"], [1, 1, 2], 18, MINOR, ["D"], "strict", "easy", ["ending", "gospel"]),
];

const BALLAD_PATTERNS: SoulPattern[] = [
  pattern("ballad-lift", ["I", "iii", "IV", "I"], [1, 1, 1, 1], 18, MAJOR, ["A", "B"], "strict", "easy", ["hook"]),
  pattern("ballad-circle", ["I", "vi", "ii", "V"], [1, 1, 1, 1], 16, MAJOR, ["A", "B", "C"], "strict", "easy", ["chorus"]),
  pattern("ballad-plagal-color", ["I", "IV", "iv", "I"], [1, 1, 1, 1], 11, MAJOR, ["B", "C"], "colorful", "medium", ["bridge"]),
  pattern("ballad-minor", ["i", "iv", "bVI", "V"], [1, 1, 1, 1], 18, MINOR, ["A", "B"], "strict", "easy", ["hook"]),
  pattern("ballad-minor-bridge", ["bVI", "bVII", "i", "V"], [1, 1, 1, 1], 12, MINOR, ["C"], "colorful", "easy", ["bridge"]),
  pattern("ballad-ending-major", ["vi", "ii", "V", "I"], [1, 1, 1, 1], 20, MAJOR, ["D"], "strict", "easy", ["ending"]),
  pattern("ballad-ending-minor", ["bVI", "V", "i"], [1, 1, 2], 20, MINOR, ["D"], "strict", "easy", ["ending"]),
];

const MINOR_VAMP_PATTERNS: SoulPattern[] = [
  pattern("minor-one-chord", ["i"], [4], 18, MINOR, ["A"], "strict", "easy", ["hook", "vamp"]),
  pattern("minor-dorian", ["i", "IV"], [2, 2], 23, MINOR, ["A", "B"], "strict", "easy", ["hook", "vamp"]),
  pattern("minor-aeolian", ["i", "bVII", "bVI", "bVII"], [1, 1, 1, 1], 18, MINOR, ["A", "B", "C"], "strict", "easy", ["vamp"]),
  pattern("minor-sunshine", ["i", "v", "bVII", "iv", "i"], [2, 1, 1, 2, 2], 14, MINOR, ["B", "C"], "strict", "easy", ["bridge"]),
  pattern("minor-dominant-lift", ["i", "iv", "bVI", "V"], [1, 1, 1, 1], 11, MINOR, ["B", "C"], "colorful", "medium", ["chorus"]),
  pattern("minor-ending", ["bVI", "bVII", "i"], [1, 1, 2], 22, MINOR, ["D"], "strict", "easy", ["ending"]),
];

const PHILLY_PATTERNS: SoulPattern[] = [
  pattern("philly-maj-nine-vamp", ["Imaj9", "IVmaj9"], [2, 2], 20, MAJOR, ["A"], "strict", "advanced", ["hook", "vamp"]),
  pattern("philly-circle", ["I", "vi", "ii", "V"], [1, 1, 1, 1], 18, MAJOR, ["A", "B"], "strict", "medium", ["chorus"]),
  pattern("philly-three-six-two-five", ["iii", "vi", "ii", "V"], [1, 1, 1, 1], 15, MAJOR, ["B", "C"], "strict", "medium", ["bridge"]),
  pattern("philly-side-step", ["ii9", "bIII7", "ii9", "IV7"], [1, 1, 1, 1], 9, MAJOR, ["C"], "adventurous", "advanced", ["bridge"]),
  pattern("philly-minor", ["i", "iv", "bVII", "bIII"], [1, 1, 1, 1], 14, MINOR, ["A", "B", "C"], "colorful", "medium", ["chorus"]),
  pattern("philly-ending-major", ["iii", "vi", "ii", "V", "I"], [1, 1, 1, 1, 4], 20, MAJOR, ["D"], "strict", "medium", ["ending"]),
  pattern("philly-ending-minor", ["iv", "V", "i"], [1, 1, 2], 20, MINOR, ["D"], "strict", "medium", ["ending"]),
];

const SOUTHERN_PATTERNS: SoulPattern[] = [
  pattern("southern-hook", ["I", "IV", "I", "V", "IV", "I"], [2, 2, 1, 1, 1, 1], 20, MAJOR, ["A", "B"], "strict", "easy", ["hook"]),
  pattern("southern-two-chord", ["I", "IV"], [2, 2], 18, MAJOR, ["A"], "strict", "easy", ["hook", "vamp"]),
  pattern("southern-rise", ["IV", "V", "vi", "IV", "V"], [1, 1, 2, 2, 2], 13, MAJOR, ["B", "C"], "strict", "easy", ["chorus"]),
  pattern("southern-borrowed", ["I", "bVII", "IV", "I"], [2, 1, 1, 4], 10, MAJOR, ["B", "C"], "colorful", "easy", ["bridge"]),
  pattern("southern-minor", ["i", "iv", "bVI", "V"], [2, 2, 1, 1], 16, MINOR, ["A", "B", "C"], "strict", "easy", ["hook"]),
  pattern("southern-ending-major", ["bVII", "IV", "I"], [1, 1, 2], 18, MAJOR, ["D"], "colorful", "easy", ["ending"]),
  pattern("southern-ending-minor", ["bVI", "V", "i"], [1, 1, 2], 18, MINOR, ["D"], "strict", "easy", ["ending"]),
];

export const SOUL_ARCHETYPES: SoulArchetypeConfig[] = [
  { id: "motown-pop", weight: 20, bpmRange: { min: 92, max: 132 }, bpmRanges: [{ value: { min: 100, max: 122 }, weight: 78 }, { value: { min: 92, max: 99 }, weight: 10 }, { value: { min: 123, max: 132 }, weight: 12 }], patterns: MOTOWN_PATTERNS },
  { id: "stax-groove", weight: 20, bpmRange: { min: 86, max: 126 }, bpmRanges: [{ value: { min: 98, max: 116 }, weight: 78 }, { value: { min: 86, max: 97 }, weight: 11 }, { value: { min: 117, max: 126 }, weight: 11 }], patterns: STAX_PATTERNS },
  { id: "gospel-soul", weight: 14, bpmRange: { min: 68, max: 116 }, bpmRanges: [{ value: { min: 78, max: 104 }, weight: 80 }, { value: { min: 68, max: 77 }, weight: 10 }, { value: { min: 105, max: 116 }, weight: 10 }], patterns: GOSPEL_PATTERNS },
  { id: "deep-ballad", weight: 14, bpmRange: { min: 56, max: 88 }, bpmRanges: [{ value: { min: 64, max: 80 }, weight: 82 }, { value: { min: 56, max: 63 }, weight: 9 }, { value: { min: 81, max: 88 }, weight: 9 }], patterns: BALLAD_PATTERNS },
  { id: "minor-vamp", weight: 12, bpmRange: { min: 70, max: 124 }, bpmRanges: [{ value: { min: 82, max: 108 }, weight: 80 }, { value: { min: 70, max: 81 }, weight: 10 }, { value: { min: 109, max: 124 }, weight: 10 }], patterns: MINOR_VAMP_PATTERNS },
  { id: "philly-smooth", weight: 10, bpmRange: { min: 72, max: 108 }, bpmRanges: [{ value: { min: 82, max: 102 }, weight: 82 }, { value: { min: 72, max: 81 }, weight: 9 }, { value: { min: 103, max: 108 }, weight: 9 }], patterns: PHILLY_PATTERNS },
  { id: "southern-build", weight: 10, bpmRange: { min: 68, max: 118 }, bpmRanges: [{ value: { min: 78, max: 108 }, weight: 80 }, { value: { min: 68, max: 77 }, weight: 10 }, { value: { min: 109, max: 118 }, weight: 10 }], patterns: SOUTHERN_PATTERNS },
];

export const SOUL_ARCHETYPE_WEIGHTS = SOUL_ARCHETYPES.map(({ id, weight }) => ({ value: id, weight }));

export function soulArchetype(id: string): SoulArchetypeConfig {
  return SOUL_ARCHETYPES.find((item) => item.id === id) ?? SOUL_ARCHETYPES[0];
}

function functionForRoman(roman: string): HarmonicFunction {
  const root = roman.replace(/(?:maj7|maj9|6\/9|add9|7sus4|9sus4|7b9|dim7|7b5|11|13|9|7|6)$/, "");
  if (/^(?:I|i|iii|vi|bIII)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|bVI|#IV)$/.test(root)) return "predominant";
  if (/^(?:V|v)$/.test(root) || roman === "V7/V") return "dominant";
  return "color";
}

function chordVocabulary(): ChordDefinition[] {
  const result: ChordDefinition[] = [];
  const roots: { root: string; modes: Mode[]; pool: HarmonicPool }[] = [
    { root: "I", modes: MAJOR, pool: "core" }, { root: "ii", modes: MAJOR, pool: "core" },
    { root: "iii", modes: MAJOR, pool: "core" }, { root: "IV", modes: MAJOR, pool: "core" },
    { root: "V", modes: ["major", "minor"], pool: "core" }, { root: "vi", modes: MAJOR, pool: "core" },
    { root: "i", modes: MINOR, pool: "core" }, { root: "iv", modes: MINOR, pool: "core" },
    { root: "v", modes: MINOR, pool: "core" }, { root: "bIII", modes: MINOR, pool: "core" },
    { root: "bVI", modes: MINOR, pool: "core" }, { root: "bVII", modes: ["major", "minor"], pool: "nearby" },
    { root: "IV", modes: MINOR, pool: "nearby" }, { root: "iv", modes: MAJOR, pool: "nearby" },
    { root: "bIII", modes: MAJOR, pool: "chromatic-near" }, { root: "#IV", modes: MAJOR, pool: "chromatic-near" },
  ];
  for (const { root, modes, pool } of roots) {
    const fn = functionForRoman(root);
    result.push({ roman: root, harmonicFunction: fn, weight: 16, minimumComplexity: "easy", allowedModes: modes, harmonicPool: pool });
    const lower = /[iv]$/.test(root);
    const mediumSuffixes = lower ? ["7", "9"] : root === "V" ? ["7", "9", "7sus4"] : ["6", "maj7", "add9"];
    for (const suffix of mediumSuffixes) {
      result.push({ roman: `${root}${suffix}`, harmonicFunction: fn, weight: suffix === "7" || suffix === "maj7" ? 10 : 6, minimumComplexity: "medium", allowedModes: modes, harmonicPool: pool });
    }
    const advancedSuffixes = lower ? ["11"] : root === "V" ? ["13", "7b9", "9sus4"] : ["maj9", "6/9"];
    for (const suffix of advancedSuffixes) {
      result.push({ roman: `${root}${suffix}`, harmonicFunction: fn, weight: 4, minimumComplexity: "advanced", allowedModes: modes, harmonicPool: pool });
    }
  }
  result.push(
    { roman: "V7/V", harmonicFunction: "dominant", weight: 4, minimumComplexity: "medium", allowedModes: MAJOR, harmonicPool: "nearby" },
    { roman: "#IVdim7", harmonicFunction: "passing", weight: 3, minimumComplexity: "advanced", allowedModes: MAJOR, harmonicPool: "chromatic-near" },
    { roman: "ii7b5", harmonicFunction: "predominant", weight: 4, minimumComplexity: "advanced", allowedModes: MINOR, harmonicPool: "nearby" },
  );
  return result;
}

const BASE_RULE = {
  bars: [{ value: 4, weight: 3 }, { value: 8, weight: 1 }],
  allowedStartFunctions: [{ value: "tonic" as const, weight: 7 }, { value: "predominant" as const, weight: 3 }],
  allowedEndFunctions: [{ value: "tonic" as const, weight: 5 }, { value: "dominant" as const, weight: 2 }, { value: "predominant" as const, weight: 1 }],
  tension: "medium" as const,
  minimumDistinctFunctions: 1,
  requireLoopability: true,
};

export function resolveSoulStyleProfile(seed: string, requestedArchetypeId?: string): StyleProfile {
  const random = createSeededRandom(deriveSeed(seed, "soul:session-profile"));
  const archetypeId = requestedArchetypeId && SOUL_ARCHETYPES.some(({ id }) => id === requestedArchetypeId)
    ? requestedArchetypeId as SoulArchetypeId
    : weightedChoice(SOUL_ARCHETYPE_WEIGHTS, random);
  const config = soulArchetype(archetypeId);
  return {
    id: "soul",
    name: "Soul",
    generatorKind: "soul",
    archetypeId,
    bpmRange: config.bpmRange,
    bpmRanges: config.bpmRanges,
    allowedMeters: [{ value: "4/4", weight: 98 }, { value: "3/4", weight: 2 }],
    allowedModes: [{ value: "major", weight: 72 }, { value: "minor", weight: 28 }],
    chordVocabulary: chordVocabulary(),
    transitions: {
      tonic: [{ value: "predominant", weight: 5 }, { value: "tonic", weight: 3 }, { value: "dominant", weight: 2 }],
      predominant: [{ value: "tonic", weight: 5 }, { value: "dominant", weight: 4 }, { value: "color", weight: 1 }],
      dominant: [{ value: "tonic", weight: 9 }, { value: "predominant", weight: 1 }],
      color: [{ value: "predominant", weight: 5 }, { value: "tonic", weight: 3 }, { value: "dominant", weight: 2 }],
      passing: [{ value: "dominant", weight: 6 }, { value: "tonic", weight: 4 }],
    },
    harmonicRhythms: [],
    sectionRules: { A: BASE_RULE, B: { ...BASE_RULE, requireLoopability: false } },
    harmonicPoolWeights: {
      strict: { core: 1, nearby: 0, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      colorful: { core: 1, nearby: 0.35, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      adventurous: { core: 1, nearby: 0.5, "chromatic-near": 0.18, "chromatic-medium": 0, "chromatic-far": 0 },
    },
    validationRules: { maximumSameChordInSequence: 8, maximumGenerationAttempts: 8, maximumPassingDurationBars: 0.5, requireDifferentBFromA: true },
  };
}

export const soulStyleDescriptor = {
  id: "soul",
  name: "Soul",
  bpmRange: { min: 56, max: 132 },
} as const;
