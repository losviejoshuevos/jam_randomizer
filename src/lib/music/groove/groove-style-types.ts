import type {
  Complexity,
  HarmonicFreedom,
  HarmonicFunction,
  Meter,
  Mode,
  SectionLabel,
  WeightedValue,
} from "../domain/types";

export interface GroovePattern {
  id: string;
  roots: string[];
  functions: HarmonicFunction[];
  durations: number[];
  weight: number;
  modes: Mode[];
  sections: SectionLabel[];
  minimumFreedom: HarmonicFreedom;
  minimumComplexity?: Complexity;
  allowedMeters?: Meter[];
  tags?: string[];
}

export interface GrooveArchetype {
  id: string;
  weight: number;
  bpmRange: { min: number; max: number };
  bpmRanges: WeightedValue<{ min: number; max: number }>[];
  patterns: GroovePattern[];
}

export type GrooveChordCategory =
  | "tonic-major"
  | "tonic-minor"
  | "dominant"
  | "major"
  | "minor"
  | "suspended";

export type GrooveColorPalette = Record<
  Exclude<Complexity, "easy">,
  Record<GrooveChordCategory, WeightedValue<string>[]>
>;

export interface GrooveStyleConfig {
  styleId: string;
  defaultArchetypeId: string;
  archetype: (id: string) => GrooveArchetype;
  palette: GrooveColorPalette;
}
