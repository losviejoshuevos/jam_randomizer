import type {
  Complexity,
  HarmonicFreedom,
  HarmonicFunction,
  Meter,
  Mode,
  RomanChord,
  SectionLabel,
  WeightedValue,
} from "./types";

export type TonalSource =
  | { kind: "diatonic" }
  | { kind: "parallel-mode" }
  | { kind: "neighboring-key"; circleOfFifthsOffset: -1 | 1 };

export interface ChordDefinition {
  roman: RomanChord;
  harmonicFunction: HarmonicFunction;
  weight: number;
  minimumComplexity: Complexity;
  allowedComplexities?: Complexity[];
  allowedModes: Mode[];
  tonalSource: TonalSource;
  tags?: string[];
}

export interface HarmonicFunctionPattern {
  id: string;
  functions: HarmonicFunction[];
  weight: number;
  allowedSections: SectionLabel[];
  allowedComplexities: Complexity[];
}

export interface HarmonicChordPattern {
  id: string;
  romanChords: RomanChord[];
  weight: number;
  allowedSections: SectionLabel[];
  allowedComplexities: Complexity[];
  allowedModes: Mode[];
}

export interface HarmonicRhythmPattern {
  id: string;
  durationsBars: number[];
  minimumComplexity: Complexity;
  allowedMeters: Meter[];
  allowedSections: SectionLabel[];
}

export interface SectionRule {
  bars: WeightedValue<number>[];
  allowedStartFunctions: WeightedValue<HarmonicFunction>[];
  allowedEndFunctions: WeightedValue<HarmonicFunction>[];
  tension: "low" | "medium" | "high";
  minimumDistinctFunctions: number;
  requireLoopability: boolean;
}

export interface TonalSourceWeights {
  diatonic: number;
  parallelMode: number;
  neighboringKey: number;
}

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
  harmonicRhythms: WeightedValue<HarmonicRhythmPattern>[];
  sectionRules: Record<SectionLabel, SectionRule>;
  tonalSourceWeights: Record<HarmonicFreedom, TonalSourceWeights>;
  validationRules: ValidationRules;
}
