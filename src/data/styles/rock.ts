import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "@/lib/music/domain/style-profile";
import type {
  HarmonicFreedom,
  HarmonicFunction,
  Mode,
  SectionLabel,
  WeightedValue,
} from "@/lib/music/domain/types";
import { createSeededRandom, deriveSeed, weightedChoice } from "@/lib/music/random";

export type RockArchetypeId =
  | "classic-modal"
  | "blues-rock"
  | "minor-rock"
  | "hard-rock"
  | "heavy"
  | "alternative"
  | "rock-ballad";

export type RockChordTreatment = "power" | "triads" | "mixed";

export interface RockPattern {
  id: string;
  roots: string[];
  weight: number;
  modes: Mode[];
  sections: SectionLabel[];
  minimumFreedom: HarmonicFreedom;
  tags?: ("pedal" | "blues" | "modal" | "functional" | "peak")[];
}

export interface RockArchetypeConfig {
  id: RockArchetypeId;
  weight: number;
  bpmRange: { min: number; max: number };
  bpmRanges: WeightedValue<{ min: number; max: number }>[];
  modeWeights: WeightedValue<Mode>[];
  treatmentWeights: WeightedValue<RockChordTreatment>[];
  patterns: RockPattern[];
  activeRhythmChance: Partial<Record<SectionLabel, number>>;
  colorChance: number;
}

const ALL_SECTIONS: SectionLabel[] = ["A", "B", "C", "D"];

function p(
  id: string,
  roots: string[],
  weight: number,
  modes: Mode[],
  sections: SectionLabel[] = ALL_SECTIONS,
  minimumFreedom: HarmonicFreedom = "strict",
  tags?: RockPattern["tags"],
): RockPattern {
  return { id, roots, weight, modes, sections, minimumFreedom, tags };
}

const CLASSIC_PATTERNS = [
  p("classic-tonic", ["I"], 4, ["major"], ["A", "C"], "strict", ["pedal"]),
  p("classic-14", ["I", "IV"], 8, ["major"], ["A", "C"], "strict", ["modal"]),
  p("classic-1b7", ["I", "bVII"], 7, ["major"], ["A", "C"], "strict", ["modal"]),
  p("classic-1b7-4", ["I", "bVII", "IV"], 13, ["major"], ALL_SECTIONS, "strict", ["modal"]),
  p("classic-14b7", ["I", "IV", "bVII"], 10, ["major"], ["B", "D"], "strict", ["modal"]),
  p("classic-1b34", ["I", "bIII", "IV"], 10, ["major"], ALL_SECTIONS, "strict", ["modal"]),
  p("classic-1b34b7", ["I", "bIII", "IV", "bVII"], 9, ["major"], ["B", "D"], "strict", ["modal", "peak"]),
  p("classic-15b74", ["I", "V", "bVII", "IV"], 10, ["major"], ["B", "D"], "strict", ["modal", "peak"]),
  p("classic-1451", ["I", "IV", "V", "I"], 8, ["major"], ["B", "D"], "strict", ["functional", "peak"]),
];

const BLUES_PATTERNS = [
  p("blues-tonic", ["I"], 7, ["major", "minor"], ["A", "C"], "strict", ["pedal", "blues"]),
  p("blues-1b3", ["I", "bIII"], 8, ["major", "minor"], ["A", "C"], "strict", ["blues"]),
  p("blues-1b34", ["I", "bIII", "IV"], 15, ["major", "minor"], ALL_SECTIONS, "strict", ["blues"]),
  p("blues-14b3", ["I", "IV", "bIII"], 9, ["major", "minor"], ["B", "D"], "strict", ["blues"]),
  p("blues-1b34b7", ["I", "bIII", "IV", "bVII"], 12, ["major", "minor"], ["B", "D"], "strict", ["blues", "peak"]),
  p("blues-141", ["I", "IV", "I"], 11, ["major", "minor"], ALL_SECTIONS, "strict", ["blues"]),
  p("blues-flat5", ["I", "bV", "IV", "I"], 2, ["major", "minor"], ["B", "D"], "adventurous", ["blues"]),
];

const MINOR_PATTERNS = [
  p("minor-tonic", ["i"], 5, ["minor"], ["A", "C"], "strict", ["pedal"]),
  p("minor-1-6", ["i", "bVI"], 7, ["minor"], ["A", "C"], "strict"),
  p("minor-1-7", ["i", "bVII"], 7, ["minor"], ["A", "C"], "strict"),
  p("minor-167", ["i", "bVI", "bVII"], 13, ["minor"], ALL_SECTIONS, "strict"),
  p("minor-176", ["i", "bVII", "bVI"], 12, ["minor"], ALL_SECTIONS, "strict"),
  p("minor-137", ["i", "bIII", "bVII"], 9, ["minor"], ALL_SECTIONS, "strict"),
  p("minor-1637", ["i", "bVI", "bIII", "bVII"], 12, ["minor"], ["B", "D"], "strict", ["peak"]),
  p("minor-1467", ["i", "iv", "bVI", "bVII"], 11, ["minor"], ["B", "D"], "strict", ["peak"]),
  p("minor-174", ["i", "bVII", "iv"], 8, ["minor"], ALL_SECTIONS, "strict"),
  p("minor-dorian", ["i", "IV"], 3, ["minor"], ["A", "C"], "colorful", ["modal"]),
];

const HARD_PATTERNS = [
  ...CLASSIC_PATTERNS.filter(({ roots }) => roots.length <= 3),
  ...MINOR_PATTERNS.filter(({ roots }) => roots.length <= 3),
  p("hard-1b3b74", ["I", "bIII", "bVII", "IV"], 11, ["major", "minor"], ["B", "D"], "strict", ["modal", "peak"]),
  p("hard-1b745", ["I", "bVII", "IV", "V"], 10, ["major", "minor"], ["B", "D"], "strict", ["peak"]),
];

const HEAVY_PATTERNS = [
  p("heavy-pedal", ["i"], 16, ["minor"], ["A", "C"], "strict", ["pedal"]),
  p("heavy-17", ["i", "bVII"], 13, ["minor"], ALL_SECTIONS, "strict"),
  p("heavy-16", ["i", "bVI"], 12, ["minor"], ALL_SECTIONS, "strict"),
  p("heavy-167", ["i", "bVI", "bVII"], 9, ["minor"], ["B", "D"], "strict", ["peak"]),
  p("heavy-176", ["i", "bVII", "bVI"], 8, ["minor"], ["B", "D"], "strict", ["peak"]),
  p("heavy-phrygian", ["i", "bII"], 3, ["minor"], ALL_SECTIONS, "colorful", ["modal"]),
  p("heavy-tritone", ["i", "bV", "iv", "i"], 1.5, ["minor"], ["B", "D"], "adventurous", ["blues"]),
];

const ALTERNATIVE_PATTERNS = [
  p("alt-pedal", ["I"], 4, ["major", "minor"], ["A", "C"], "strict", ["pedal"]),
  p("alt-1b7", ["I", "bVII"], 8, ["major", "minor"], ["A", "C"], "strict", ["modal"]),
  p("alt-1b3", ["I", "bIII"], 8, ["major", "minor"], ["A", "C"], "strict", ["modal"]),
  p("alt-b614", ["bVI", "I", "IV"], 8, ["major", "minor"], ALL_SECTIONS, "strict", ["modal"]),
  p("alt-1b3b74", ["I", "bIII", "bVII", "IV"], 13, ["major", "minor"], ALL_SECTIONS, "strict", ["modal"]),
  p("alt-b7-4-1-b3", ["bVII", "IV", "I", "bIII"], 10, ["major", "minor"], ["B", "D"], "strict", ["modal", "peak"]),
  p("alt-minor-6-1-7-4", ["bVI", "i", "bVII", "iv"], 9, ["minor"], ["B", "D"], "strict", ["modal"]),
];

const BALLAD_PATTERNS = [
  p("ballad-major-tonic", ["I"], 4, ["major"], ["A", "C"], "strict", ["pedal", "functional"]),
  p("ballad-major-14", ["I", "IV"], 7, ["major"], ["A", "C"], "strict", ["functional"]),
  p("ballad-major-1564", ["I", "V", "vi", "IV"], 13, ["major"], ["B", "D"], "strict", ["functional", "peak"]),
  p("ballad-major-1451", ["I", "IV", "V", "I"], 12, ["major"], ["B", "D"], "strict", ["functional", "peak"]),
  p("ballad-major-1645", ["I", "vi", "IV", "V"], 10, ["major"], ["B", "D"], "strict", ["functional", "peak"]),
  p("ballad-major-6415", ["vi", "IV", "I", "V"], 9, ["major"], ["B", "D"], "strict", ["functional"]),
  p("ballad-major-modal", ["I", "bVII", "IV"], 3, ["major"], ["A", "B"], "colorful", ["modal"]),
  p("ballad-minor-tonic", ["i"], 4, ["minor"], ["A", "C"], "strict", ["pedal", "functional"]),
  p("ballad-minor-14", ["i", "iv"], 7, ["minor"], ["A", "C"], "strict", ["functional"]),
  p("ballad-minor-1637", ["i", "bVI", "bIII", "bVII"], 13, ["minor"], ["B", "D"], "strict", ["functional"]),
  p("ballad-minor-176", ["i", "bVII", "bVI"], 10, ["minor"], ALL_SECTIONS, "strict", ["functional"]),
  p("ballad-minor-1465", ["i", "iv", "bVI", "V"], 12, ["minor"], ["B", "D"], "strict", ["functional", "peak"]),
  p("ballad-minor-1645", ["i", "bVI", "iv", "V"], 11, ["minor"], ["B", "D"], "strict", ["functional", "peak"]),
];

export const ROCK_ARCHETYPES: RockArchetypeConfig[] = [
  {
    id: "classic-modal", weight: 20, bpmRange: { min: 80, max: 150 },
    bpmRanges: [{ value: { min: 90, max: 140 }, weight: 88 }, { value: { min: 80, max: 89 }, weight: 6 }, { value: { min: 141, max: 150 }, weight: 6 }],
    modeWeights: [{ value: "major", weight: 75 }, { value: "minor", weight: 25 }],
    treatmentWeights: [{ value: "triads", weight: 45 }, { value: "power", weight: 40 }, { value: "mixed", weight: 15 }],
    patterns: CLASSIC_PATTERNS, activeRhythmChance: { A: .08, B: .2, C: .05, D: .24 }, colorChance: .08,
  },
  {
    id: "blues-rock", weight: 15, bpmRange: { min: 70, max: 145 },
    bpmRanges: [{ value: { min: 80, max: 135 }, weight: 88 }, { value: { min: 70, max: 79 }, weight: 6 }, { value: { min: 136, max: 145 }, weight: 6 }],
    modeWeights: [{ value: "major", weight: 58 }, { value: "minor", weight: 42 }],
    treatmentWeights: [{ value: "triads", weight: 40 }, { value: "power", weight: 42 }, { value: "mixed", weight: 18 }],
    patterns: BLUES_PATTERNS, activeRhythmChance: { A: .08, B: .22, C: .06, D: .25 }, colorChance: .22,
  },
  {
    id: "minor-rock", weight: 16, bpmRange: { min: 70, max: 150 },
    bpmRanges: [{ value: { min: 80, max: 140 }, weight: 88 }, { value: { min: 70, max: 79 }, weight: 6 }, { value: { min: 141, max: 150 }, weight: 6 }],
    modeWeights: [{ value: "major", weight: 10 }, { value: "minor", weight: 90 }],
    treatmentWeights: [{ value: "triads", weight: 34 }, { value: "power", weight: 52 }, { value: "mixed", weight: 14 }],
    patterns: MINOR_PATTERNS, activeRhythmChance: { A: .08, B: .2, C: .04, D: .22 }, colorChance: .06,
  },
  {
    id: "hard-rock", weight: 14, bpmRange: { min: 90, max: 170 },
    bpmRanges: [{ value: { min: 100, max: 160 }, weight: 88 }, { value: { min: 90, max: 99 }, weight: 5 }, { value: { min: 161, max: 170 }, weight: 7 }],
    modeWeights: [{ value: "major", weight: 46 }, { value: "minor", weight: 54 }],
    treatmentWeights: [{ value: "triads", weight: 17 }, { value: "power", weight: 72 }, { value: "mixed", weight: 11 }],
    patterns: HARD_PATTERNS, activeRhythmChance: { A: .15, B: .32, C: .08, D: .36 }, colorChance: .03,
  },
  {
    id: "heavy", weight: 12, bpmRange: { min: 60, max: 165 },
    bpmRanges: [{ value: { min: 70, max: 150 }, weight: 90 }, { value: { min: 60, max: 69 }, weight: 5 }, { value: { min: 151, max: 165 }, weight: 5 }],
    modeWeights: [{ value: "major", weight: 6 }, { value: "minor", weight: 94 }],
    treatmentWeights: [{ value: "triads", weight: 7 }, { value: "power", weight: 86 }, { value: "mixed", weight: 7 }],
    patterns: HEAVY_PATTERNS, activeRhythmChance: { A: .03, B: .12, C: .02, D: .16 }, colorChance: .01,
  },
  {
    id: "alternative", weight: 11, bpmRange: { min: 75, max: 180 },
    bpmRanges: [{ value: { min: 85, max: 150 }, weight: 82 }, { value: { min: 75, max: 84 }, weight: 7 }, { value: { min: 151, max: 170 }, weight: 9 }, { value: { min: 171, max: 180 }, weight: 2 }],
    modeWeights: [{ value: "major", weight: 42 }, { value: "minor", weight: 58 }],
    treatmentWeights: [{ value: "triads", weight: 13 }, { value: "power", weight: 76 }, { value: "mixed", weight: 11 }],
    patterns: ALTERNATIVE_PATTERNS, activeRhythmChance: { A: .15, B: .3, C: .08, D: .32 }, colorChance: .04,
  },
  {
    id: "rock-ballad", weight: 12, bpmRange: { min: 60, max: 105 },
    bpmRanges: [{ value: { min: 68, max: 90 }, weight: 82 }, { value: { min: 60, max: 67 }, weight: 9 }, { value: { min: 91, max: 105 }, weight: 9 }],
    modeWeights: [{ value: "major", weight: 55 }, { value: "minor", weight: 45 }],
    treatmentWeights: [{ value: "triads", weight: 65 }, { value: "power", weight: 20 }, { value: "mixed", weight: 15 }],
    patterns: BALLAD_PATTERNS, activeRhythmChance: { A: .02, B: .15, C: .02, D: .2 }, colorChance: .32,
  },
];

export const ROCK_ARCHETYPE_WEIGHTS = ROCK_ARCHETYPES.map(({ id, weight }) => ({
  value: id,
  weight,
}));

export function rockArchetype(id: string): RockArchetypeConfig {
  return ROCK_ARCHETYPES.find((item) => item.id === id) ?? ROCK_ARCHETYPES[0];
}

export function resolveRockMode(seed: string, archetypeId: string): Mode {
  const config = rockArchetype(archetypeId);
  const random = createSeededRandom(deriveSeed(seed, "rock:recommended-mode"));
  return weightedChoice(config.modeWeights, random);
}

function functionForRoman(roman: string): HarmonicFunction {
  const root = roman.replace(/(?:maj7|m7|add9|sus2|sus4|7|5)$/, "");
  if (/^(?:I|i|vi|bIII)$/.test(root)) return "tonic";
  if (/^(?:IV|iv|ii|bVI)$/.test(root)) return "predominant";
  if (/^(?:V|v|VII)$/.test(root)) return "dominant";
  return "color";
}

function chordVocabulary(): ChordDefinition[] {
  const rootsByMode: Record<Mode, string[]> = {
    major: ["I", "ii", "bIII", "IV", "V", "vi", "bVI", "bVII", "iv", "bII", "bV"],
    minor: ["i", "bIII", "iv", "v", "V", "bVI", "bVII", "IV", "bII", "bV"],
  };
  const result: ChordDefinition[] = [];
  for (const [mode, roots] of Object.entries(rootsByMode) as [Mode, string[]][]) {
    for (const root of roots) {
      const special = root === "bII" || root === "bV" || (mode === "minor" && root === "IV");
      const modal = root === "bIII" || root === "bVI" || root === "bVII" || root === "iv";
      const harmonicPool: HarmonicPool = special ? "chromatic-near" : modal ? "nearby" : "core";
      const fn = functionForRoman(root);
      result.push({ roman: root, harmonicFunction: fn, weight: 10, minimumComplexity: "easy", allowedComplexities: ["easy", "medium", "advanced"], allowedModes: [mode], harmonicPool });
      const powerRoot = root.replace(/[iv]+$/i, (degree) => degree.toUpperCase());
      result.push({ roman: `${powerRoot}5`, harmonicFunction: fn, weight: 14, minimumComplexity: "easy", allowedComplexities: ["easy", "medium", "advanced"], allowedModes: [mode], harmonicPool, tags: ["power"] });
      for (const suffix of ["sus2", "sus4", "add9"]) {
        result.push({ roman: `${powerRoot}${suffix}`, harmonicFunction: fn, weight: 2, minimumComplexity: "medium", allowedComplexities: ["medium", "advanced"], allowedModes: [mode], harmonicPool });
      }
      const seventh = root === root.toLowerCase() ? "7" : fn === "dominant" ? "7" : "maj7";
      result.push({ roman: `${root}${seventh}`, harmonicFunction: fn, weight: 1, minimumComplexity: "advanced", allowedComplexities: ["advanced"], allowedModes: [mode], harmonicPool });
    }
  }
  return result;
}

const BASE_SECTION_RULE = {
  bars: [{ value: 4, weight: 1 }],
  allowedStartFunctions: [{ value: "tonic" as const, weight: 8 }, { value: "color" as const, weight: 2 }],
  allowedEndFunctions: [{ value: "tonic" as const, weight: 6 }, { value: "dominant" as const, weight: 3 }, { value: "predominant" as const, weight: 1 }],
  tension: "medium" as const,
  minimumDistinctFunctions: 1,
  requireLoopability: true,
};

export function resolveRockStyleProfile(
  seed: string,
  requestedArchetypeId?: string,
  requestedTreatment?: RockChordTreatment,
): StyleProfile {
  const random = createSeededRandom(deriveSeed(seed, "rock:session-profile"));
  const archetypeId = requestedArchetypeId && ROCK_ARCHETYPES.some(({ id }) => id === requestedArchetypeId)
    ? requestedArchetypeId as RockArchetypeId
    : weightedChoice(ROCK_ARCHETYPE_WEIGHTS, random);
  const config = rockArchetype(archetypeId);
  const chordTreatment = requestedTreatment ?? weightedChoice(config.treatmentWeights, random);
  return {
    id: "rock",
    name: "Rock",
    generatorKind: "rock",
    archetypeId,
    chordTreatment,
    bpmRange: config.bpmRange,
    bpmRanges: config.bpmRanges,
    allowedMeters: [{ value: "4/4", weight: 9 }, { value: "3/4", weight: archetypeId === "rock-ballad" ? 2 : 1 }],
    allowedModes: config.modeWeights,
    chordVocabulary: chordVocabulary(),
    transitions: {
      tonic: [{ value: "tonic", weight: 3 }, { value: "predominant", weight: 5 }, { value: "color", weight: 5 }, { value: "dominant", weight: 3 }],
      predominant: [{ value: "tonic", weight: 4 }, { value: "dominant", weight: 5 }, { value: "color", weight: 2 }],
      dominant: [{ value: "tonic", weight: 8 }, { value: "color", weight: 2 }],
      color: [{ value: "tonic", weight: 6 }, { value: "predominant", weight: 3 }, { value: "color", weight: 1 }],
      passing: [{ value: "tonic", weight: 5 }, { value: "dominant", weight: 3 }],
    },
    harmonicRhythms: [],
    sectionRules: { A: BASE_SECTION_RULE, B: { ...BASE_SECTION_RULE, requireLoopability: false } },
    harmonicPoolWeights: {
      strict: { core: 1, nearby: .25, "chromatic-near": 0, "chromatic-medium": 0, "chromatic-far": 0 },
      colorful: { core: 1, nearby: .45, "chromatic-near": .12, "chromatic-medium": 0, "chromatic-far": 0 },
      adventurous: { core: 1, nearby: .55, "chromatic-near": .25, "chromatic-medium": .04, "chromatic-far": 0 },
    },
    validationRules: { maximumSameChordInSequence: 8, maximumGenerationAttempts: 12, maximumPassingDurationBars: .5, requireDifferentBFromA: true },
  };
}

export const rockStyleDescriptor = { id: "rock", name: "Rock", bpmRange: { min: 60, max: 180 } } as const;
