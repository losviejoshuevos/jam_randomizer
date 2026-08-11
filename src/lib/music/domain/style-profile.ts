import type {
  Complexity,
  HarmonicFreedom,
  HarmonicFunction,
  GeneratorSectionLabel,
  Meter,
  Mode,
  RomanChord,
  WeightedValue,
} from "./types";

export type HarmonicPool =
  | "core"
  | "nearby"
  | "chromatic-near"
  | "chromatic-medium"
  | "chromatic-far";

export interface ChordDefinition {
  roman: RomanChord;
  harmonicFunction: HarmonicFunction;
  weight: number;
  minimumComplexity: Complexity;
  allowedComplexities?: Complexity[];
  allowedModes: Mode[];
  harmonicPool: HarmonicPool;
  tags?: string[];
}

export interface HarmonicFunctionPattern {
  id: string;
  functions: HarmonicFunction[];
  weight: number;
  allowedSections: GeneratorSectionLabel[];
  allowedComplexities: Complexity[];
}

export interface HarmonicChordPattern {
  id: string;
  romanChords: RomanChord[];
  weight: number;
  allowedSections: GeneratorSectionLabel[];
  allowedComplexities: Complexity[];
  allowedModes: Mode[];
}

export interface HarmonicRhythmPattern {
  id: string;
  durationsBars: number[];
  minimumComplexity: Complexity;
  allowedMeters: Meter[];
  allowedSections: GeneratorSectionLabel[];
}

export interface SectionRule {
  bars: WeightedValue<number>[];
  allowedStartFunctions: WeightedValue<HarmonicFunction>[];
  allowedEndFunctions: WeightedValue<HarmonicFunction>[];
  tension: "low" | "medium" | "high";
  minimumDistinctFunctions: number;
  requireLoopability: boolean;
}

export type HarmonicPoolWeights = Record<HarmonicPool, number>;

export interface ValidationRules {
  maximumSameChordInSequence: number;
  maximumGenerationAttempts: number;
  maximumPassingDurationBars: number;
  requireDifferentBFromA: boolean;
}

export interface StyleProfile {
  id: string;
  name: string;
  bpmRange: {
    min: number;
    max: number;
  };
  allowedMeters: WeightedValue<Meter>[];
  allowedModes: WeightedValue<Mode>[];
  chordVocabulary: ChordDefinition[];
  transitions: Record<
    HarmonicFunction,
    WeightedValue<HarmonicFunction>[]
  >;
  harmonicFunctionPatterns?: HarmonicFunctionPattern[];
  harmonicChordPatterns?: HarmonicChordPattern[];
  genericHarmonyWeight?: number;
  maximumGeneratedNonCoreChords?: number;
  harmonicRhythms: WeightedValue<HarmonicRhythmPattern>[];
  sectionRules: Record<GeneratorSectionLabel, SectionRule>;
  harmonicPoolWeights: Record<HarmonicFreedom, HarmonicPoolWeights>;
  validationRules: ValidationRules;
}
