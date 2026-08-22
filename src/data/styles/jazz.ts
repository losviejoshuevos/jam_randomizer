import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "@/lib/music/domain/style-profile";
import type {
  Complexity,
  HarmonicFreedom,
  HarmonicFunction,
  Meter,
  Mode,
  SectionLabel,
  WeightedValue,
} from "@/lib/music/domain/types";
import { createSeededRandom, deriveSeed, weightedChoice } from "@/lib/music/random";

export type JazzArchetypeId =
  | "swing-standard"
  | "bebop-cycle"
  | "hard-bop-gospel"
  | "bird-blues"
  | "jazz-ballad"
  | "modal-quartal"
  | "jazz-waltz"
  | "fusion-open";

export type JazzPatternTag =
  | "hook"
  | "release"
  | "bridge"
  | "ending"
  | "modal"
  | "sus"
  | "bebop"
  | "blues"
  | "fusion";

export interface JazzPattern {
  id: string;
  roots: string[];
  functions: HarmonicFunction[];
  durations: number[];
  weight: number;
  modes: Mode[];
  sections: SectionLabel[];
  minimumFreedom: HarmonicFreedom;
  minimumComplexity: Complexity;
  allowedMeters?: Meter[];
  tags?: JazzPatternTag[];
}

export interface JazzArchetypeConfig {
  id: JazzArchetypeId;
  weight: number;
  bpmRange: { min: number; max: number };
  bpmRanges: WeightedValue<{ min: number; max: number }>[];
  patterns: JazzPattern[];
}

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const BOTH: Mode[] = ["major", "minor"];

function pattern(
  id: string,
  roots: string[],
  functions: HarmonicFunction[],
  durations: number[],
  weight: number,
  modes: Mode[],
  sections: SectionLabel[],
  minimumFreedom: HarmonicFreedom = "strict",
  minimumComplexity: Complexity = "easy",
  tags?: JazzPatternTag[],
  allowedMeters?: Meter[],
): JazzPattern {
  return { id, roots, functions, durations, weight, modes, sections, minimumFreedom, minimumComplexity, tags, allowedMeters };
}

const SWING_PATTERNS: JazzPattern[] = [
  pattern("swing-major-turnaround", ["I", "VI", "ii", "V"], ["tonic", "dominant", "predominant", "dominant"], [2, 2, 2, 2], 22, MAJOR, ["A", "B"], "strict", "easy", ["hook"]),
  pattern("swing-a-train", ["I", "II", "ii", "V", "I"], ["tonic", "color", "predominant", "dominant", "tonic"], [2, 2, 1, 1, 2], 18, MAJOR, ["A", "B"], "colorful", "easy", ["hook"]),
  pattern("swing-minor-standard", ["i", "iv", "V", "i"], ["tonic", "predominant", "dominant", "tonic"], [2, 2, 2, 2], 22, MINOR, ["A", "B"], "strict", "easy", ["hook"]),
  pattern("swing-major-bridge", ["IV", "iv", "I", "VI", "ii", "V"], ["predominant", "predominant", "tonic", "dominant", "predominant", "dominant"], [2, 1, 1, 1, 1, 2], 18, MAJOR, ["C"], "colorful", "medium", ["bridge"]),
  pattern("swing-minor-bridge", ["bIII", "VI", "ii", "V", "i"], ["color", "dominant", "predominant", "dominant", "tonic"], [2, 1, 1, 2, 2], 18, MINOR, ["C"], "colorful", "medium", ["bridge"]),
  pattern("swing-ending-major", ["iii", "VI", "ii", "V", "I"], ["tonic", "dominant", "predominant", "dominant", "tonic"], [1, 1, 1, 1, 4], 24, MAJOR, ["D"], "strict", "easy", ["ending"]),
  pattern("swing-ending-minor", ["iv", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 24, MINOR, ["D"], "strict", "easy", ["ending"]),
];

const BEBOP_PATTERNS: JazzPattern[] = [
  pattern("bebop-turnaround", ["I", "VI", "ii", "V"], ["tonic", "dominant", "predominant", "dominant"], [1, 1, 1, 1], 24, MAJOR, ["A", "B"], "strict", "easy", ["hook", "bebop"]),
  pattern("bebop-minor-turnaround", ["i", "VI", "ii", "V"], ["tonic", "dominant", "predominant", "dominant"], [1, 1, 1, 1], 20, MINOR, ["A", "B"], "colorful", "easy", ["hook", "bebop"]),
  pattern("bebop-dominant-cycle", ["III", "VI", "II", "V"], ["dominant", "dominant", "dominant", "dominant"], [1, 1, 1, 1], 17, BOTH, ["B", "C"], "colorful", "medium", ["release", "bebop"]),
  pattern("bebop-chromatic-two-five", ["iii", "VI", "ii", "bII", "I", "VI", "ii", "V"], ["predominant", "dominant", "predominant", "dominant", "tonic", "dominant", "predominant", "dominant"], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 1], 12, MAJOR, ["B", "C"], "adventurous", "advanced", ["bridge", "bebop"], ["4/4"]),
  pattern("bebop-ending-major", ["iii", "VI", "ii", "bII", "I"], ["tonic", "dominant", "predominant", "dominant", "tonic"], [1, 1, 1, 1, 4], 25, MAJOR, ["D"], "adventurous", "medium", ["ending", "bebop"]),
  pattern("bebop-ending-minor", ["ii7b5", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 25, MINOR, ["D"], "colorful", "medium", ["ending", "bebop"]),
];

const HARD_BOP_PATTERNS: JazzPattern[] = [
  pattern("hard-bop-major-riff", ["I", "IV", "I", "bVII"], ["tonic", "predominant", "tonic", "color"], [2, 2, 2, 2], 22, MAJOR, ["A"], "colorful", "easy", ["hook", "blues"]),
  pattern("hard-bop-minor-riff", ["i", "IV"], ["tonic", "color"], [4, 4], 25, MINOR, ["A"], "strict", "easy", ["hook", "modal"]),
  pattern("hard-bop-call-response-major", ["I", "IV", "I", "VI", "ii", "V"], ["tonic", "predominant", "tonic", "dominant", "predominant", "dominant"], [2, 2, 1, 1, 1, 1], 19, MAJOR, ["B", "C"], "strict", "easy", ["release"]),
  pattern("hard-bop-call-response-minor", ["i", "bVII", "bVI", "V", "i"], ["tonic", "color", "predominant", "dominant", "tonic"], [2, 1, 1, 2, 2], 19, MINOR, ["B", "C"], "strict", "easy", ["release"]),
  pattern("hard-bop-backdoor", ["I", "iv", "bVII", "I"], ["tonic", "predominant", "color", "tonic"], [2, 2, 2, 2], 10, MAJOR, ["B", "C"], "colorful", "medium", ["bridge"]),
  pattern("hard-bop-ending-major", ["IV", "iv", "I"], ["predominant", "predominant", "tonic"], [2, 2, 4], 24, MAJOR, ["D"], "colorful", "easy", ["ending"]),
  pattern("hard-bop-ending-minor", ["bVI", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 24, MINOR, ["D"], "strict", "easy", ["ending"]),
];

const BIRD_BLUES_PATTERNS: JazzPattern[] = [
  pattern("bird-major-frame", ["I", "VI", "ii", "V", "IV", "#IV", "I", "V"], ["tonic", "dominant", "predominant", "dominant", "predominant", "passing", "tonic", "dominant"], [1, 1, 1, 1, 1, 1, 1, 1], 22, MAJOR, ["A", "B"], "colorful", "medium", ["hook", "blues"]),
  pattern("bird-major-chromatic", ["I", "VI", "ii", "bII", "I", "IV", "#IVdim7", "I"], ["tonic", "dominant", "predominant", "dominant", "tonic", "predominant", "passing", "tonic"], [1, 1, 1, 1, 1, 1, 1, 1], 12, MAJOR, ["B", "C"], "adventurous", "advanced", ["bridge", "blues"]),
  pattern("bird-minor-frame", ["i", "iv", "i", "VI", "ii7b5", "V", "i"], ["tonic", "predominant", "tonic", "dominant", "predominant", "dominant", "tonic"], [2, 1, 1, 1, 1, 1, 1], 22, MINOR, ["A", "B", "C"], "colorful", "medium", ["hook", "blues"]),
  pattern("bird-halfbar-turn", ["iii", "VI", "ii", "V", "I", "bII", "I", "V"], ["predominant", "dominant", "predominant", "dominant", "tonic", "dominant", "tonic", "dominant"], [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 1], 9, MAJOR, ["C"], "adventurous", "advanced", ["bridge", "blues"], ["4/4"]),
  pattern("bird-ending-major", ["ii", "bII", "I"], ["predominant", "dominant", "tonic"], [2, 2, 4], 25, MAJOR, ["D"], "adventurous", "medium", ["ending", "blues"]),
  pattern("bird-ending-minor", ["ii7b5", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 25, MINOR, ["D"], "colorful", "medium", ["ending", "blues"]),
];

const BALLAD_PATTERNS: JazzPattern[] = [
  pattern("ballad-major-line", ["I", "iii", "iv", "I"], ["tonic", "tonic", "predominant", "tonic"], [2, 2, 2, 2], 20, MAJOR, ["A", "B"], "colorful", "easy", ["hook"]),
  pattern("ballad-minor-line", ["i", "bIII", "ii7b5", "V", "i"], ["tonic", "tonic", "predominant", "dominant", "tonic"], [2, 2, 1, 1, 2], 22, MINOR, ["A", "B"], "strict", "medium", ["hook"]),
  pattern("ballad-major-release", ["IV", "iv", "iii", "VI", "ii", "V"], ["predominant", "predominant", "tonic", "dominant", "predominant", "dominant"], [2, 1, 1, 1, 1, 2], 17, MAJOR, ["B", "C"], "colorful", "medium", ["bridge"]),
  pattern("ballad-minor-release", ["bIII", "bVI", "ii7b5", "V", "i"], ["tonic", "predominant", "predominant", "dominant", "tonic"], [2, 2, 1, 1, 2], 17, MINOR, ["B", "C"], "strict", "medium", ["bridge"]),
  pattern("ballad-dark-cadence", ["ii", "V", "bII", "I"], ["predominant", "dominant", "color", "tonic"], [2, 2, 2, 2], 10, MAJOR, ["C", "D"], "adventurous", "medium", ["ending"]),
  pattern("ballad-ending-minor", ["iv", "V", "bVI", "ii7b5", "V", "i"], ["predominant", "dominant", "color", "predominant", "dominant", "tonic"], [1, 1, 2, 1, 1, 2], 22, MINOR, ["D"], "colorful", "medium", ["ending"]),
];

const MODAL_PATTERNS: JazzPattern[] = [
  pattern("modal-dorian-one", ["i"], ["tonic"], [8], 23, MINOR, ["A"], "strict", "easy", ["hook", "modal"]),
  pattern("modal-dorian-plagal", ["i", "IV"], ["tonic", "color"], [4, 4], 24, MINOR, ["A", "B"], "strict", "easy", ["hook", "modal"]),
  pattern("modal-aeolian-cadence", ["i", "bVI", "bVII", "i"], ["tonic", "color", "color", "tonic"], [4, 1, 1, 2], 16, MINOR, ["B", "C"], "colorful", "easy", ["release", "modal"]),
  pattern("modal-mixolydian", ["I", "bVII", "I"], ["tonic", "color", "tonic"], [4, 2, 2], 21, MAJOR, ["A", "B", "C"], "colorful", "easy", ["hook", "modal", "sus"]),
  pattern("modal-sus-fields", ["I", "bIII", "bII", "I"], ["tonic", "color", "color", "tonic"], [2, 2, 2, 2], 10, BOTH, ["C"], "adventurous", "medium", ["bridge", "modal", "sus"]),
  pattern("modal-ending-major", ["bVII", "I"], ["color", "tonic"], [4, 4], 22, MAJOR, ["D"], "colorful", "easy", ["ending", "modal", "sus"]),
  pattern("modal-ending-minor", ["IV", "i"], ["color", "tonic"], [4, 4], 22, MINOR, ["D"], "strict", "easy", ["ending", "modal"]),
];

const WALTZ_PATTERNS: JazzPattern[] = [
  pattern("waltz-major", ["I", "vi", "ii", "V", "I"], ["tonic", "tonic", "predominant", "dominant", "tonic"], [2, 1, 1, 2, 2], 24, MAJOR, ["A", "B"], "strict", "easy", ["hook"], ["3/4", "4/4"]),
  pattern("waltz-minor", ["i", "iv", "ii7b5", "V", "i"], ["tonic", "predominant", "predominant", "dominant", "tonic"], [2, 2, 1, 1, 2], 24, MINOR, ["A", "B"], "strict", "medium", ["hook"], ["3/4", "4/4"]),
  pattern("waltz-bridge-major", ["IV", "iv", "iii", "VI", "ii", "V"], ["predominant", "predominant", "tonic", "dominant", "predominant", "dominant"], [2, 1, 1, 1, 1, 2], 18, MAJOR, ["C"], "colorful", "medium", ["bridge"], ["3/4", "4/4"]),
  pattern("waltz-bridge-minor", ["bIII", "bVI", "iv", "V", "i"], ["tonic", "color", "predominant", "dominant", "tonic"], [2, 2, 1, 1, 2], 18, MINOR, ["C"], "colorful", "easy", ["bridge"], ["3/4", "4/4"]),
  pattern("waltz-ending-major", ["ii", "V", "I"], ["predominant", "dominant", "tonic"], [2, 2, 4], 25, MAJOR, ["D"], "strict", "easy", ["ending"], ["3/4", "4/4"]),
  pattern("waltz-ending-minor", ["ii7b5", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 25, MINOR, ["D"], "strict", "medium", ["ending"], ["3/4", "4/4"]),
];

const FUSION_PATTERNS: JazzPattern[] = [
  pattern("fusion-dorian", ["i", "IV"], ["tonic", "color"], [4, 4], 26, MINOR, ["A", "B"], "strict", "easy", ["hook", "modal", "fusion"]),
  pattern("fusion-mixolydian", ["I", "bVII"], ["tonic", "color"], [4, 4], 22, MAJOR, ["A", "B"], "colorful", "easy", ["hook", "modal", "sus", "fusion"]),
  pattern("fusion-sus-blocks", ["I", "bIII", "IV", "bII"], ["tonic", "color", "color", "color"], [2, 2, 2, 2], 14, BOTH, ["B", "C"], "adventurous", "medium", ["bridge", "sus", "fusion"]),
  pattern("fusion-functional-release", ["IV", "iii", "VI", "ii", "V", "I"], ["color", "tonic", "dominant", "predominant", "dominant", "tonic"], [2, 1, 1, 1, 1, 2], 12, MAJOR, ["C"], "colorful", "medium", ["release", "fusion"]),
  pattern("fusion-minor-release", ["bVI", "bVII", "i", "IV"], ["color", "color", "tonic", "color"], [2, 2, 2, 2], 15, MINOR, ["C"], "colorful", "easy", ["release", "fusion"]),
  pattern("fusion-ending-major", ["bVII", "I"], ["color", "tonic"], [4, 4], 24, MAJOR, ["D"], "colorful", "easy", ["ending", "sus", "fusion"]),
  pattern("fusion-ending-minor", ["IV", "i"], ["color", "tonic"], [4, 4], 24, MINOR, ["D"], "strict", "easy", ["ending", "fusion"]),
];

export const JAZZ_ARCHETYPES: JazzArchetypeConfig[] = [
  { id: "swing-standard", weight: 18, bpmRange: { min: 108, max: 210 }, bpmRanges: [{ value: { min: 126, max: 180 }, weight: 72 }, { value: { min: 108, max: 125 }, weight: 13 }, { value: { min: 181, max: 210 }, weight: 15 }], patterns: SWING_PATTERNS },
  { id: "bebop-cycle", weight: 14, bpmRange: { min: 150, max: 240 }, bpmRanges: [{ value: { min: 172, max: 220 }, weight: 78 }, { value: { min: 150, max: 171 }, weight: 10 }, { value: { min: 221, max: 240 }, weight: 12 }], patterns: BEBOP_PATTERNS },
  { id: "hard-bop-gospel", weight: 17, bpmRange: { min: 92, max: 176 }, bpmRanges: [{ value: { min: 108, max: 152 }, weight: 76 }, { value: { min: 92, max: 107 }, weight: 12 }, { value: { min: 153, max: 176 }, weight: 12 }], patterns: HARD_BOP_PATTERNS },
  { id: "bird-blues", weight: 10, bpmRange: { min: 132, max: 232 }, bpmRanges: [{ value: { min: 156, max: 208 }, weight: 76 }, { value: { min: 132, max: 155 }, weight: 12 }, { value: { min: 209, max: 232 }, weight: 12 }], patterns: BIRD_BLUES_PATTERNS },
  { id: "jazz-ballad", weight: 12, bpmRange: { min: 48, max: 88 }, bpmRanges: [{ value: { min: 56, max: 76 }, weight: 82 }, { value: { min: 48, max: 55 }, weight: 9 }, { value: { min: 77, max: 88 }, weight: 9 }], patterns: BALLAD_PATTERNS },
  { id: "modal-quartal", weight: 12, bpmRange: { min: 72, max: 188 }, bpmRanges: [{ value: { min: 92, max: 156 }, weight: 75 }, { value: { min: 72, max: 91 }, weight: 12 }, { value: { min: 157, max: 188 }, weight: 13 }], patterns: MODAL_PATTERNS },
  { id: "jazz-waltz", weight: 7, bpmRange: { min: 84, max: 180 }, bpmRanges: [{ value: { min: 104, max: 156 }, weight: 78 }, { value: { min: 84, max: 103 }, weight: 11 }, { value: { min: 157, max: 180 }, weight: 11 }], patterns: WALTZ_PATTERNS },
  { id: "fusion-open", weight: 10, bpmRange: { min: 82, max: 164 }, bpmRanges: [{ value: { min: 96, max: 138 }, weight: 80 }, { value: { min: 82, max: 95 }, weight: 10 }, { value: { min: 139, max: 164 }, weight: 10 }], patterns: FUSION_PATTERNS },
];

export const JAZZ_ARCHETYPE_WEIGHTS = JAZZ_ARCHETYPES.map(({ id, weight }) => ({ value: id, weight }));

export function jazzArchetype(id: string): JazzArchetypeConfig {
  return JAZZ_ARCHETYPES.find((item) => item.id === id) ?? JAZZ_ARCHETYPES[0];
}

function definition(roman: string, harmonicFunction: HarmonicFunction, minimumComplexity: Complexity, allowedModes: Mode[], harmonicPool: HarmonicPool, weight = 8): ChordDefinition {
  return { roman, harmonicFunction, minimumComplexity, allowedModes, harmonicPool, weight };
}

function chordVocabulary(): ChordDefinition[] {
  const result: ChordDefinition[] = [];
  const roots: Array<{ root: string; fn: HarmonicFunction; modes: Mode[]; pool: HarmonicPool }> = [
    { root: "I", fn: "tonic", modes: MAJOR, pool: "core" }, { root: "i", fn: "tonic", modes: MINOR, pool: "core" },
    { root: "ii", fn: "predominant", modes: MAJOR, pool: "core" }, { root: "iii", fn: "tonic", modes: MAJOR, pool: "core" },
    { root: "IV", fn: "predominant", modes: BOTH, pool: "core" }, { root: "iv", fn: "predominant", modes: MINOR, pool: "core" },
    { root: "V", fn: "dominant", modes: BOTH, pool: "core" }, { root: "vi", fn: "tonic", modes: MAJOR, pool: "core" },
    { root: "bIII", fn: "tonic", modes: MINOR, pool: "core" }, { root: "bVI", fn: "predominant", modes: MINOR, pool: "core" },
    { root: "bVII", fn: "color", modes: BOTH, pool: "nearby" }, { root: "iv", fn: "predominant", modes: MAJOR, pool: "nearby" },
    { root: "II", fn: "dominant", modes: BOTH, pool: "nearby" }, { root: "III", fn: "dominant", modes: BOTH, pool: "nearby" },
    { root: "VI", fn: "dominant", modes: BOTH, pool: "nearby" }, { root: "bII", fn: "dominant", modes: BOTH, pool: "chromatic-near" },
    { root: "#IV", fn: "passing", modes: BOTH, pool: "chromatic-near" }, { root: "bIII", fn: "color", modes: MAJOR, pool: "chromatic-medium" },
  ];
  for (const { root, fn, modes, pool } of roots) {
    result.push(definition(root, fn, "easy", modes, pool, 12));
    const lower = /[iv]$/.test(root);
    const medium = fn === "dominant" ? ["7", "9"] : lower ? ["7", "9"] : fn === "tonic" ? ["6", "maj7"] : ["7", "maj7"];
    const advanced = fn === "dominant" ? ["13", "7b9", "7#9", "7alt", "13b9"] : lower ? ["11"] : ["maj9", "6/9", "maj7#11"];
    for (const suffix of medium) result.push(definition(`${root}${suffix}`, fn, "medium", modes, pool, 8));
    for (const suffix of advanced) result.push(definition(`${root}${suffix}`, fn, "advanced", modes, pool, 5));
  }
  result.push(
    definition("ii7b5", "predominant", "medium", MINOR, "core", 10),
    definition("#IVdim7", "passing", "advanced", BOTH, "chromatic-near", 7),
    definition("I7sus4", "tonic", "medium", MAJOR, "nearby", 8),
    definition("I13sus4", "tonic", "advanced", MAJOR, "nearby", 6),
  );
  return result;
}

const BASE_RULE = {
  bars: [{ value: 8, weight: 4 }, { value: 4, weight: 1 }],
  allowedStartFunctions: [{ value: "tonic" as const, weight: 7 }, { value: "predominant" as const, weight: 2 }, { value: "color" as const, weight: 1 }],
  allowedEndFunctions: [{ value: "tonic" as const, weight: 5 }, { value: "dominant" as const, weight: 3 }, { value: "color" as const, weight: 2 }],
  tension: "medium" as const,
  minimumDistinctFunctions: 1,
  requireLoopability: true,
};

export function resolveJazzStyleProfile(seed: string, requestedArchetypeId?: string): StyleProfile {
  const random = createSeededRandom(deriveSeed(seed, "jazz:session-profile"));
  const archetypeId = requestedArchetypeId && JAZZ_ARCHETYPES.some(({ id }) => id === requestedArchetypeId)
    ? requestedArchetypeId as JazzArchetypeId
    : weightedChoice(JAZZ_ARCHETYPE_WEIGHTS, random);
  const config = jazzArchetype(archetypeId);
  return {
    id: "jazz",
    name: "Jazz",
    generatorKind: "jazz",
    archetypeId,
    bpmRange: config.bpmRange,
    bpmRanges: config.bpmRanges,
    allowedMeters: archetypeId === "jazz-waltz" ? [{ value: "3/4", weight: 82 }, { value: "4/4", weight: 18 }] : [{ value: "4/4", weight: 94 }, { value: "3/4", weight: 6 }],
    allowedModes: [{ value: "major", weight: 58 }, { value: "minor", weight: 42 }],
    chordVocabulary: chordVocabulary(),
    transitions: {
      tonic: [{ value: "predominant", weight: 4 }, { value: "dominant", weight: 2 }, { value: "tonic", weight: 2 }, { value: "color", weight: 2 }],
      predominant: [{ value: "dominant", weight: 6 }, { value: "tonic", weight: 2 }, { value: "color", weight: 2 }],
      dominant: [{ value: "tonic", weight: 7 }, { value: "dominant", weight: 2 }, { value: "color", weight: 1 }],
      color: [{ value: "tonic", weight: 4 }, { value: "predominant", weight: 3 }, { value: "dominant", weight: 3 }],
      passing: [{ value: "tonic", weight: 5 }, { value: "predominant", weight: 3 }, { value: "dominant", weight: 2 }],
    },
    harmonicRhythms: [],
    sectionRules: { A: BASE_RULE, B: { ...BASE_RULE, requireLoopability: false } },
    harmonicPoolWeights: {
      strict: { core: 1, nearby: 0, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      colorful: { core: 1, nearby: 0.42, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      adventurous: { core: 1, nearby: 0.62, "chromatic-near": 0.28, "chromatic-medium": 0.12, "chromatic-far": 0 },
    },
    validationRules: { maximumSameChordInSequence: 8, maximumGenerationAttempts: 10, maximumPassingDurationBars: 1, requireDifferentBFromA: true },
  };
}

export const jazzStyleDescriptor = { id: "jazz", name: "Jazz", bpmRange: { min: 48, max: 240 } } as const;
